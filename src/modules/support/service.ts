import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, inArray, lte } from "drizzle-orm";
import { db } from "../../db/client";
import { products } from "../catalog/schema";
import { quotationRequestLines, quotationRequests, supportActivityEvents, supportConversations, supportMessages } from "./schema";
import { canStaffReplyToConversation, SupportConversationStatusSchema, type QuoteRequestInput } from "./validation";

function retentionDays() {
  const value = Number(process.env.SUPPORT_RETENTION_DAYS);
  return Number.isInteger(value) && value >= 30 && value <= 730 ? value : 180;
}
const retainUntil = (now: Date) => new Date(now.getTime() + retentionDays() * 24 * 60 * 60 * 1000);

export async function createQuoteRequest(input: QuoteRequestInput, channel: "WEB" | "CHAT" = "WEB") {
  const phone = input.phone.trim().replace(/[\s().-]/g, "");
  return db.transaction(async (tx) => {
    if (input.requestId) {
      const [existing] = await tx.select({ id: quotationRequests.id, reference: quotationRequests.reference })
        .from(quotationRequests).where(eq(quotationRequests.clientRequestId, input.requestId)).limit(1);
      if (existing) return { ...existing, duplicate: true };
    }

    const productIds = [...new Set(input.items.flatMap((item) => item.productId ? [item.productId] : []))];
    const productRows = productIds.length
      ? await tx.select({ id: products.id, sku: products.sku, name: products.nameEn })
        .from(products).where(and(inArray(products.id, productIds), eq(products.isPublished, true)))
      : [];
    const catalog = new Map(productRows.map((product) => [product.id, product]));
    const reference = `QT-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${randomBytes(6).toString("hex").toUpperCase()}`;
    const [request] = await tx.insert(quotationRequests).values({
      reference,
      clientRequestId: input.requestId ?? null,
      customerName: input.customerName.trim(),
      phone,
      email: input.email?.trim() || null,
      customerType: input.customerType,
      deliveryDistrict: input.deliveryDistrict.trim() || null,
      deliveryAddress: input.deliveryAddress.trim() || null,
      notes: input.notes.trim() || null,
      channel,
    }).onConflictDoNothing({ target: quotationRequests.clientRequestId })
      .returning({ id: quotationRequests.id, reference: quotationRequests.reference });
    if (!request && input.requestId) {
      const [existing] = await tx.select({ id: quotationRequests.id, reference: quotationRequests.reference })
        .from(quotationRequests).where(eq(quotationRequests.clientRequestId, input.requestId)).limit(1);
      if (existing) return { ...existing, duplicate: true };
    }
    if (!request) throw new Error("Quotation request could not be saved.");

    await tx.insert(quotationRequestLines).values(input.items.map((item) => {
      const product = item.productId ? catalog.get(item.productId) : undefined;
      return {
        requestId: request.id,
        productId: product?.id ?? null,
        productName: product?.name ?? item.productName.trim(),
        sku: product?.sku ?? null,
        quantity: item.quantity,
      };
    }));
    await tx.insert(supportActivityEvents).values({
      actorType: "CUSTOMER",
      action: "QUOTE_REQUEST_CREATED",
      quotationRequestId: request.id,
      details: { channel, itemCount: input.items.length },
    });
    return { ...request, duplicate: false };
  });
}

export type PublicMessageInput = { requestId: string; user: string; assistant?: string; language: "en" | "ne" | "hi"; handoff?: boolean };
export type SupportMessage = { role: "user" | "assistant"; content: string };
export type SupportAIUsage = {
  provider: string;
  model: string;
  fallbackUsed: boolean;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsdMicros: number | null;
};

export async function createOrResumeWebConversation(token: string, language: "en" | "ne" | "hi") {
  const now = new Date();
  const sessionHash = createHash("sha256").update(token).digest("hex");
  return db.transaction(async (tx) => {
    const existing = await tx.select().from(supportConversations)
      .where(eq(supportConversations.sessionHash, sessionHash)).limit(1);
    let conversation: typeof supportConversations.$inferSelect | undefined = existing[0];
    if (conversation && conversation.retentionExpiresAt <= now) {
      await tx.update(supportConversations).set({ sessionHash: null }).where(eq(supportConversations.id, conversation.id));
      conversation = undefined;
    }
    if (conversation) {
      await tx.update(supportConversations).set({ language, updatedAt: now }).where(eq(supportConversations.id, conversation.id));
      return { id: conversation.id, token, created: false };
    }

    const [created] = await tx.insert(supportConversations).values({
      sessionHash,
      channel: "WEB",
      language,
      retentionExpiresAt: retainUntil(now),
    }).onConflictDoNothing().returning({ id: supportConversations.id });
    if (created) return { id: created.id, token, created: true };

    const [raced] = await tx.select({ id: supportConversations.id }).from(supportConversations)
      .where(and(eq(supportConversations.sessionHash, sessionHash), gt(supportConversations.retentionExpiresAt, now))).limit(1);
    if (!raced) throw new Error("Support session could not be created.");
    return { id: raced.id, token, created: false };
  });
}

export async function savePublicUserMessage(conversationId: string, requestId: string, content: string, language: "en" | "ne" | "hi") {
  const now = new Date();
  await db.transaction(async (tx) => {
    const [current] = await tx.select({ status: supportConversations.status }).from(supportConversations)
      .where(eq(supportConversations.id, conversationId)).limit(1);
    await tx.insert(supportMessages).values({ conversationId, clientMessageId: requestId, role: "USER", content, language })
      .onConflictDoNothing();
    await tx.update(supportConversations).set({
      language,
      status: current?.status === "NEEDS_HUMAN" ? "NEEDS_HUMAN" : "OPEN",
      handoffReason: current?.status === "NEEDS_HUMAN" ? undefined : null,
      lastMessageAt: now,
      updatedAt: now,
      retentionExpiresAt: retainUntil(now),
    }).where(eq(supportConversations.id, conversationId));
  });
}

export async function saveAssistantMessage(conversationId: string, requestId: string, content: string, language: "en" | "ne" | "hi", handoff: boolean, sources: string[] = [], usage?: SupportAIUsage) {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(supportMessages).values({
      conversationId,
      clientMessageId: `reply:${requestId}`,
      role: "ASSISTANT",
      content,
      language,
      metadata: { handoff, sources: sources.slice(0, 3), ...(usage ? { usage } : {}) },
    }).onConflictDoNothing();
    await tx.update(supportConversations).set({
      ...(handoff ? { status: "NEEDS_HUMAN", handoffReason: "The assistant requested staff help." } : {}),
      lastMessageAt: now,
      updatedAt: now,
      retentionExpiresAt: retainUntil(now),
    }).where(eq(supportConversations.id, conversationId));
  });
}

export async function saveLocalConversationTurn(conversationId: string, input: PublicMessageInput) {
  const now = new Date();
  await db.transaction(async (tx) => {
    const [current] = await tx.select({ status: supportConversations.status }).from(supportConversations)
      .where(eq(supportConversations.id, conversationId)).limit(1);
    await tx.insert(supportMessages).values({ conversationId, clientMessageId: input.requestId, role: "USER", content: input.user, language: input.language })
      .onConflictDoNothing();
    if (input.assistant?.trim()) {
      await tx.insert(supportMessages).values({
        conversationId,
        clientMessageId: `reply:${input.requestId}`,
        role: "ASSISTANT",
        content: input.assistant.trim(),
        language: input.language,
        metadata: { localResponse: true, handoff: input.handoff ?? false },
      }).onConflictDoNothing();
    }
    await tx.update(supportConversations).set({
      language: input.language,
      status: input.handoff || current?.status === "NEEDS_HUMAN" ? "NEEDS_HUMAN" : "OPEN",
      handoffReason: input.handoff ? "The customer requested staff support." : current?.status === "NEEDS_HUMAN" ? undefined : null,
      lastMessageAt: now,
      updatedAt: now,
      retentionExpiresAt: retainUntil(now),
    }).where(eq(supportConversations.id, conversationId));
  });
}

export async function saveStaffSupportReply(conversationId: string, requestId: string, actorEmail: string, content: string) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const [current] = await tx.select({ status: supportConversations.status, language: supportConversations.language, retentionExpiresAt: supportConversations.retentionExpiresAt })
      .from(supportConversations).where(eq(supportConversations.id, conversationId)).for("update").limit(1);
    if (!current) return { status: "not_found" as const };
    const currentStatus = SupportConversationStatusSchema.safeParse(current.status);
    if (!currentStatus.success || !canStaffReplyToConversation(currentStatus.data)) return { status: "closed" as const };
    if (current.retentionExpiresAt <= now) return { status: "expired" as const };

    const [message] = await tx.insert(supportMessages).values({
      conversationId,
      clientMessageId: `staff:${requestId}`,
      role: "STAFF",
      content: content.trim(),
      language: current.language,
      metadata: {},
    }).onConflictDoNothing().returning({
      id: supportMessages.id,
      role: supportMessages.role,
      content: supportMessages.content,
      language: supportMessages.language,
      createdAt: supportMessages.createdAt,
    });
    if (!message) return { status: "duplicate" as const };

    await tx.update(supportConversations).set({
      status: "OPEN",
      handoffReason: null,
      lastMessageAt: now,
      updatedAt: now,
      retentionExpiresAt: retainUntil(now),
    }).where(eq(supportConversations.id, conversationId));
    await tx.insert(supportActivityEvents).values({
      actorType: "STAFF",
      actorEmail,
      action: "SUPPORT_STAFF_REPLIED",
      conversationId,
      details: { messageId: message.id },
    });
    return { status: "saved" as const, message, lastMessageAt: now };
  });
}

export async function getWebConversationHistory(token: string, limit = 50) {
  const sessionHash = createHash("sha256").update(token).digest("hex");
  const now = new Date();
  const [conversation] = await db.select({
    id: supportConversations.id,
    status: supportConversations.status,
    retentionExpiresAt: supportConversations.retentionExpiresAt,
  }).from(supportConversations)
    .where(and(eq(supportConversations.sessionHash, sessionHash), eq(supportConversations.channel, "WEB"))).limit(1);
  if (!conversation || conversation.retentionExpiresAt <= now) return { status: "OPEN", messages: [] as const };

  const messages = await db.select({
    id: supportMessages.id,
    role: supportMessages.role,
    content: supportMessages.content,
    language: supportMessages.language,
    createdAt: supportMessages.createdAt,
  }).from(supportMessages)
    .where(eq(supportMessages.conversationId, conversation.id))
    .orderBy(desc(supportMessages.sequence)).limit(Math.max(1, Math.min(100, limit)));
  return {
    status: conversation.status,
    messages: messages.reverse().filter((message) => message.role !== "SYSTEM"),
  };
}

export async function markConversationNeedsHuman(conversationId: string, reason: string) {
  const now = new Date();
  await db.update(supportConversations).set({ status: "NEEDS_HUMAN", handoffReason: reason.slice(0, 200), updatedAt: now })
    .where(eq(supportConversations.id, conversationId));
}

export async function deleteExpiredSupportConversations(now = new Date()) {
  const deleted = await db.delete(supportConversations)
    .where(and(inArray(supportConversations.status, ["RESOLVED", "CLOSED"]), lte(supportConversations.retentionExpiresAt, now)))
    .returning({ id: supportConversations.id });
  return deleted.length;
}

export async function getRecentConversationMessages(conversationId: string, limit = 8): Promise<SupportMessage[]> {
  const rows = await db.select({ role: supportMessages.role, content: supportMessages.content })
    .from(supportMessages).where(eq(supportMessages.conversationId, conversationId))
    .orderBy(desc(supportMessages.sequence)).limit(Math.max(1, Math.min(12, limit)));
  return rows.reverse().flatMap((row) => row.role === "USER" || row.role === "ASSISTANT"
    ? [{ role: row.role === "USER" ? "user" as const : "assistant" as const, content: row.content }]
    : []);
}

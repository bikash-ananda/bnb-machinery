import { desc, eq, gt, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminApi } from "@/lib/server/admin-api";
import { db } from "@/src/db/client";
import { supportActivityEvents, supportConversations, supportMessages } from "@/src/modules/support/schema";
import { saveStaffSupportReply } from "@/src/modules/support/service";
import { canTransitionConversationStatus, SupportConversationStatusSchema } from "@/src/modules/support/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await adminApi(request, "support");
  if ("error" in access) return access.error;
  try {
    const now = new Date();
    const conversations = await db.select({
      id: supportConversations.id,
      channel: supportConversations.channel,
      language: supportConversations.language,
      status: supportConversations.status,
      assignedTo: supportConversations.assignedTo,
      handoffReason: supportConversations.handoffReason,
      lastMessageAt: supportConversations.lastMessageAt,
      createdAt: supportConversations.createdAt,
    }).from(supportConversations)
      .where(gt(supportConversations.retentionExpiresAt, now))
      .orderBy(desc(supportConversations.lastMessageAt)).limit(100);
    const ids = conversations.map((conversation) => conversation.id);
    const recent = ids.length ? await db.select({
      id: supportMessages.id,
      conversationId: supportMessages.conversationId,
      role: supportMessages.role,
      content: supportMessages.content,
      language: supportMessages.language,
      createdAt: supportMessages.createdAt,
      sequence: supportMessages.sequence,
    }).from(supportMessages).where(inArray(supportMessages.conversationId, ids))
      .orderBy(desc(supportMessages.sequence)).limit(3000) : [];
    const messagesByConversation = new Map<string, typeof recent>();
    for (const message of recent) {
      const existing = messagesByConversation.get(message.conversationId) ?? [];
      if (existing.length < 30) messagesByConversation.set(message.conversationId, [...existing, message]);
    }
    return NextResponse.json({ conversations: conversations.map((conversation) => ({
      ...conversation,
      messages: (messagesByConversation.get(conversation.id) ?? []).reverse(),
    })) });
  } catch {
    return NextResponse.json({ error: "support_service_unavailable" }, { status: 503 });
  }
}

const ReplySchema = z.object({
  id: z.string().uuid(),
  requestId: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
}).strict();

export async function POST(request: Request) {
  const access = await adminApi(request, "support");
  if ("error" in access) return access.error;
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 3000) return NextResponse.json({ error: "request_too_large" }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = ReplySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  try {
    const result = await saveStaffSupportReply(parsed.data.id, parsed.data.requestId, access.session.email, parsed.data.content);
    if (result.status === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (result.status === "closed") return NextResponse.json({ error: "conversation_closed" }, { status: 409 });
    if (result.status === "expired") return NextResponse.json({ error: "conversation_expired" }, { status: 410 });
    if (result.status === "duplicate") return NextResponse.json({ duplicate: true });
    return NextResponse.json({ message: result.message, lastMessageAt: result.lastMessageAt });
  } catch {
    return NextResponse.json({ error: "support_service_unavailable" }, { status: 503 });
  }
}

const UpdateSchema = z.object({
  id: z.string().uuid(),
  status: SupportConversationStatusSchema,
  assignToMe: z.boolean().optional().default(false),
}).strict();

export async function PATCH(request: Request) {
  const access = await adminApi(request, "support");
  if ("error" in access) return access.error;
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 2000) return NextResponse.json({ error: "request_too_large" }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  try {
    const result = await db.transaction(async (tx) => {
      const [current] = await tx.select({ status: supportConversations.status, assignedTo: supportConversations.assignedTo })
        .from(supportConversations).where(eq(supportConversations.id, parsed.data.id)).limit(1);
      if (!current) return "not_found" as const;
      const from = SupportConversationStatusSchema.safeParse(current.status);
      if (!from.success || !canTransitionConversationStatus(from.data, parsed.data.status) || (from.data === "CLOSED" && parsed.data.assignToMe)) return "invalid_transition" as const;
      const now = new Date();
      const assignment = parsed.data.assignToMe ? access.session.email : current.assignedTo;
      if (from.data === parsed.data.status && assignment === current.assignedTo) return "unchanged" as const;
      await tx.update(supportConversations).set({
        status: parsed.data.status,
        assignedTo: assignment,
        handoffReason: parsed.data.status === "NEEDS_HUMAN" ? undefined : null,
        updatedAt: now,
      }).where(eq(supportConversations.id, parsed.data.id));
      await tx.insert(supportActivityEvents).values({
        actorType: "STAFF",
        actorEmail: access.session.email,
        action: "SUPPORT_CONVERSATION_UPDATED",
        conversationId: parsed.data.id,
        details: { from: from.data, to: parsed.data.status, assignedTo: assignment },
      });
      return "updated" as const;
    });
    if (result === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (result === "invalid_transition") return NextResponse.json({ error: "invalid_transition" }, { status: 409 });
    return NextResponse.json({ updated: result === "updated" });
  } catch {
    return NextResponse.json({ error: "support_service_unavailable" }, { status: 503 });
  }
}

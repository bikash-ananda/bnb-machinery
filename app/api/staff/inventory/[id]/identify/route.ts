import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getStaffSession, isAllowedOrigin } from "@/lib/server/auth";
import { getInventoryProduct } from "@/lib/server/inventory";
import { downloadPrivateImage } from "@/lib/server/media-storage";
import { db } from "@/src/db/client";
import { inventoryWorkflowAuditEvents, inventoryWorkflowProductImages, inventoryWorkflowProducts } from "@/src/modules/local-workflow/schema";

export const runtime = "nodejs";
export const maxDuration = 45;
type Context = { params: Promise<{ id: string }> };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type ResponseContent = { type?: string; text?: string };
type ResponsesApiResult = { output?: { type?: string; content?: ResponseContent[] }[] };

function parseSuggestions(text: string) {
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Invalid AI response.");
  const data = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  const safeString = (key: string, max: number) => typeof data[key] === "string" ? (data[key] as string).trim().slice(0, max) || null : null;
  const strings = (key: string, count: number, length: number) => Array.isArray(data[key]) ? (data[key] as unknown[]).filter((x): x is string => typeof x === "string").map(x => x.trim().slice(0, length)).filter(Boolean).slice(0, count) : [];
  const specifications = Array.isArray(data.specifications) ? data.specifications.slice(0, 30).flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    return typeof row.name === "string" && typeof row.value === "string" ? [{ name: row.name.trim().slice(0, 80), value: row.value.trim().slice(0, 160) }] : [];
  }) : [];
  return {
    nameEn: safeString("nameEn", 160), category: safeString("category", 100), brand: safeString("brand", 100),
    model: safeString("model", 120), partNumber: safeString("partNumber", 120),
    shortDescriptionEn: safeString("shortDescriptionEn", 500), descriptionEn: safeString("descriptionEn", 2000),
    specifications, applications: strings("applications", 15, 120),
  };
}
async function markFailed(id: string, email: string) {
  await db.update(inventoryWorkflowProducts).set({ aiStatus: "FAILED", verificationStatus: "STAFF_REVIEW", updatedAt: new Date() })
    .where(and(eq(inventoryWorkflowProducts.id, id), eq(inventoryWorkflowProducts.createdBy, email), eq(inventoryWorkflowProducts.verificationStatus, "AI_IDENTIFICATION_PENDING")));
  await db.insert(inventoryWorkflowAuditEvents).values({ productId: id, actorEmail: email, action: "AI_IDENTIFICATION_FAILED", fromStatus: "AI_IDENTIFICATION_PENDING", toStatus: "STAFF_REVIEW" });
}
export async function POST(request: Request, context: Context) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
  let session;
  try { session = await getStaffSession(); } catch { return NextResponse.json({ error: "Authentication could not be checked. Please try again." }, { status: 503 }); }
  if (!session) return NextResponse.json({ error: "Sign in to identify this item." }, { status: 401 });
  if (session.role !== "INVENTORY_EDITOR") return NextResponse.json({ error: "Only inventory staff can prepare stock drafts." }, { status: 403 });
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Stock item not found." }, { status: 404 });
  const apiKey = process.env.OPENAI_API_KEY?.trim(), model = process.env.OPENAI_MODEL?.trim();
  const product = await getInventoryProduct(id).catch(() => null);
  const primary = product?.images?.[0];
  if (!product || product.created_by !== session.email || !primary) return NextResponse.json({ error: "Stock item not found." }, { status: 404 });
  if (product.ai_status !== "NOT_REQUESTED") return NextResponse.json({ error: "AI identification has already been attempted for this draft. Continue manual review." }, { status: 409 });
  if (!apiKey || !model) {
    await db.update(inventoryWorkflowProducts).set({ aiStatus: "UNAVAILABLE", updatedAt: new Date() })
      .where(and(eq(inventoryWorkflowProducts.id, id), eq(inventoryWorkflowProducts.createdBy, session.email), eq(inventoryWorkflowProducts.verificationStatus, "DRAFT"), eq(inventoryWorkflowProducts.aiStatus, "NOT_REQUESTED")));
    return NextResponse.json({ status: "unavailable" });
  }
  try {
    const started = await db.transaction(async tx => {
      const rows = await tx.update(inventoryWorkflowProducts).set({ aiStatus: "PENDING", verificationStatus: "AI_IDENTIFICATION_PENDING", updatedAt: new Date() })
        .where(and(eq(inventoryWorkflowProducts.id, id), eq(inventoryWorkflowProducts.createdBy, session.email), eq(inventoryWorkflowProducts.publicationStatus, "PRIVATE"), eq(inventoryWorkflowProducts.verificationStatus, "DRAFT"), eq(inventoryWorkflowProducts.aiStatus, "NOT_REQUESTED"))).returning({ id: inventoryWorkflowProducts.id });
      if (!rows.length) return false;
      await tx.insert(inventoryWorkflowAuditEvents).values({ productId: id, actorEmail: session.email, action: "AI_IDENTIFICATION_STARTED", fromStatus: "DRAFT", toStatus: "AI_IDENTIFICATION_PENDING" });
      return true;
    });
    if (!started) return NextResponse.json({ error: "This draft is no longer waiting for AI identification." }, { status: 409 });
    const [image] = await db.select().from(inventoryWorkflowProductImages).where(and(eq(inventoryWorkflowProductImages.id, primary.id), eq(inventoryWorkflowProductImages.productId, id))).limit(1);
    if (!image) throw new Error("Product image not found.");
    const stored = await downloadPrivateImage(image.storagePath);
    const dataUrl = "data:" + image.mimeType + ";base64," + stored.bytes.toString("base64");
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", headers: { authorization: "Bearer " + apiKey, "content-type": "application/json" },
      body: JSON.stringify({ model, store: false, input: [{ role: "user", content: [
        { type: "input_text", text: "Inspect this machinery or machinery-parts photo. Return only a JSON object with keys nameEn, category, brand, model, partNumber, shortDescriptionEn, descriptionEn, specifications, applications. Use null for every string you cannot read or identify reliably and [] for unknown arrays. Do not infer brand, model, part number, material, dimensions, capacity, compatibility, price, quantity, certifications, or other specifications. Describe only visible facts. This is an unverified suggestion for staff review, never a confirmed identification." },
        { type: "input_image", image_url: dataUrl, detail: "high" },
      ] }] }),
      cache: "no-store", signal: AbortSignal.timeout(35_000),
    });
    if (!response.ok) { await markFailed(id, session.email); return NextResponse.json({ error: "AI identification is temporarily unavailable. You can continue reviewing the draft manually." }, { status: 503 }); }
    const data = await response.json() as ResponsesApiResult;
    const output = data.output?.flatMap(item => item.content ?? []).find(item => item.type === "output_text")?.text ?? "";
    if (!output) throw new Error("No AI suggestion returned.");
    const suggestions = parseSuggestions(output);
    const [saved] = await db.update(inventoryWorkflowProducts).set({
      aiSuggestions: { fields: suggestions, label: "AI Suggested", model, generated_at: new Date().toISOString() },
      aiStatus: "READY", verificationStatus: "STAFF_REVIEW", updatedAt: new Date(),
    }).where(and(eq(inventoryWorkflowProducts.id, id), eq(inventoryWorkflowProducts.createdBy, session.email), eq(inventoryWorkflowProducts.verificationStatus, "AI_IDENTIFICATION_PENDING"), eq(inventoryWorkflowProducts.aiStatus, "PENDING"))).returning({ id: inventoryWorkflowProducts.id });
    if (!saved) return NextResponse.json({ error: "This draft can no longer be updated." }, { status: 409 });
    await db.insert(inventoryWorkflowAuditEvents).values({ productId: id, actorEmail: session.email, action: "AI_DRAFT_GENERATED", fromStatus: "AI_IDENTIFICATION_PENDING", toStatus: "STAFF_REVIEW" });
    return NextResponse.json({ status: "ready", requestId: randomUUID() });
  } catch {
    await markFailed(id, session.email).catch(() => undefined);
    return NextResponse.json({ error: "AI identification is temporarily unavailable. You can continue reviewing the draft manually." }, { status: 503 });
  }
}
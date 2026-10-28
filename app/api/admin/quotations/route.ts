import { desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminApi } from "@/lib/server/admin-api";
import { db } from "@/src/db/client";
import { quotationRequestLines, quotationRequests, supportActivityEvents } from "@/src/modules/support/schema";
import { canTransitionQuoteStatus, QuoteStatusSchema } from "@/src/modules/support/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await adminApi(request, "quotations");
  if ("error" in access) return access.error;
  try {
    const requests = await db.select().from(quotationRequests).orderBy(desc(quotationRequests.createdAt)).limit(100);
    const ids = requests.map((item) => item.id);
    const lines = ids.length ? await db.select().from(quotationRequestLines).where(
      // Requests are already capped to the latest 100.
      inArray(quotationRequestLines.requestId, ids),
    ) : [];
    const byRequest = new Map<string, typeof lines>();
    for (const line of lines) byRequest.set(line.requestId, [...(byRequest.get(line.requestId) ?? []), line]);
    return NextResponse.json({ requests: requests.map((item) => ({ ...item, lines: byRequest.get(item.id) ?? [] })) });
  } catch {
    return NextResponse.json({ error: "quotation_service_unavailable" }, { status: 503 });
  }
}

const UpdateSchema = z.object({ id: z.string().uuid(), status: QuoteStatusSchema }).strict();

export async function PATCH(request: Request) {
  const access = await adminApi(request, "quotations");
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
      const [current] = await tx.select({ status: quotationRequests.status }).from(quotationRequests)
        .where(eq(quotationRequests.id, parsed.data.id)).limit(1);
      if (!current) return "not_found" as const;
      const from = QuoteStatusSchema.safeParse(current.status);
      if (!from.success || !canTransitionQuoteStatus(from.data, parsed.data.status)) return "invalid_transition" as const;
      if (from.data === parsed.data.status) return "unchanged" as const;
      const now = new Date();
      await tx.update(quotationRequests).set({ status: parsed.data.status, updatedAt: now })
        .where(eq(quotationRequests.id, parsed.data.id));
      await tx.insert(supportActivityEvents).values({
        actorType: "STAFF",
        actorEmail: access.session.email,
        action: "QUOTE_STATUS_CHANGED",
        quotationRequestId: parsed.data.id,
        details: { from: from.data, to: parsed.data.status },
      });
      return "updated" as const;
    });
    if (result === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (result === "invalid_transition") return NextResponse.json({ error: "invalid_transition" }, { status: 409 });
    return NextResponse.json({ updated: result === "updated" });
  } catch {
    return NextResponse.json({ error: "quotation_service_unavailable" }, { status: 503 });
  }
}

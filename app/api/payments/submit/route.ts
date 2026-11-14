import { NextResponse } from "next/server";
import { isAllowedOrigin } from "@/lib/server/auth";
import { rateLimited } from "@/lib/server/ai";
import { PaymentError, submitPayment } from "@/src/modules/payments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/** Customer says "I paid, my reference is X". Records a PENDING claim only; staff verify it before any money is booked. */
export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return fail("Request blocked.", 403);
  if (rateLimited(request, "pay-submit", 6)) return fail("Too many attempts. Please wait a minute.", 429);
  if (!process.env.DATABASE_URL) return fail("Payment service is temporarily unavailable.", 503);

  let b: Record<string, unknown>;
  try { b = (await request.json()) as Record<string, unknown>; } catch { return fail("Invalid request."); }
  if (!b || typeof b !== "object" || Array.isArray(b)) return fail("Invalid request.");

  try {
    const r = await submitPayment({ orderNo: b.orderNo, phone: b.phone, txnId: b.txnId, accountId: b.accountId, method: b.method });
    return NextResponse.json({ ok: true, id: r.id, status: r.status });
  } catch (e) {
    if (e instanceof PaymentError) return fail(e.message, 400);
    console.error("payment submit failed", e);
    return fail("We could not save your payment reference. Please contact the shop.", 503);
  }
}

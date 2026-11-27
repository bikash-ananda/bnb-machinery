import { NextResponse } from "next/server";
import { adminApi, fail, UUID } from "@/lib/server/admin-api";
import { logAudit } from "@/lib/server/admin-auth";
import { rupeesToPaisa } from "@/src/modules/payments/rules";
import { PaymentError, rejectSubmission, verifySubmission } from "@/src/modules/payments/service";

export const runtime = "nodejs";
// Cashiers can see the queue (billing module) but cannot verify or reject.
const VERIFIERS: string[] = ["SUPER_ADMIN", "BUSINESS_OWNER", "MANAGER", "ACCOUNTANT"];

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await adminApi(request, "billing");
  if ("error" in g) return g.error;
  if (!VERIFIERS.includes(g.session.role)) return fail("Not allowed.", 403);
  const { id } = await ctx.params;
  if (!UUID.test(id)) return fail("Invalid submission.");
  let b: { action?: unknown; amount?: unknown; reason?: unknown };
  try { b = await request.json(); } catch { return fail("Invalid request."); }
  if (!b || typeof b !== "object") return fail("Invalid request.");

  try {
    if (b.action === "verify") {
      const paisa = rupeesToPaisa(b.amount);
      const r = await verifySubmission(id, paisa, g.session.email);
      await logAudit(g.session, "payment.verify", "payment_submission", id, { orderId: r.orderId, amountPaisa: paisa.toString(), paymentStatus: r.paymentStatus }, request);
      return NextResponse.json({ ok: true, paymentStatus: r.paymentStatus, dueAfterPaisa: r.dueAfterPaisa.toString() });
    }
    if (b.action === "reject") {
      const r = await rejectSubmission(id, b.reason, g.session.email);
      await logAudit(g.session, "payment.reject", "payment_submission", id, { orderId: r.orderId, reason: String(b.reason).slice(0, 200) }, request);
      return NextResponse.json({ ok: true });
    }
    return fail("Unknown action.");
  } catch (e) {
    if (e instanceof PaymentError) return fail(e.message, 400);
    console.error("payment review failed", e);
    return fail("Could not complete that action.", 503);
  }
}

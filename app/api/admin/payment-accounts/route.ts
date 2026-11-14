import { NextResponse } from "next/server";
import { adminApi, fail } from "@/lib/server/admin-api";
import { logAudit } from "@/lib/server/admin-auth";
import { PaymentError, createAccount, updateAccount, type AccountInput } from "@/src/modules/payments/service";

export const runtime = "nodejs";
const MANAGERS: string[] = ["SUPER_ADMIN", "BUSINESS_OWNER", "MANAGER"];

/** Only the listed fields are accepted (no mass assignment). The QR image is never written to the audit log. */
function pick(b: Record<string, unknown>): AccountInput {
  const qr = b.qr === null ? null : b.qr && typeof b.qr === "object" && !Array.isArray(b.qr) ? (b.qr as { mime?: unknown; data?: unknown }) : undefined;
  return { label: b.label, method: b.method, payeeName: b.payeeName, accountNo: b.accountNo, instructions: b.instructions, sortOrder: b.sortOrder, active: b.active, qr };
}
const changed = (i: AccountInput) => Object.keys(i).filter((k) => (i as Record<string, unknown>)[k] !== undefined);

async function handle(request: Request, create: boolean) {
  const g = await adminApi(request, "billing");
  if ("error" in g) return g.error;
  if (!MANAGERS.includes(g.session.role)) return fail("Not allowed.", 403);
  let b: Record<string, unknown>;
  try { b = (await request.json()) as Record<string, unknown>; } catch { return fail("Invalid request."); }
  if (!b || typeof b !== "object" || Array.isArray(b)) return fail("Invalid request.");
  const input = pick(b);
  try {
    if (create) {
      const id = await createAccount(input, g.session.email);
      await logAudit(g.session, "payment_account.create", "payment_account", id, { fields: changed(input), hasQr: !!input.qr }, request);
      return NextResponse.json({ ok: true, id });
    }
    if (typeof b.id !== "string") return fail("Invalid request.");
    await updateAccount(b.id, input, g.session.email);
    await logAudit(g.session, "payment_account.update", "payment_account", b.id, { fields: changed(input), qr: input.qr === null ? "removed" : input.qr ? "replaced" : "unchanged" }, request);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PaymentError) return fail(e.message, 400);
    console.error("payment account save failed", e);
    return fail("Could not save the payment account.", 503);
  }
}

export const POST = (request: Request) => handle(request, true);
export const PATCH = (request: Request) => handle(request, false);

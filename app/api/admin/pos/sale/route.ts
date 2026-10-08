import { adminApi } from "@/lib/server/admin-api";
import { logAudit } from "@/lib/server/admin-auth";
import { jsonSafe } from "@/src/lib/json";
import { InsufficientStockError } from "@/src/modules/inventory/service";
import { OrderError } from "@/src/modules/sales/orders";
import { completePosSale, type PosPayment } from "@/src/modules/sales/pos";

export const runtime = "nodejs";
const METHODS = ["CASH", "QR", "ESEWA", "KHALTI", "CARD", "BANK"];
const MANAGERS = ["SUPER_ADMIN", "BUSINESS_OWNER", "MANAGER", "SALES_MANAGER"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bad = (m: string) => jsonSafe({ error: m }, 400);

export async function POST(request: Request) {
  const g = await adminApi(request, "pos");
  if ("error" in g) return g.error;
  let b: Record<string, unknown>;
  try { b = (await request.json()) as Record<string, unknown>; } catch { return bad("Invalid request."); }
  const manager = MANAGERS.includes(g.session.role);

  if (!Array.isArray(b.items) || b.items.length === 0 || b.items.length > 100) return bad("Add at least one item.");
  const items = [];
  for (const raw of b.items) {
    const x = raw as Record<string, unknown>;
    const qty = Number(x.qty);
    const pct = x.discountPct === undefined ? 0 : Number(x.discountPct);
    if (typeof x.productId !== "string" || !UUID.test(x.productId) || !(qty > 0) || qty > 9999) return bad("Invalid item.");
    if (!(pct >= 0 && pct <= 100)) return bad("Invalid discount.");
    if (pct > 5 && !manager) return bad("Discounts above 5% need a manager.");
    let unitPaisa: bigint | undefined;
    if (x.unitPaisa !== undefined) {
      if (!manager) return bad("Only a manager can change a price.");
      if (typeof x.unitPaisa !== "string" || !/^\d{1,12}$/.test(x.unitPaisa)) return bad("Invalid price.");
      unitPaisa = BigInt(x.unitPaisa);
    }
    items.push({ productId: x.productId, qty, discountBp: Math.round(pct * 100), unitPaisa });
  }

  const payments: PosPayment[] = [];
  if (b.payments !== undefined) {
    if (!Array.isArray(b.payments) || b.payments.length > 6) return bad("Invalid payment.");
    for (const raw of b.payments) {
      const x = raw as Record<string, unknown>;
      const method = String(x.method ?? "").toUpperCase();
      if (!METHODS.includes(method)) return bad("Invalid payment method.");
      if (x.amountPaisa !== "ALL" && !(typeof x.amountPaisa === "string" && /^\d{1,12}$/.test(x.amountPaisa))) return bad("Invalid payment amount.");
      payments.push({ method: method as PosPayment["method"], amountPaisa: x.amountPaisa === "ALL" ? "ALL" : BigInt(x.amountPaisa as string), reference: str(x.reference, 80) || undefined });
    }
  }
  const c = (b.customer ?? {}) as Record<string, unknown>;

  try {
    const r = await completePosSale({
      customer: { name: str(c.name, 120), phone: str(c.phone, 20), panNo: str(c.panNo, 20) },
      items, payments, onCredit: b.onCredit === true, note: str(b.note, 300), createdBy: g.session.email,
    });
    await logAudit(g.session, "pos.sale", "invoice", r.invoiceId, { invoiceNo: r.invoiceNo, total: r.totalPaisa.toString() }, request);
    return jsonSafe(r);
  } catch (e) {
    if (e instanceof InsufficientStockError) return jsonSafe({ error: e.message }, 409);
    if (e instanceof OrderError) return bad(e.message);
    console.error("pos sale failed", e);
    return jsonSafe({ error: "Could not complete the sale. Nothing was saved." }, 500);
  }
}

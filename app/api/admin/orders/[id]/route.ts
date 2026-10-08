import { and, eq, inArray, sql } from "drizzle-orm";
import { adminApi } from "@/lib/server/admin-api";
import { logAudit } from "@/lib/server/admin-auth";
import { db } from "@/src/db/client";
import { jsonSafe } from "@/src/lib/json";
import { InsufficientStockError } from "@/src/modules/inventory/service";
import { OrderError, cancelOrder, confirmOrder, recordPayment } from "@/src/modules/sales/orders";
import { orders, payments } from "@/src/modules/sales/schema";

export const runtime = "nodejs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FROM: Record<string, string[]> = { DISPATCHED: ["CONFIRMED"], READY_FOR_PICKUP: ["CONFIRMED"], COMPLETED: ["CONFIRMED", "DISPATCHED", "READY_FOR_PICKUP"] };
const METHODS = ["CASH", "QR", "ESEWA", "KHALTI", "CARD", "BANK"];

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await adminApi(request, "orders");
  if ("error" in g) return g.error;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return jsonSafe({ error: "Invalid order." }, 400);
  let b: { action?: unknown; status?: unknown; method?: unknown };
  try { b = await request.json(); } catch { return jsonSafe({ error: "Invalid request." }, 400); }
  const who = g.session.email;
  try {
    if (b.action === "confirm") {
      const inv = await confirmOrder(id, who);
      await logAudit(g.session, "order.confirm", "order", id, { invoiceNo: inv.invoiceNo }, request);
      return jsonSafe({ ok: true, invoiceId: inv.id, invoiceNo: inv.invoiceNo });
    }
    if (b.action === "cancel") {
      await cancelOrder(id);
      await logAudit(g.session, "order.cancel", "order", id, null, request);
      return jsonSafe({ ok: true });
    }
    if (b.action === "status" && typeof b.status === "string" && FROM[b.status]) {
      const done = await db.update(orders).set({ status: b.status }).where(and(eq(orders.id, id), inArray(orders.status, FROM[b.status]))).returning({ id: orders.id });
      if (done.length === 0) return jsonSafe({ error: "That change is not allowed from the current status." }, 409);
      await logAudit(g.session, "order.status", "order", id, { status: b.status }, request);
      return jsonSafe({ ok: true });
    }
    if (b.action === "pay") {
      const method = String(b.method ?? "").toUpperCase();
      if (!METHODS.includes(method)) return jsonSafe({ error: "Invalid payment method." }, 400);
      const [o] = await db.select({ total: orders.totalPaisa }).from(orders).where(eq(orders.id, id));
      if (!o) return jsonSafe({ error: "Order not found." }, 404);
      const [p] = await db.select({ s: sql<string>`coalesce(sum(${payments.amountPaisa}), 0)` }).from(payments).where(eq(payments.orderId, id));
      const due = o.total - BigInt(p.s);
      if (due <= 0n) return jsonSafe({ error: "This order is already fully paid." }, 409);
      const status = await recordPayment(id, method, due, undefined, who);
      await logAudit(g.session, "order.payment", "order", id, { method, amount: due.toString() }, request);
      return jsonSafe({ ok: true, paymentStatus: status });
    }
    return jsonSafe({ error: "Unknown action." }, 400);
  } catch (e) {
    if (e instanceof InsufficientStockError) return jsonSafe({ error: e.message }, 409);
    if (e instanceof OrderError) return jsonSafe({ error: e.message }, 400);
    console.error("order action failed", e);
    return jsonSafe({ error: "Could not complete that action." }, 500);
  }
}

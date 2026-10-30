import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { adminApi, fail, UUID } from "@/lib/server/admin-api";
import { logAudit } from "@/lib/server/admin-auth";
import { db } from "@/src/db/client";
import { orders } from "@/src/modules/sales/schema";
import { canTransitionOrderStatus } from "@/src/modules/sales/order-status";

export const runtime = "nodejs";
const STATUSES = ["CONFIRMED", "DISPATCHED", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED"] as const;

export async function PATCH(request: Request) {
  const g = await adminApi(request, "orders");
  if ("error" in g) return g.error;
  let body: { id?: unknown; status?: unknown };
  try { body = await request.json(); } catch { return fail("Invalid request."); }
  if (typeof body.id !== "string" || !UUID.test(body.id) || typeof body.status !== "string" || !STATUSES.includes(body.status as typeof STATUSES[number])) return fail("Invalid request.");
  try {
    const changed = await db.transaction(async tx => {
      const [current] = await tx.select({ status: orders.status }).from(orders).where(eq(orders.id, body.id as string)).limit(1);
      if (!current) return "missing";
      if (!canTransitionOrderStatus(current.status, body.status as string)) return "invalid";
      const rows = await tx.update(orders).set({ status: body.status as string })
        .where(and(eq(orders.id, body.id as string), eq(orders.status, current.status))).returning({ id: orders.id });
      return rows.length ? "updated" : "conflict";
    });
    if (changed === "missing") return fail("Order not found.", 404);
    if (changed !== "updated") return fail(changed === "invalid" ? "That change is not allowed from the current status." : "That order changed. Refresh and try again.", 409);
    await logAudit(g.session, "order.status", "order", body.id, { status: body.status }, request);
    return NextResponse.json({ ok: true });
  } catch { return fail("Could not update the order.", 503); }
}
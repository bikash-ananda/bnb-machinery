import { NextResponse } from "next/server";
import { adminApi, fail, UUID } from "@/lib/server/admin-api";
import { logAudit } from "@/lib/server/admin-auth";
import { dbRequest } from "@/lib/server/supabase";
import { canTransitionOrderStatus } from "@/src/modules/sales/order-status";

export const runtime = "nodejs";
const STATUSES = ["CONFIRMED", "DISPATCHED", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED"];

export async function PATCH(request: Request) {
  const g = await adminApi(request, "orders");
  if ("error" in g) return g.error;
  let b: { id?: unknown; status?: unknown };
  try { b = await request.json(); } catch { return fail("Invalid request."); }
  if (typeof b.id !== "string" || !UUID.test(b.id) || typeof b.status !== "string" || !STATUSES.includes(b.status)) return fail("Invalid request.");
  try {
    const currentRows = await dbRequest<{ status: string }[]>(
      "orders?select=status&id=eq." + b.id + "&limit=1",
    );
    const current = currentRows[0];
    if (!current) return fail("Order not found.", 404);
    if (!canTransitionOrderStatus(current.status, b.status)) return fail("That change is not allowed from the current status.", 409);

    const updated = await dbRequest<{ id: string }[]>(
      "orders?id=eq." + b.id + "&status=eq." + encodeURIComponent(current.status) + "&select=id",
      {
        method: "PATCH",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({ status: b.status }),
      },
    );
    if (updated.length === 0) return fail("That order changed. Refresh and try again.", 409);
    await logAudit(g.session, "order.status", "order", b.id, { status: b.status }, request);
    return NextResponse.json({ ok: true });
  } catch { return fail("Could not update the order.", 503); }
}

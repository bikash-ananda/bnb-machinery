import { NextResponse } from "next/server";
import { adminApi, fail, UUID } from "@/lib/server/admin-api";
import { logAudit } from "@/lib/server/admin-auth";
import { dbRequest } from "@/lib/server/supabase";

export const runtime = "nodejs";
const STATUSES = ["NEW", "CONFIRMED", "DISPATCHED", "COMPLETED", "CANCELLED"];

export async function PATCH(request: Request) {
  const g = await adminApi(request, "orders");
  if ("error" in g) return g.error;
  let b: { id?: unknown; status?: unknown };
  try { b = await request.json(); } catch { return fail("Invalid request."); }
  if (typeof b.id !== "string" || !UUID.test(b.id) || typeof b.status !== "string" || !STATUSES.includes(b.status)) return fail("Invalid request.");
  try {
    await dbRequest("orders?id=eq." + b.id, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ status: b.status }) });
    await logAudit(g.session, "order.status", "order", b.id, { status: b.status }, request);
    return NextResponse.json({ ok: true });
  } catch { return fail("Could not update the order.", 503); }
}
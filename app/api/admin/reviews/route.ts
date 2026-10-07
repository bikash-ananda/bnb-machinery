import { NextResponse } from "next/server";
import { adminApi, fail, UUID } from "@/lib/server/admin-api";
import { logAudit } from "@/lib/server/admin-auth";
import { dbRequest } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const g = await adminApi(request, "reviews");
  if ("error" in g) return g.error;
  let b: { id?: unknown; status?: unknown };
  try { b = await request.json(); } catch { return fail("Invalid request."); }
  if (typeof b.id !== "string" || !UUID.test(b.id) || (b.status !== "APPROVED" && b.status !== "REJECTED")) return fail("Invalid request.");
  try {
    await dbRequest("product_reviews?id=eq." + b.id, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ status: b.status }) });
    await logAudit(g.session, "review." + b.status.toLowerCase(), "review", b.id, null, request);
    return NextResponse.json({ ok: true });
  } catch { return fail("Could not update the review.", 503); }
}
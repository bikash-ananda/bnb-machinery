import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { adminApi, fail, UUID } from "@/lib/server/admin-api";
import { logAudit } from "@/lib/server/admin-auth";
import { db } from "@/src/db/client";
import { productReviews } from "@/src/modules/catalog/extras-schema";

export const runtime = "nodejs";
export async function PATCH(request: Request) {
  const g = await adminApi(request, "reviews");
  if ("error" in g) return g.error;
  let body: { id?: unknown; status?: unknown };
  try { body = await request.json(); } catch { return fail("Invalid request."); }
  if (typeof body.id !== "string" || !UUID.test(body.id) || (body.status !== "APPROVED" && body.status !== "REJECTED")) return fail("Invalid request.");
  try {
    const updated = await db.update(productReviews).set({ status: body.status }).where(eq(productReviews.id, body.id)).returning({ id: productReviews.id });
    if (!updated.length) return fail("Review not found.", 404);
    await logAudit(g.session, "review." + body.status.toLowerCase(), "review", body.id, null, request);
    return NextResponse.json({ ok: true });
  } catch { return fail("Could not update the review.", 503); }
}
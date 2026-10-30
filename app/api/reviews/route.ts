import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { rateLimited } from "@/lib/server/ai";
import { isAllowedOrigin } from "@/lib/server/auth";
import { getShopProduct } from "@/lib/server/catalog";
import { db } from "@/src/db/client";
import { productReviews } from "@/src/modules/catalog/extras-schema";

export const runtime = "nodejs";
const schema = z.object({
  slug: z.string().min(1).max(120),
  name: z.string().trim().min(2).max(60),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(5).max(1000),
  website: z.string().optional(),
});
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return fail("forbidden", 403);
  if (rateLimited(request, "review", 5)) return fail("rate_limited", 429);
  let json: unknown;
  try { json = await request.json(); } catch { return fail("bad_request"); }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return fail("invalid");
  const data = parsed.data;
  if (data.website) return NextResponse.json({ ok: true });
  if (!(await getShopProduct(data.slug))) return fail("not_found", 404);
  try {
    await db.insert(productReviews).values({ productSlug: data.slug, name: data.name, rating: data.rating, comment: data.comment, status: "PENDING" });
    return NextResponse.json({ ok: true });
  } catch { return fail("reviews_unavailable", 503); }
}
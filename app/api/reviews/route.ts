import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimited } from "@/lib/server/ai";
import { isAllowedOrigin } from "@/lib/server/auth";
import { getShopProduct } from "@/lib/server/catalog";
import { dbRequest, hasSupabaseConfig } from "@/lib/server/supabase";

export const runtime = "nodejs";

const schema = z.object({
  slug: z.string().min(1).max(120),
  name: z.string().trim().min(2).max(60),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(5).max(1000),
  website: z.string().optional(), // honeypot: real people leave it empty
});

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return fail("forbidden", 403);
  if (rateLimited(request, "review", 5)) return fail("rate_limited", 429);

  let json: unknown;
  try { json = await request.json(); } catch { return fail("bad_request"); }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return fail("invalid");
  const d = parsed.data;
  if (d.website) return NextResponse.json({ ok: true }); // bot: pretend success, store nothing

  if (!(await getShopProduct(d.slug))) return fail("not_found", 404);
  if (!hasSupabaseConfig()) return fail("reviews_unavailable", 503);

  try {
    await dbRequest("product_reviews", {
      method: "POST",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({ product_slug: d.slug, name: d.name, rating: d.rating, comment: d.comment }),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return fail("reviews_unavailable", 503);
  }
}
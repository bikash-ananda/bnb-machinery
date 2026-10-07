import "server-only";

import { dbRequest, hasSupabaseConfig } from "@/lib/server/supabase";
import type { Review, ReviewSummary } from "@/lib/shop/reviews";

export type Extras = { mrp: number | null; videos: string[] };

const safeUrl = (u: unknown) => {
  if (typeof u !== "string") return null;
  try {
    const x = new URL(u.trim());
    return x.protocol === "https:" || x.protocol === "http:" ? x.toString() : null;
  } catch {
    return null;
  }
};

export async function getProductExtras(slug: string): Promise<Extras> {
  const none = { mrp: null, videos: [] };
  if (!hasSupabaseConfig()) return none;
  try {
    const rows = await dbRequest<{ mrp: number | string | null; video_urls: string[] | null }[]>(
      `product_extras?select=mrp,video_urls&product_slug=eq.${encodeURIComponent(slug)}&limit=1`,
    );
    const r = rows[0];
    const mrp = r?.mrp != null && Number.isFinite(Number(r.mrp)) ? Number(r.mrp) : null;
    return { mrp, videos: (r?.video_urls ?? []).map(safeUrl).filter((x): x is string => !!x).slice(0, 6) };
  } catch {
    return none;
  }
}

export async function getReviews(slug: string): Promise<ReviewSummary> {
  const empty: ReviewSummary = { enabled: false, items: [], count: 0, avg: 0, dist: [0, 0, 0, 0, 0] };
  if (!hasSupabaseConfig()) return empty;
  try {
    const rows = await dbRequest<Review[]>(
      `product_reviews?select=id,name,rating,comment,created_at&product_slug=eq.${encodeURIComponent(slug)}&status=eq.APPROVED&order=created_at.desc&limit=100`,
    );
    const dist = [0, 0, 0, 0, 0];
    for (const r of rows) if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
    const count = rows.length;
    const avg = count ? rows.reduce((n, r) => n + r.rating, 0) / count : 0;
    return { enabled: true, items: rows.slice(0, 30), count, avg, dist };
  } catch {
    return empty;
  }
}
import "server-only";
import { and, desc, eq } from "drizzle-orm";
import type { Review, ReviewSummary } from "@/lib/shop/reviews";
import { db } from "@/src/db/client";
import { productExtras, productReviews } from "@/src/modules/catalog/extras-schema";

export type Extras = { mrp: number | null; videos: string[] };
const safeUrl = (value: unknown) => {
  if (typeof value !== "string") return null;
  try { const url = new URL(value.trim()); return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null; } catch { return null; }
};
export async function getProductExtras(slug: string): Promise<Extras> {
  try {
    const [row] = await db.select().from(productExtras).where(eq(productExtras.productSlug, slug)).limit(1);
    const mrp = row?.mrp != null && Number.isFinite(Number(row.mrp)) ? Number(row.mrp) : null;
    return { mrp, videos: (row?.videoUrls ?? []).map(safeUrl).filter((v): v is string => !!v).slice(0, 6) };
  } catch { return { mrp: null, videos: [] }; }
}
export async function getReviews(slug: string): Promise<ReviewSummary> {
  const empty: ReviewSummary = { enabled: false, items: [], count: 0, avg: 0, dist: [0, 0, 0, 0, 0] };
  try {
    const rows = await db.select().from(productReviews).where(and(eq(productReviews.productSlug, slug), eq(productReviews.status, "APPROVED"))).orderBy(desc(productReviews.createdAt)).limit(100);
    const dist = [0, 0, 0, 0, 0];
    for (const row of rows) if (row.rating >= 1 && row.rating <= 5) dist[row.rating - 1]++;
    const count = rows.length;
    const avg = count ? rows.reduce((sum, row) => sum + row.rating, 0) / count : 0;
    const items: Review[] = rows.slice(0, 30).map(row => ({ id: row.id, name: row.name, rating: row.rating, comment: row.comment, created_at: row.createdAt.toISOString() }));
    return { enabled: true, items, count, avg, dist };
  } catch { return empty; }
}
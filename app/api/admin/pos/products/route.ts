import { and, eq, ilike, or } from "drizzle-orm";
import { canAccess } from "@/lib/admin/access";
import { getAdminSession } from "@/lib/server/admin-auth";
import { db } from "@/src/db/client";
import { jsonSafe } from "@/src/lib/json";
import { products } from "@/src/modules/catalog/schema";
import { getAvailability } from "@/src/modules/inventory/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const s = await getAdminSession();
  if (!s || s.mustChange || !canAccess(s.role, "pos")) return jsonSafe({ error: "Not allowed." }, 401);
  const term = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60).replace(/[%_\\]/g, "");
  if (term.length < 2) return jsonSafe({ items: [] });
  const like = `%${term}%`;
  const rows = await db.select().from(products)
    .where(and(or(eq(products.barcode, term), eq(products.sku, term.toUpperCase()), ilike(products.sku, like), ilike(products.nameEn, like), ilike(products.nameNe, like), ilike(products.model, like))))
    .limit(12);
  const avail = await db.transaction((tx) => getAvailability(tx, rows.map((r) => r.id)));
  const items = rows.map((r) => ({
    id: r.id, sku: r.sku, barcode: r.barcode, name: r.nameEn, price: r.pricePaisa, tax: r.taxCategory, incl: r.priceIncludesVat,
    track: r.trackStock, available: r.trackStock ? (avail.get(r.id) ?? 0) : null,
  }));
  const exact = rows.length === 1 && (rows[0].barcode === term || rows[0].sku === term.toUpperCase());
  return jsonSafe({ items, exact });
}

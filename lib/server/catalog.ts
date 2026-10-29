import "server-only";

import { products as staticProducts, type Product } from "@/data/products";
import { staticPrices } from "@/data/prices";
import { productImage } from "@/data/siteImages";
import type { ProductRecord } from "@/lib/inventory/types";
import { getPublishedProducts } from "@/lib/server/inventory";
import type { ShopProduct } from "@/lib/shop/types";
import { getPublicCatalogProducts } from "@/src/modules/catalog/management";

function fromStatic(p: Product): ShopProduct {
  const extra = staticPrices[p.id] ?? {};
  const img = productImage(p.id, p.image);
  return {
    id: p.id, slug: p.id, name: p.name, brand: p.brand, category: p.category,
    image: img, images: [img], description: p.description, model: p.model,
    specs: p.specs ?? [],
    price: p.marketReference ? null : p.price ?? extra.price ?? null,
    marketPrice: p.marketReference ? p.price ?? null : null,
    mrp: p.marketReference ? null : p.mrp ?? extra.mrp ?? null,
    availability: p.catalogOnly || p.marketReference ? "out" : "ask", stockQty: p.catalogOnly || p.marketReference ? 0 : null, featured: p.featured,
    sourceUrl: p.sourceUrl, manufacturerUrl: p.manufacturerUrl, sourceName: p.sourceName,
    imageCredit: p.imageCredit, priceCheckedOn: p.priceCheckedOn, priceNote: p.priceNote,
    marketReference: p.marketReference,
  };
}

function fromDb(r: ProductRecord): ShopProduct {
  const images = (r.images ?? []).map((i) => "/api/inventory/images/" + encodeURIComponent(i.id));
  const qty = r.stock_quantity;
  const availability =
    r.stock_status === "OUT_OF_STOCK" || qty === 0 ? "out" : r.stock_status === "AVAILABLE" || (qty ?? 0) > 0 ? "in" : "ask";
  return {
    id: r.id, slug: r.slug, name: r.name_en || r.name || "Product", nameNe: r.name_ne || undefined,
    brand: r.brand_name || "Machinery Tools Nepal", category: r.category_name_en || "Machinery",
    image: images[0] ?? "", images, description: r.description_en || "", model: r.model || undefined,
    specs: (r.specifications ?? []).filter((s) => s && s.name && s.value),
    price: typeof r.price === "number" ? r.price : null, mrp: null,
    availability, stockQty: qty,
  };
}

export async function getShopProducts(): Promise<ShopProduct[]> {
  const [legacy, managed] = await Promise.all([
    getPublishedProducts().then((rows) => rows.map(fromDb)).catch(() => [] as ShopProduct[]),
    getPublicCatalogProducts().catch(() => [] as ShopProduct[]),
  ]);
  // The transactional catalogue is authoritative for matching slugs; legacy published
  // entries remain visible during migration, and static reference products stay as fallback.
  const live = [...managed, ...legacy.filter((p) => !managed.some((m) => m.slug === p.slug))];
  const seen = new Set(live.flatMap((p) => [p.slug, p.id]));
  return [...live, ...staticProducts.filter((s) => !seen.has(s.id)).map(fromStatic)];
}

export async function getShopProduct(slug: string) {
  return (await getShopProducts()).find((p) => p.slug === slug || p.id === slug) ?? null;
}

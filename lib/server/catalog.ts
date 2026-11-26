import "server-only";

import type { ProductRecord } from "@/lib/inventory/types";
import { getPublishedProducts } from "@/lib/server/inventory";
import type { ShopProduct } from "@/lib/shop/types";
import { getPublicCatalogProducts } from "@/src/modules/catalog/management";

function fromDb(r: ProductRecord): ShopProduct {
  const images = (r.images ?? []).map((i) => "/api/inventory/images/" + encodeURIComponent(i.id));
  const qty = r.stock_quantity;
  const availability =
    r.stock_status === "OUT_OF_STOCK" || qty === 0 ? "out" : r.stock_status === "AVAILABLE" || (qty ?? 0) > 0 ? "in" : "ask";
  return {
    id: r.id, slug: r.slug, name: r.name_en || r.name || "Product", nameNe: r.name_ne || undefined,
    brand: r.brand_name || "Unspecified brand", category: r.category_name_en || "Uncategorised",
    image: images[0] ?? "", images, description: r.description_en || "", model: r.model || undefined,
    specs: (r.specifications ?? []).filter((s) => s && s.name && s.value),
    price: typeof r.price === "number" ? r.price : null, mrp: null,
    availability, stockQty: qty,
  };
}

/**
 * Public products must come from the approved/published PostgreSQL catalog.
 * Manufacturer research and placeholder examples in data/products.ts are not
 * B&B stock records and must never be presented as products available from us.
 */
export async function getShopProducts(): Promise<ShopProduct[]> {
  const [legacy, managed] = await Promise.all([
    getPublishedProducts().then((rows) => rows.map(fromDb)),
    getPublicCatalogProducts(),
  ]);

  // The canonical catalog wins when a slug exists in both existing workflows.
  return [
    ...managed,
    ...legacy.filter((product) => !managed.some((item) => item.slug === product.slug)),
  ];
}

export async function getShopProduct(slug: string) {
  return (await getShopProducts()).find((product) => product.slug === slug || product.id === slug) ?? null;
}

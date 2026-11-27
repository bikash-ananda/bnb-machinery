import "server-only";

export type PublicProductSource = {
  id: string; slug: string; nameEn: string; nameNe: string | null;
  descriptionEn: string | null; descriptionNe: string | null;
  model: string | null; partNumber: string | null; applications: string[];
  brandName: string | null; brandSlug: string | null;
  categoryNameEn: string | null; categoryNameNe: string | null; categorySlug: string | null;
  pricePaisa: bigint | null; mrpPaisa: bigint | null;
  priceMode: "FIXED" | "PRICE_ON_REQUEST";
  availabilityLabel: "AVAILABLE" | "OUT_OF_STOCK" | "ON_REQUEST";
  specs: Array<{ name: string; value: string }>;
  media: Array<{ url: string; alt: string | null; sortOrder: number }>;
  updatedAt: Date;
};

/** Explicit public allowlist. Never spread an admin/database row into this object. */
export function projectPublicProduct(source: PublicProductSource) {
  return {
    sourceId: source.id, slug: source.slug, nameEn: source.nameEn, nameNe: source.nameNe,
    descriptionEn: source.descriptionEn, descriptionNe: source.descriptionNe,
    model: source.model, partNumber: source.partNumber,
    applications: source.applications.filter((item) => typeof item === "string").slice(0, 100),
    brandName: source.brandName, brandSlug: source.brandSlug,
    categoryNameEn: source.categoryNameEn, categoryNameNe: source.categoryNameNe, categorySlug: source.categorySlug,
    pricePaisa: source.priceMode === "FIXED" ? source.pricePaisa?.toString() ?? null : null,
    mrpPaisa: source.priceMode === "FIXED" ? source.mrpPaisa?.toString() ?? null : null,
    priceMode: source.priceMode, availabilityLabel: source.availabilityLabel,
    specs: source.specs.filter((item) => item && item.name && item.value).slice(0, 100),
    media: source.media.filter((item) => item && /^https:\/\//i.test(item.url))
      .sort((a, b) => a.sortOrder - b.sortOrder).map(({ url, alt }) => ({ url, alt })),
    sourceUpdatedAt: source.updatedAt,
  };
}

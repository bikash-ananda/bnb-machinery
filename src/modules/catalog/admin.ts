import { toPaisa } from "@/src/lib/money";

export type CatalogInput = {
  sku: string;
  barcode: string | null;
  nameEn: string;
  nameNe: string | null;
  descriptionEn: string | null;
  descriptionNe: string | null;
  category: string | null;
  brand: string | null;
  model: string | null;
  unit: string;
  pricePaisa: bigint | null;
  mrpPaisa: bigint | null;
  costPaisa: bigint | null;
  priceIncludesVat: boolean;
  vatApplicable: boolean;
  taxCategory: "STANDARD" | "ZERO_RATED" | "EXEMPT";
  hsCode: string | null;
  reorderLevel: number;
  trackStock: boolean;
  isFeatured: boolean;
  specs: { name: string; value: string }[];
  images: string[];
};

const text = (value: unknown, max: number, required = false): string | null => {
  if (value === undefined || value === null) {
    if (required) throw new Error("A required field is missing.");
    return null;
  }
  if (typeof value !== "string") throw new Error("Text fields must be strings.");
  const result = value.trim();
  if (result.length > max) throw new Error(`A text field exceeds ${max} characters.`);
  if (required && !result) throw new Error("SKU and English product name are required.");
  return result || null;
};

const bool = (value: unknown, fallback = false) => {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw new Error("A checkbox value is invalid.");
  return value;
};

function money(value: unknown, field: string): bigint | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new Error(`${field} must be a valid decimal string.`);
  try {
    const amount = toPaisa(value);
    if (amount < 0n) throw new Error("negative");
    if (amount > 9_000_000_000_000_000n) throw new Error("large");
    return amount;
  } catch {
    throw new Error(`${field} must be a non-negative amount with at most two decimal places.`);
  }
}

export function slugify(value: string): string {
  return value.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "item";
}

export function parseCatalogInput(value: unknown): CatalogInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Enter valid product details.");
  const v = value as Record<string, unknown>;
  const sku = text(v.sku, 80, true)!.toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._/-]*$/.test(sku)) throw new Error("SKU may contain letters, numbers, dots, underscores, slashes and hyphens.");
  const barcode = text(v.barcode, 80);
  const nameEn = text(v.nameEn, 160, true)!;
  const nameNe = text(v.nameNe, 160);
  const unit = text(v.unit ?? "pcs", 24, true)!;
  if (!/^[\p{L}\p{N}._/-]+$/u.test(unit)) throw new Error("Unit contains unsupported characters.");
  const pricePaisa = money(v.price, "Selling price");
  const mrpPaisa = money(v.mrp, "MRP");
  const costPaisa = money(v.cost, "Cost");
  if (pricePaisa !== null && mrpPaisa !== null && mrpPaisa < pricePaisa) {
    throw new Error("MRP cannot be lower than the selling price.");
  }
  const reorderLevel = v.reorderLevel === undefined || v.reorderLevel === "" ? 0 : Number(v.reorderLevel);
  if (!Number.isSafeInteger(reorderLevel) || reorderLevel < 0 || reorderLevel > 1_000_000_000) {
    throw new Error("Reorder level must be a whole number from 0 to 1,000,000,000.");
  }
  const taxCategory = v.taxCategory ?? "STANDARD";
  if (taxCategory !== "STANDARD" && taxCategory !== "ZERO_RATED" && taxCategory !== "EXEMPT") {
    throw new Error("Choose a valid tax category.");
  }
  const rawSpecs = v.specs === undefined ? [] : v.specs;
  if (!Array.isArray(rawSpecs) || rawSpecs.length > 50) throw new Error("Add no more than 50 product specifications.");
  const specs = rawSpecs.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Each specification must have a name and value.");
    const row = raw as Record<string, unknown>;
    const name = text(row.name, 80, true);
    const specValue = text(row.value, 160, true);
    return { name: name!, value: specValue! };
  });
  const rawImages = v.images === undefined ? [] : v.images;
  if (!Array.isArray(rawImages) || rawImages.length > 8) throw new Error("Add no more than eight product image URLs.");
  const images = rawImages.map((raw) => {
    const url = text(raw, 1000, true)!;
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new Error("Each product image must be a valid HTTPS URL."); }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error("Product images must use HTTPS URLs without embedded credentials.");
    return parsed.toString();
  });
  if (new Set(images).size !== images.length) throw new Error("Remove duplicate product image URLs.");
  return {
    sku, barcode, nameEn, nameNe,
    descriptionEn: text(v.descriptionEn, 5000), descriptionNe: text(v.descriptionNe, 5000),
    category: text(v.category, 100), brand: text(v.brand, 100), model: text(v.model, 120),
    unit, pricePaisa, mrpPaisa, costPaisa,
    priceIncludesVat: bool(v.priceIncludesVat, true),
    vatApplicable: bool(v.vatApplicable, true),
    taxCategory,
    hsCode: text(v.hsCode, 24), reorderLevel,
    trackStock: bool(v.trackStock, false), isFeatured: bool(v.isFeatured, false),
    specs, images,
  };
}

export function moneyInput(value: bigint | null): string {
  if (value === null) return "";
  const negative = value < 0n;
  const abs = negative ? -value : value;
  return `${negative ? "-" : ""}${abs / 100n}.${(abs % 100n).toString().padStart(2, "0")}`;
}

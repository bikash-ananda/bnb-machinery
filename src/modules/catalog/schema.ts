import { boolean, index, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, paisa, updatedAt } from "../../db/columns";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameNe: text("name_ne"),
  parentId: uuid("parent_id"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sku: text("sku").notNull().unique(),
    barcode: text("barcode").unique(),
    slug: text("slug").notNull().unique(),
    nameEn: text("name_en").notNull(),
    nameNe: text("name_ne"),
    descriptionEn: text("description_en"),
    descriptionNe: text("description_ne"),
    categoryId: uuid("category_id").references(() => categories.id),
    brandId: uuid("brand_id").references(() => brands.id),
    model: text("model"),
    partNumber: text("part_number"),
    applications: jsonb("applications").$type<string[]>().notNull().default([]),
    unit: text("unit").notNull().default("pcs"),
    pricePaisa: paisa("price_paisa"),
    mrpPaisa: paisa("mrp_paisa"),
    costPaisa: paisa("cost_paisa"),
    priceIncludesVat: boolean("price_includes_vat").notNull().default(true),
    vatApplicable: boolean("vat_applicable").notNull().default(true),
    taxCategory: text("tax_category").notNull().default("STANDARD"),
    hsCode: text("hs_code"),
    reorderLevel: integer("reorder_level").notNull().default(0),
    isPublished: boolean("is_published").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    trackStock: boolean("track_stock").notNull().default(false),
    specs: jsonb("specs").$type<{ name: string; value: string }[]>().notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("products_category_idx").on(t.categoryId),
    index("products_published_idx").on(t.isPublished),
    index("products_part_number_idx").on(t.partNumber),
  ],
);

export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});


/** Product documents are private by default; public delivery must enforce visibility server-side. */
export const productDocuments = pgTable("product_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  storagePath: text("storage_path").notNull().unique(),
  mimeType: text("mime_type").notNull(),
  visibility: text("visibility").notNull().default("PRIVATE"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
}, (t) => [
  index("product_documents_product_idx").on(t.productId, t.sortOrder),
  index("product_documents_visibility_idx").on(t.visibility),
]);

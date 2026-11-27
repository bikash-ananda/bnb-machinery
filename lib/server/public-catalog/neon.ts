import "server-only";
import { Pool } from "pg";

let pool: Pool | undefined;
function getPool() {
  if (process.env.PUBLIC_CATALOG_READ_ENABLED !== "true") throw new Error("Public catalog read model is disabled.");
  const connectionString = process.env.PUBLIC_CATALOG_DATABASE_URL?.trim();
  if (!connectionString) throw new Error("Public catalog database is not configured.");
  if (!pool) pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 10000, connectionTimeoutMillis: 5000, application_name: "bnb-public-catalog", ssl: { rejectUnauthorized: true } });
  return pool;
}

export type PublicCatalogRow = {
  source_id: string; slug: string; name_en: string; name_ne: string | null;
  description_en: string | null; description_ne: string | null; model: string | null;
  part_number: string | null; applications: string[]; brand_name: string | null; brand_slug: string | null;
  category_name_en: string | null; category_name_ne: string | null; category_slug: string | null;
  price_paisa: string | null; mrp_paisa: string | null; price_mode: "FIXED" | "PRICE_ON_REQUEST";
  availability_label: "AVAILABLE" | "OUT_OF_STOCK" | "ON_REQUEST";
  specs: Array<{ name: string; value: string }>; media: Array<{ url: string; alt: string | null }>;
};

const PUBLIC_COLUMNS = `source_id, slug, name_en, name_ne, description_en, description_ne,
  model, part_number, applications, brand_name, brand_slug, category_name_en,
  category_name_ne, category_slug, price_paisa, mrp_paisa, price_mode,
  availability_label, specs, media`;

/** Server-only read API; never selects private business columns. */
export async function listPublicCatalog(input: { limit?: number; offset?: number; search?: string } = {}) {
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 24), 1), 100);
  const offset = Math.max(Math.trunc(input.offset ?? 0), 0);
  const search = input.search?.trim().slice(0, 80) ?? "";
  const result = await getPool().query<PublicCatalogRow>(
    "SELECT " + PUBLIC_COLUMNS + " FROM public_products WHERE is_published = TRUE AND ($3 = '' OR search_document ILIKE '%' || replace(replace(replace($3, chr(92), chr(92)||chr(92)), '%', chr(92)||'%'), '_', chr(92)||'_') || '%' ESCAPE chr(92)) ORDER BY name_en ASC LIMIT $1 OFFSET $2",
    [limit, offset, search],
  );
  return result.rows;
}

export async function getPublicProductBySlug(slug: string) {
  const result = await getPool().query<PublicCatalogRow>(
    "SELECT " + PUBLIC_COLUMNS + " FROM public_products WHERE is_published = TRUE AND slug = $1 LIMIT 1",
    [slug],
  );
  return result.rows[0] ?? null;
}

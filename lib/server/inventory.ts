import "server-only";

import type {
  ProductFields,
  ProductRecord,
  StaffSession,
  VerificationStatus,
} from "@/lib/inventory/types";
import { callRpc, dbRequest, hasSupabaseConfig } from "@/lib/server/supabase";

type ImageRow = {
  id: string;
  product_id: string;
  storage_path: string;
  mime_type: string;
  sort_index: number;
};

const productSelect =
  "id,slug,name,name_en,name_ne,description_en,description_ne,category_id,category_name_en,brand_id,brand_name,model,part_number,specifications,applications,stock_quantity,stock_status,price,price_type,verification_status,publication_status,created_by,approved_by,created_at,updated_at,published_at,ai_suggestions,ai_status";

async function addImages(products: ProductRecord[]) {
  if (products.length === 0) return products;
  const ids = products.map((product) => product.id);
  const filter = "in.(" + ids.map(encodeURIComponent).join(",") + ")";
  const images = await dbRequest<ImageRow[]>(
    "product_images?select=id,product_id,mime_type,sort_index&product_id=" +
      filter +
      "&order=sort_index.asc",
  );
  const byProduct = new Map<string, ImageRow[]>();
  for (const image of images) {
    const current = byProduct.get(image.product_id) ?? [];
    current.push(image);
    byProduct.set(image.product_id, current);
  }

  return products.map((product) => ({
    ...product,
    images: (byProduct.get(product.id) ?? []).map((image) => ({
      id: image.id,
      mime_type: image.mime_type,
      sort_index: image.sort_index,
    })),
  }));
}

export async function getPublishedProducts(): Promise<ProductRecord[]> {
  if (!hasSupabaseConfig()) return [];
  const rows = await dbRequest<ProductRecord[]>(
    "products?select=" +
      productSelect +
      "&publication_status=eq.PUBLISHED&verification_status=eq.APPROVED&order=published_at.desc",
  );
  return addImages(rows);
}

export async function getPublishedProduct(slug: string) {
  if (!hasSupabaseConfig()) return null;
  const rows = await dbRequest<ProductRecord[]>(
    "products?select=" +
      productSelect +
      "&slug=eq." +
      encodeURIComponent(slug) +
      "&publication_status=eq.PUBLISHED&verification_status=eq.APPROVED&limit=1",
  );
  return (await addImages(rows))[0] ?? null;
}

export async function getInventoryProduct(id: string) {
  const rows = await dbRequest<ProductRecord[]>(
    "products?select=" +
      productSelect +
      "&id=eq." +
      encodeURIComponent(id) +
      "&limit=1",
  );
  const product = rows[0];
  return product ? (await addImages([product]))[0] : null;
}

export async function getInventoryProducts(
  session: StaffSession,
  status?: VerificationStatus,
) {
  const query = new URLSearchParams({
    select: productSelect,
    order: "created_at.desc",
  });
  if (session.role === "INVENTORY_EDITOR") {
    query.set("created_by", "eq." + session.email);
  }
  if (status) query.set("verification_status", "eq." + status);

  const rows = await dbRequest<ProductRecord[]>("products?" + query.toString());
  return addImages(rows);
}

export async function createInventoryDraft(
  actor: string,
  slug: string,
  images: { storage_path: string; mime_type: string; sort_index: number }[],
) {
  return callRpc<string>("create_inventory_draft", {
    p_actor: actor,
    p_slug: slug,
    p_images: images,
  });
}

export async function saveInventoryProduct(
  session: StaffSession,
  productId: string,
  fields: ProductFields,
) {
  return callRpc<boolean>("save_inventory_product", {
    p_actor: session.email,
    p_role: session.role,
    p_product_id: productId,
    p_fields: fields,
  });
}

export async function submitInventoryProduct(
  session: StaffSession,
  productId: string,
) {
  return callRpc<boolean>("submit_inventory_product", {
    p_actor: session.email,
    p_product_id: productId,
  });
}

export async function reviewInventoryProduct(
  session: StaffSession,
  productId: string,
  action: "approve" | "reject" | "correction",
  note?: string,
) {
  return callRpc<boolean>("review_inventory_product", {
    p_actor: session.email,
    p_role: session.role,
    p_product_id: productId,
    p_action: action,
    p_details: note ? { note: note.slice(0, 1000) } : {},
  });
}

import { and, eq } from "drizzle-orm";
import { getStaffSession } from "@/lib/server/auth";
import { downloadPrivateImage } from "@/lib/server/media-storage";
import { db } from "@/src/db/client";
import { inventoryWorkflowProductImages, inventoryWorkflowProducts } from "@/src/modules/local-workflow/schema";

type Context = { params: Promise<{ id: string }> };
type ImageRow = { product_id: string; storage_path: string; mime_type: string };
type ProductVisibility = { created_by: string; verification_status: string; publication_status: string };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const runtime = "nodejs";

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return new Response(null, { status: 404 });

  try {
    const rows = await dbRequest<ImageRow[]>(
      "product_images?select=product_id,storage_path,mime_type&id=eq." +
        encodeURIComponent(id) +
        "&limit=1",
    );
    const image = rows[0];
    if (!image) return new Response(null, { status: 404 });

    const products = await dbRequest<ProductVisibility[]>(
      "products?select=created_by,verification_status,publication_status&id=eq." +
        encodeURIComponent(image.product_id) +
        "&limit=1",
    );
    const product = products[0];
    const session = await getStaffSession();
    const isPublic =
      product?.publication_status === "PUBLISHED" &&
      product.verification_status === "APPROVED";
    const isStaff =
      session?.role === "OWNER" ||
      (session?.role === "INVENTORY_EDITOR" && product?.created_by === session.email);
    if (!product || (!isPublic && !isStaff)) return new Response(null, { status: 404 });

    const stored = await downloadPrivateImage(image.storage_path);
    return new Response(new Uint8Array(stored.bytes), {
      headers: {
        "content-type": image.mime_type,
        "x-content-type-options": "nosniff",
        "cache-control": isPublic ? "public, max-age=3600, s-maxage=3600" : "private, no-store",
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}

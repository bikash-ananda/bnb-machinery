import { eq } from "drizzle-orm";
import { getStaffSession } from "@/lib/server/auth";
import { downloadPrivateImage } from "@/lib/server/media-storage";
import { db } from "@/src/db/client";
import { inventoryWorkflowProductImages, inventoryWorkflowProducts } from "@/src/modules/local-workflow/schema";

type Context = { params: Promise<{ id: string }> };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const runtime = "nodejs";

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return new Response(null, { status: 404 });
  try {
    const [image] = await db.select({
      productId: inventoryWorkflowProductImages.productId,
      storagePath: inventoryWorkflowProductImages.storagePath,
      mimeType: inventoryWorkflowProductImages.mimeType,
      createdBy: inventoryWorkflowProducts.createdBy,
      verificationStatus: inventoryWorkflowProducts.verificationStatus,
      publicationStatus: inventoryWorkflowProducts.publicationStatus,
    }).from(inventoryWorkflowProductImages)
      .innerJoin(inventoryWorkflowProducts, eq(inventoryWorkflowProductImages.productId, inventoryWorkflowProducts.id))
      .where(eq(inventoryWorkflowProductImages.id, id)).limit(1);
    if (!image) return new Response(null, { status: 404 });
    const session = await getStaffSession();
    const isPublic = image.publicationStatus === "PUBLISHED" && image.verificationStatus === "APPROVED";
    const isStaff = session?.role === "OWNER" || (session?.role === "INVENTORY_EDITOR" && image.createdBy === session.email);
    if (!isPublic && !isStaff) return new Response(null, { status: 404 });
    const stored = await downloadPrivateImage(image.storagePath);
    return new Response(new Uint8Array(stored.bytes), {
      headers: {
        "content-type": image.mimeType,
        "x-content-type-options": "nosniff",
        "cache-control": isPublic ? "public, max-age=3600, s-maxage=3600" : "private, no-store",
      },
    });
  } catch { return new Response(null, { status: 503 }); }
}
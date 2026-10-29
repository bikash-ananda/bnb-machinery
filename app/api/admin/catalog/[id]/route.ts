import { NextResponse } from "next/server";
import { adminApi } from "@/lib/server/admin-api";
import { UUID } from "@/lib/server/admin-api";
import { jsonSafe } from "@/src/lib/json";
import { parseCatalogInput } from "@/src/modules/catalog/admin";
import { getCatalogProduct, saveCatalogProduct, setCatalogPublished } from "@/src/modules/catalog/management";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const guarded = await adminApi(request, "catalog");
  if ("error" in guarded) return guarded.error;
  const { id } = await context.params;
  if (!UUID.test(id)) return jsonSafe({ error: "Product not found." }, 404);
  try {
    const product = await getCatalogProduct(id);
    return product ? jsonSafe({ product }) : jsonSafe({ error: "Product not found." }, 404);
  } catch {
    return jsonSafe({ error: "Product details could not be loaded." }, 503);
  }
}

export async function PATCH(request: Request, context: Context) {
  const guarded = await adminApi(request, "catalog");
  if ("error" in guarded) return guarded.error;
  if (Number(request.headers.get("content-length") ?? 0) > 64 * 1024) return jsonSafe({ error: "Product details are too large." }, 413);
  const { id } = await context.params;
  if (!UUID.test(id)) return jsonSafe({ error: "Product not found." }, 404);
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return jsonSafe({ error: "Enter valid product details." }, 400);
    const value = body as Record<string, unknown>;
    if (value.action === "publish" || value.action === "unpublish") {
      const result = await setCatalogPublished(id, value.action === "publish", guarded.session);
      return result ? jsonSafe({ ok: true, isPublished: result.isPublished }) : jsonSafe({ error: "Product not found." }, 404);
    }
    const input = parseCatalogInput(value);
    const saved = await saveCatalogProduct(input, guarded.session, id);
    return saved ? jsonSafe({ ok: true, id: saved.id }) : jsonSafe({ error: "Product not found." }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/SKU|barcode|slug|unique constraint/i.test(message)) return jsonSafe({ error: "That SKU, barcode, or product identifier is already in use." }, 409);
    if (/required|must |choose|add no more|remove duplicate|valid product|text field|specification|image URLs|checkbox|HTTPS|MRP|Unit|SKU may/i.test(message)) return jsonSafe({ error: message }, 400);
    return jsonSafe({ error: "The product could not be updated. Check for duplicate SKU/barcode values and try again." }, 503);
  }
}

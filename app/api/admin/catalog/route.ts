import { NextResponse } from "next/server";
import { adminApi } from "@/lib/server/admin-api";
import { canAccess } from "@/lib/admin/access";
import { getAdminSession } from "@/lib/server/admin-auth";
import { jsonSafe } from "@/src/lib/json";
import { parseCatalogInput } from "@/src/modules/catalog/admin";
import { listCatalog, saveCatalogProduct } from "@/src/modules/catalog/management";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function positiveInt(value: string | null, fallback: number, max: number) {
  if (!value) return fallback;
  if (!/^\d+$/.test(value)) return fallback;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 1 ? Math.min(n, max) : fallback;
}

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session || session.mustChange || !canAccess(session.role, "catalog")) return jsonSafe({ error: "Not allowed." }, 401);
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "all";
    if (!["all", "published", "draft"].includes(status)) return jsonSafe({ error: "Choose a valid publication filter." }, 400);
    const data = await listCatalog({
      q: url.searchParams.get("q") ?? undefined,
      categoryId: url.searchParams.get("categoryId") ?? undefined,
      brandId: url.searchParams.get("brandId") ?? undefined,
      status, page: positiveInt(url.searchParams.get("page"), 1, 100000),
      limit: positiveInt(url.searchParams.get("limit"), 25, 100),
    });
    return jsonSafe(data);
  } catch {
    return jsonSafe({ error: "The product catalogue could not be loaded." }, 503);
  }
}

export async function POST(request: Request) {
  const guarded = await adminApi(request, "catalog");
  if ("error" in guarded) return guarded.error;
  if (Number(request.headers.get("content-length") ?? 0) > 64 * 1024) return jsonSafe({ error: "Product details are too large." }, 413);
  try {
    const input = parseCatalogInput(await request.json());
    const saved = await saveCatalogProduct(input, guarded.session);
    if (!saved) return jsonSafe({ error: "The product could not be created." }, 409);
    return jsonSafe({ ok: true, id: saved.id }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/SKU|barcode|slug|unique constraint/i.test(message)) return jsonSafe({ error: "That SKU, barcode, or product identifier is already in use." }, 409);
    if (/required|must |choose|add no more|remove duplicate|valid product|text field|specification|image URLs|checkbox|HTTPS|MRP|Unit|SKU may/i.test(message)) return jsonSafe({ error: message }, 400);
    return jsonSafe({ error: "The product could not be saved. Check for duplicate SKU/barcode values and try again." }, 503);
  }
}

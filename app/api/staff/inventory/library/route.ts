import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { ProductFields } from "@/lib/inventory/types";
import { getStaffSession, isAllowedOrigin } from "@/lib/server/auth";
import {
  getManufacturerLibraryItem,
  manufacturerLibraryFacets,
  searchManufacturerLibrary,
} from "@/lib/server/manufacturer-library";
import { createInventoryDraft, saveInventoryProduct } from "@/lib/server/inventory";
import {
  BackendNotConfiguredError,
  deletePrivateImages,
  uploadPrivateImage,
} from "@/lib/server/supabase";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_HOSTS: Record<string, Set<string>> = {
  Deli: new Set(["www.delitoolsglobal.com"]),
  TOTAL: new Set(["www.totalbusiness.com"]),
  SKF: new Set(["d1lq520449p9gg.cloudfront.net"]),
  ABB: new Set(["cdn.productimages.abb.com"]),
  Neptune: new Set(["www.neptunefarming.com"]),
};

function canEditInventory(role: string) {
  return role === "INVENTORY_EDITOR" || role === "OWNER";
}

async function getSession() {
  try {
    const session = await getStaffSession();
    return { session, error: null };
  } catch {
    return { session: null, error: "Authentication could not be checked. Please try again." };
  }
}

function detectImage(bytes: Buffer): { mimeType: string; extension: string } | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { mimeType: "image/png", extension: "png" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return { mimeType: "image/webp", extension: "webp" };
  }
  return null;
}

async function downloadManufacturerImage(urlText: string, manufacturer: string) {
  const url = new URL(urlText);
  const allowedHosts = ALLOWED_IMAGE_HOSTS[manufacturer];
  if (url.protocol !== "https:" || !allowedHosts?.has(url.hostname) || (url.port && url.port !== "443") || url.username || url.password) {
    throw new Error("The manufacturer image source is not approved.");
  }

  const response = await fetch(url, {
    headers: { accept: "image/avif,image/webp,image/png,image/jpeg", "user-agent": "B-B-Machinery-Stock-Import/1.0" },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok || !response.body) throw new Error("The manufacturer image could not be downloaded.");
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_IMAGE_BYTES) throw new Error("The manufacturer image is too large to import.");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error("The manufacturer image is too large to import.");
    }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  const image = detectImage(bytes);
  if (!image) throw new Error("The manufacturer page did not provide a supported product image.");
  return { ...image, bytes };
}

export async function GET(request: Request) {
  const { session, error } = await getSession();
  if (error) return NextResponse.json({ error }, { status: 503 });
  if (!session) return NextResponse.json({ error: "Sign in to search the product library." }, { status: 401 });
  if (!canEditInventory(session.role)) return NextResponse.json({ error: "You do not have permission to search stock items." }, { status: 403 });

  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").slice(0, 100);
  const brand = (params.get("brand") ?? "").slice(0, 80);
  const category = (params.get("category") ?? "").slice(0, 100);
  const offset = Number(params.get("offset") ?? 0);
  const result = searchManufacturerLibrary({ query, brand, category, offset, limit: 24 });
  return NextResponse.json(
    { ...result, brands: manufacturerLibraryFacets.brands, categories: manufacturerLibraryFacets.categories },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
  const { session, error } = await getSession();
  if (error) return NextResponse.json({ error }, { status: 503 });
  if (!session) return NextResponse.json({ error: "Sign in to add stock." }, { status: 401 });
  if (!canEditInventory(session.role)) return NextResponse.json({ error: "You do not have permission to add stock." }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 4_096) return NextResponse.json({ error: "Request is too large." }, { status: 413 });

  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Choose a product and try again." }, { status: 400 }); }
  const itemId = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>).itemId
    : null;
  if (typeof itemId !== "string" || itemId.length > 100) return NextResponse.json({ error: "Choose a valid catalog item." }, { status: 400 });

  const item = getManufacturerLibraryItem(itemId);
  if (!item) return NextResponse.json({ error: "That catalog item could not be found. Refresh the library and try again." }, { status: 404 });
  if (!item.imageUrl) return NextResponse.json({ error: "This model has no verified manufacturer image yet. Add a product photo manually." }, { status: 409 });

  const draftId = randomUUID();
  let storedPath: string | null = null;
  let draftCreated = false;
  try {
    const image = await downloadManufacturerImage(item.imageUrl, item.manufacturer);
    const path = `${draftId}/${randomUUID()}.${image.extension}`;
    await uploadPrivateImage(path, image.bytes, image.mimeType);
    storedPath = path;

    const productId = await createInventoryDraft(session.email, item.id, [
      { storage_path: path, mime_type: image.mimeType, sort_index: 0 },
    ]);
    if (typeof productId !== "string") throw new Error("Stock draft could not be created.");
    draftCreated = true;

    const fields: ProductFields = {
      name_en: item.name.slice(0, 160),
      name_ne: null,
      description_en: item.description.slice(0, 4000),
      description_ne: null,
      category_name_en: item.category.slice(0, 100),
      brand_name: item.manufacturer.slice(0, 100),
      model: item.model.slice(0, 120),
      part_number: item.model.slice(0, 120),
      stock_quantity: null,
      specifications: item.specifications.slice(0, 50).map((specification, index) => ({
        name: `Manufacturer detail ${index + 1}`,
        value: specification.slice(0, 160),
      })),
      applications: [],
    };
    if (!await saveInventoryProduct(session, productId, fields)) throw new Error("Stock draft could not be populated.");
    return NextResponse.json({ id: productId }, { status: 201 });
  } catch (cause) {
    if (storedPath && !draftCreated) {
      try { await deletePrivateImages([storedPath]); } catch { /* Keep the original error. */ }
    }
    if (cause instanceof BackendNotConfiguredError) {
      return NextResponse.json({ error: "Inventory services are not configured yet." }, { status: 503 });
    }
    const message = cause instanceof Error ? cause.message : "The stock draft could not be created.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

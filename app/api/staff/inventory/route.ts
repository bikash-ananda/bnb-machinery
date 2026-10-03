import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getStaffSession, isAllowedOrigin } from "@/lib/server/auth";
import { createInventoryDraft, getInventoryProducts } from "@/lib/server/inventory";
import {
  deletePrivateImages,
  hasSupabaseConfig,
  uploadPrivateImage,
} from "@/lib/server/supabase";

export const runtime = "nodejs";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;
const MAX_FILES = 5;

class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

function imageType(bytes: Buffer) {
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
  }

  let session;
  try {
    session = await getStaffSession();
  } catch {
    return NextResponse.json({ error: "Authentication could not be checked. Please try again." }, { status: 503 });
  }
  if (!session) {
    return NextResponse.json({ error: "Sign in to add stock." }, { status: 401 });
  }
  if (session.role !== "INVENTORY_EDITOR") {
    return NextResponse.json({ error: "Only inventory staff can add stock." }, { status: 403 });
  }
  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      { error: "Inventory storage is not configured yet. Contact the site administrator." },
      { status: 503 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_TOTAL_SIZE + 1_000_000) {
    return NextResponse.json({ error: "Please upload fewer or smaller images." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "The images could not be read. Please try again." }, { status: 400 });
  }

  const files = form.getAll("images").filter((value): value is File => value instanceof File);
  if (files.length < 1 || files.length > MAX_FILES) {
    return NextResponse.json(
      { error: "Choose between 1 and 5 product images." },
      { status: 400 },
    );
  }
  const totalSize = files.reduce((total, file) => total + file.size, 0);
  if (files.some((file) => file.size === 0 || file.size > MAX_FILE_SIZE) || totalSize > MAX_TOTAL_SIZE) {
    return NextResponse.json(
      { error: "Each image must be 10 MB or smaller, with a 25 MB total limit." },
      { status: 413 },
    );
  }

  const uploadedPaths: string[] = [];
  try {
    const images: { storage_path: string; mime_type: string; sort_index: number }[] = [];
    for (const [sortIndex, file] of files.entries()) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const mimeType = imageType(bytes);
      if (!mimeType || mimeType !== file.type) {
        throw new UploadValidationError("The image could not be uploaded. Choose a JPG, PNG, or WebP image.");
      }

      const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.slice("image/".length);
      const storagePath = randomUUID() + "." + extension;
      await uploadPrivateImage(storagePath, bytes, mimeType);
      uploadedPaths.push(storagePath);
      images.push({ storage_path: storagePath, mime_type: mimeType, sort_index: sortIndex });
    }

    const productId = await createInventoryDraft(
      session.email,
      "stock-" + randomUUID(),
      images,
    );

    return NextResponse.json({ ok: true, id: productId }, { status: 201 });
  } catch (error) {
    if (uploadedPaths.length > 0) {
      try {
        await deletePrivateImages(uploadedPaths);
      } catch {
        // The primary failure is returned without exposing storage details.
      }
    }
    if (error instanceof UploadValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "The images could not be uploaded. Please try again." },
      { status: 503 },
    );
  }
}

export async function GET() {
  let session;
  try {
    session = await getStaffSession();
  } catch {
    return NextResponse.json({ error: "Authentication could not be checked. Please try again." }, { status: 503 });
  }
  if (!session) {
    return NextResponse.json({ error: "Sign in to view inventory." }, { status: 401 });
  }

  try {
    const products = await getInventoryProducts(session);
    const data = products.map((product) => ({
      ...product,
      images: (product.images ?? []).map((image) => ({
        ...image,
        url: "/api/inventory/images/" + encodeURIComponent(image.id),
      })),
    }));
    return NextResponse.json({ products: data }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "Inventory could not be loaded. Please try again." },
      { status: 503 },
    );
  }
}

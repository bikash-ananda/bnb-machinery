import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createInventoryDraft } from "@/lib/server/inventory";
import { getStaffSession, isAllowedOrigin } from "@/lib/server/auth";
import {
  BackendNotConfiguredError,
  deletePrivateImages,
  uploadPrivateImage,
} from "@/lib/server/supabase";

const MAX_IMAGE_COUNT = 5;
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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
  if (!session) return NextResponse.json({ error: "Sign in to add stock." }, { status: 401 });
  if (session.role !== "INVENTORY_EDITOR" && session.role !== "OWNER") {
    return NextResponse.json({ error: "You do not have permission to add stock." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_TOTAL_SIZE + 1024 * 1024) {
    return NextResponse.json({ error: "The selected images are too large." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Choose valid image files and try again." }, { status: 400 });
  }

  const images = form.getAll("images");
  if (
    images.length === 0 ||
    images.length > MAX_IMAGE_COUNT ||
    images.some(
      (image) =>
        !(image instanceof File) ||
        !ALLOWED_IMAGE_TYPES.has(image.type) ||
        image.size === 0,
    ) ||
    images.reduce((total, image) => total + (image instanceof File ? image.size : 0), 0) > MAX_TOTAL_SIZE
  ) {
    return NextResponse.json({ error: "Choose up to five valid images under 25 MB total." }, { status: 400 });
  }

  const draftId = randomUUID();
  const paths: string[] = [];
  try {
    const storedImages = [];
    for (const [sortIndex, image] of images.entries()) {
      if (!(image instanceof File)) continue;
      const extension = image.type === "image/jpeg" ? "jpg" : image.type.slice("image/".length);
      const path = `${draftId}/${randomUUID()}.${extension}`;
      await uploadPrivateImage(path, Buffer.from(await image.arrayBuffer()), image.type);
      paths.push(path);
      storedImages.push({ storage_path: path, mime_type: image.type, sort_index: sortIndex });
    }

    const id = await createInventoryDraft(session.email, `draft-${draftId}`, storedImages);
    if (typeof id !== "string") throw new Error("Draft could not be created.");
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    try {
      await deletePrivateImages(paths);
    } catch {
      // The failed upload or draft creation remains the primary error.
    }
    if (error instanceof BackendNotConfiguredError) {
      return NextResponse.json({ error: "Inventory services are not configured yet." }, { status: 503 });
    }
    return NextResponse.json({ error: "The stock item could not be created." }, { status: 503 });
  }
}

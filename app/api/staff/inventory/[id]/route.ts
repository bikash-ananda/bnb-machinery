import { NextResponse } from "next/server";
import type { ProductFields } from "@/lib/inventory/types";
import { getStaffSession, isAllowedOrigin } from "@/lib/server/auth";
import {
  getInventoryProduct,
  reviewInventoryProduct,
  saveInventoryProduct,
  submitInventoryProduct,
} from "@/lib/server/inventory";
import { BackendNotConfiguredError } from "@/lib/server/supabase";

type Context = { params: Promise<{ id: string }> };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function shortText(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || value.length > maxLength) throw new Error("invalid");
  return value.trim() || null;
}

function parseFields(value: unknown): ProductFields {
  if (!value || typeof value !== "object") throw new Error("invalid");
  const input = value as Record<string, unknown>;
  const stock = input.stockQuantity;
  if (
    stock !== null &&
    stock !== undefined &&
    stock !== "" &&
    (typeof stock !== "number" && typeof stock !== "string"
      ? true
      : !/^\d+$/.test(String(stock)) ||
        !Number.isSafeInteger(Number(stock)) ||
        Number(stock) < 0 ||
        Number(stock) > 1_000_000_000)
  ) {
    throw new Error("invalid");
  }

  const specifications = Array.isArray(input.specifications)
    ? input.specifications.slice(0, 50).map((item) => {
        if (!item || typeof item !== "object") throw new Error("invalid");
        const spec = item as Record<string, unknown>;
        const name = shortText(spec.name, 80);
        const specValue = shortText(spec.value, 160);
        if (!name || !specValue) throw new Error("invalid");
        return { name, value: specValue };
      })
    : [];
  const applications = Array.isArray(input.applications)
    ? input.applications.slice(0, 30).map((item) => {
        const application = shortText(item, 120);
        if (!application) throw new Error("invalid");
        return application;
      })
    : [];

  return {
    name_en: shortText(input.nameEn, 160),
    name_ne: shortText(input.nameNe, 160),
    description_en: shortText(input.descriptionEn, 4000),
    description_ne: shortText(input.descriptionNe, 4000),
    category_name_en: shortText(input.category, 100),
    brand_name: shortText(input.brand, 100),
    model: shortText(input.model, 120),
    part_number: shortText(input.partNumber, 120),
    stock_quantity:
      stock === null || stock === undefined || stock === ""
        ? null
        : Number(stock),
    specifications,
    applications,
  };
}

export async function GET(_request: Request, context: Context) {
  let session;
  try {
    session = await getStaffSession();
  } catch {
    return NextResponse.json({ error: "Authentication could not be checked. Please try again." }, { status: 503 });
  }
  if (!session) return NextResponse.json({ error: "Sign in to view this stock item." }, { status: 401 });
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Stock item not found." }, { status: 404 });

  try {
    const product = await getInventoryProduct(id);
    if (
      !product ||
      (session.role === "INVENTORY_EDITOR" && product.created_by !== session.email)
    ) {
      return NextResponse.json({ error: "Stock item not found." }, { status: 404 });
    }
    return NextResponse.json(
      {
        product: {
          ...product,
          images: (product.images ?? []).map((image) => ({
            ...image,
            url: "/api/inventory/images/" + encodeURIComponent(image.id),
          })),
        },
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Stock item could not be loaded." }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: Context) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
  }
  let session;
  try {
    session = await getStaffSession();
  } catch {
    return NextResponse.json({ error: "Authentication could not be checked. Please try again." }, { status: 503 });
  }
  if (!session) return NextResponse.json({ error: "Sign in to update stock." }, { status: 401 });
  if (Number(request.headers.get("content-length") ?? 0) > 64 * 1024) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }
  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Stock item not found." }, { status: 404 });

  let payload: Record<string, unknown>;
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid");
    payload = value as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Check the form and try again." }, { status: 400 });
  }

  try {
    if (payload.action === "save") {
      const fields = parseFields(payload.fields);
      const saved = await saveInventoryProduct(session, id, fields);
      if (!saved) return NextResponse.json({ error: "This item can no longer be edited." }, { status: 409 });
      return NextResponse.json({ ok: true });
    }

    if (payload.action === "submit") {
      if (session.role !== "INVENTORY_EDITOR") {
        return NextResponse.json({ error: "Only inventory staff can submit a draft." }, { status: 403 });
      }
      const submitted = await submitInventoryProduct(session, id);
      if (!submitted) {
        return NextResponse.json(
          { error: "Add a product name and save your draft before submitting it." },
          { status: 409 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (payload.action === "approve" || payload.action === "reject" || payload.action === "correction") {
      if (session.role !== "OWNER") {
        return NextResponse.json({ error: "Owner access is required for this action." }, { status: 403 });
      }
      const note = typeof payload.note === "string" ? payload.note.trim().slice(0, 1000) : undefined;
      const reviewed = await reviewInventoryProduct(session, id, payload.action, note);
      if (!reviewed) {
        return NextResponse.json({ error: "This product is no longer waiting for owner review." }, { status: 409 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Choose a valid inventory action." }, { status: 400 });
  } catch (error) {
    if (error instanceof BackendNotConfiguredError) {
      return NextResponse.json({ error: "Inventory services are not configured yet." }, { status: 503 });
    }
    return NextResponse.json({ error: "The stock item could not be updated." }, { status: 503 });
  }
}

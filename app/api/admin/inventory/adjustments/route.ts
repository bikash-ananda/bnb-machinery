import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/src/db/client";
import { stockLocations } from "@/src/modules/inventory/schema";
import { adjustStock } from "@/src/modules/inventory/adjust";
import { adminApi, fail, UUID } from "@/lib/server/admin-api";
import { logAudit } from "@/lib/server/admin-auth";
import { toPaisa } from "@/src/lib/money";

export const runtime = "nodejs";

const QUANTITY = /^-?\d+(?:\.\d{1,3})?$/;
const COST = /^\d+(?:\.\d{1,2})?$/;
const ADJUSTERS = new Set(["SUPER_ADMIN", "BUSINESS_OWNER", "MANAGER", "INVENTORY_MANAGER"]);

export async function POST(request: Request) {
  const guard = await adminApi(request, "inventory");
  if ("error" in guard) return guard.error;
  if (!ADJUSTERS.has(guard.session.role)) return fail("Only an inventory manager or business manager can post stock adjustments.", 403);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fail("Invalid request.");
    body = parsed as Record<string, unknown>;
  } catch { return fail("Invalid request."); }

  if (typeof body.productId !== "string" || !UUID.test(body.productId) ||
      typeof body.locationId !== "string" || !UUID.test(body.locationId) ||
      (body.reason !== "OPENING" && body.reason !== "COUNT") ||
      typeof body.qty !== "string" || !QUANTITY.test(body.qty) ||
      typeof body.note !== "string" || body.note.trim().length < 3 || body.note.trim().length > 500) {
    return fail("Enter a product, location, valid quantity and a note of 3 to 500 characters.");
  }
  const note = (body.note as string).trim();

  const qty = Number(body.qty);
  if (!Number.isFinite(qty) || qty === 0 || Math.abs(qty) > 1_000_000 || (body.reason === "OPENING" && qty < 0)) {
    return fail("Quantity must be non-zero, at most 1,000,000 and opening stock must be positive.");
  }

  let unitCostPaisa: bigint | undefined;
  if (body.unitCost !== undefined && body.unitCost !== null && body.unitCost !== "") {
    if (typeof body.unitCost !== "string" || !COST.test(body.unitCost)) return fail("Unit cost must be a non-negative amount with up to two decimal places.");
    try { unitCostPaisa = toPaisa(body.unitCost); } catch { return fail("Invalid unit cost."); }
    if (unitCostPaisa > 100_000_000_000n) return fail("Unit cost is outside the allowed range.");
  }
  if (body.reason === "OPENING" && unitCostPaisa === undefined) return fail("Opening stock requires a unit cost.");

  try {
    const [selectedLocation] = await db.select({ id: stockLocations.id }).from(stockLocations).where(eq(stockLocations.id, body.locationId)).limit(1);
    if (!selectedLocation) return fail("Stock location not found.", 404);

    await db.transaction((tx) => adjustStock(tx, {
      productId: body.productId as string,
      locationId: body.locationId as string,
      qty,
      reason: body.reason as "OPENING" | "COUNT",
      unitCostPaisa,
      note,
      createdBy: guard.session.email,
    }));
    await logAudit(guard.session, "inventory.adjustment.post", "product", body.productId, {
      locationId: body.locationId, reason: body.reason, qty, unitCostPaisa: unitCostPaisa?.toString() ?? null, note,
    }, request);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const expected = [
      "Quantity must be non-zero.",
      "Opening stock needs a positive quantity and a unit cost.",
      "Set a cost for this product before correcting stock.",
      "Stock cannot go below zero.",
      "This correction would reduce stock below the quantity reserved for orders.",
      "Product not found.",
    ];
    if (expected.includes(message)) return fail(message, 409);
    console.error("inventory adjustment failed", error);
    return fail("Could not post the adjustment. Check the stock and accounting setup, then retry.", 503);
  }
}

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/src/db/client";
import { products } from "@/src/modules/catalog/schema";
import { stockBalances, stockLocations, stockMovements, stockReservations } from "./schema";

export type InventoryRow = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  model: string | null;
  unit: string;
  reorderLevel: number;
  costPaisa: string | null;
  pricePaisa: string | null;
  trackStock: boolean;
  onHand: number;
  reserved: number;
};

export type InventoryLocation = { id: string; code: string; name: string; isDefault: boolean };
export type InventoryMovement = { id: number; name: string; sku: string; location: string; qty: number; type: string; note: string | null; createdBy: string | null; createdAt: string };

/** Aggregate each ledger table before joining it to products, so reservations cannot multiply balances. */
export async function listInventory() {
  const [items, locations, recentMovements] = await Promise.all([
    db.select({
      id: products.id,
      sku: products.sku,
      barcode: products.barcode,
      name: products.nameEn,
      model: products.model,
      unit: products.unit,
      reorderLevel: products.reorderLevel,
      costPaisa: products.costPaisa,
      pricePaisa: products.pricePaisa,
      trackStock: products.trackStock,
    }).from(products).orderBy(asc(products.nameEn)).limit(500),
    db.select({ id: stockLocations.id, code: stockLocations.code, name: stockLocations.name, isDefault: stockLocations.isDefault })
      .from(stockLocations).orderBy(desc(stockLocations.isDefault), asc(stockLocations.name)),
    db.select({
      id: stockMovements.id,
      name: products.nameEn,
      sku: products.sku,
      location: stockLocations.name,
      qty: stockMovements.qty,
      type: stockMovements.type,
      note: stockMovements.note,
      createdBy: stockMovements.createdBy,
      createdAt: stockMovements.createdAt,
    }).from(stockMovements)
      .innerJoin(products, eq(products.id, stockMovements.productId))
      .innerJoin(stockLocations, eq(stockLocations.id, stockMovements.locationId))
      .orderBy(desc(stockMovements.createdAt)).limit(50),
  ]);

  const ids = items.map((item) => item.id);
  const movements: InventoryMovement[] = recentMovements.map((movement) => ({
    ...movement,
    createdAt: movement.createdAt.toISOString(),
  }));
  if (ids.length === 0) return { items: [] as InventoryRow[], locations, movements };
  const [balances, reservations] = await Promise.all([
    db.select({ productId: stockBalances.productId, qty: sql<string>`coalesce(sum(${stockBalances.onHand}), 0)` })
      .from(stockBalances).where(inArray(stockBalances.productId, ids)).groupBy(stockBalances.productId),
    db.select({ productId: stockReservations.productId, qty: sql<string>`coalesce(sum(${stockReservations.qty}), 0)` })
      .from(stockReservations).where(and(eq(stockReservations.status, "ACTIVE"), inArray(stockReservations.productId, ids))).groupBy(stockReservations.productId),
  ]);
  const onHandById = new Map(balances.map((row) => [row.productId, Number(row.qty)]));
  const reservedById = new Map(reservations.map((row) => [row.productId, Number(row.qty)]));

  return {
    items: items.map((item) => ({
      ...item,
      costPaisa: item.costPaisa?.toString() ?? null,
      pricePaisa: item.pricePaisa?.toString() ?? null,
      onHand: onHandById.get(item.id) ?? 0,
      reserved: reservedById.get(item.id) ?? 0,
    })),
    locations,
    movements,
  };
}

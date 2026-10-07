import { and, eq, inArray, sql } from "drizzle-orm";
import type { Tx } from "../../db/client";
import { stockBalances, stockLocations, stockMovements, stockReservations } from "./schema";

export class InsufficientStockError extends Error {
  constructor(public productId: string, public available: number, message?: string) {
    super(message ?? "Not enough stock available.");
  }
}

export type MovementType =
  | "OPENING" | "PURCHASE" | "SALE" | "ADJUSTMENT" | "RETURN_IN" | "RETURN_OUT" | "TRANSFER_IN" | "TRANSFER_OUT";

const pgCode = (e: unknown) => {
  const x = e as { code?: string; cause?: { code?: string } };
  return x.code ?? x.cause?.code;
};

export async function defaultLocationId(tx: Tx): Promise<string> {
  const [loc] = await tx.select({ id: stockLocations.id }).from(stockLocations).where(eq(stockLocations.isDefault, true)).limit(1);
  if (!loc) throw new Error("No default stock location. Run: pnpm db:seed");
  return loc.id;
}

/** The ONLY way stock changes. Appends a ledger row and updates the balance in the same transaction. */
export async function postMovement(
  tx: Tx,
  m: { productId: string; qty: number; type: MovementType; locationId?: string; refType?: string; refId?: string; note?: string; createdBy?: string },
) {
  if (!Number.isFinite(m.qty) || m.qty === 0) throw new Error("Movement quantity must be a non-zero number.");
  const locationId = m.locationId ?? (await defaultLocationId(tx));
  await tx.insert(stockMovements).values({
    productId: m.productId, locationId, qty: m.qty, type: m.type,
    refType: m.refType ?? null, refId: m.refId ?? null, note: m.note ?? null, createdBy: m.createdBy ?? null,
  });
  try {
    await tx
      .insert(stockBalances)
      .values({ productId: m.productId, locationId, onHand: m.qty })
      .onConflictDoUpdate({
        target: [stockBalances.productId, stockBalances.locationId],
        set: { onHand: sql`${stockBalances.onHand} + ${m.qty}`, updatedAt: sql`now()` },
      });
  } catch (e) {
    if (pgCode(e) === "23514") throw new InsufficientStockError(m.productId, 0, "Stock cannot go below zero.");
    throw e;
  }
}

/** Reserve stock for an order. Locks balance rows so two buyers cannot take the same last item. */
export async function reserveStock(tx: Tx, orderId: string, items: { productId: string; qty: number }[], locationId?: string) {
  const loc = locationId ?? (await defaultLocationId(tx));
  const merged = new Map<string, number>();
  for (const i of items) merged.set(i.productId, (merged.get(i.productId) ?? 0) + i.qty);
  for (const productId of [...merged.keys()].sort()) {
    const need = merged.get(productId)!;
    const bal = await tx.execute(sql`select on_hand from stock_balances where product_id = ${productId} and location_id = ${loc} for update`);
    const onHand = Number((bal.rows[0] as { on_hand?: string } | undefined)?.on_hand ?? 0);
    const res = await tx.execute(sql`select coalesce(sum(qty), 0) as r from stock_reservations where product_id = ${productId} and location_id = ${loc} and status = 'ACTIVE'`);
    const reserved = Number((res.rows[0] as { r: string }).r);
    const available = onHand - reserved;
    if (available < need) throw new InsufficientStockError(productId, Math.max(0, available));
    await tx.insert(stockReservations).values({ productId, locationId: loc, orderId, qty: need });
  }
}

export async function releaseReservations(tx: Tx, orderId: string) {
  await tx.update(stockReservations).set({ status: "RELEASED" }).where(and(eq(stockReservations.orderId, orderId), eq(stockReservations.status, "ACTIVE")));
}

/** Order confirmed: turn reservations into real SALE movements. */
export async function consumeReservations(tx: Tx, orderId: string, createdBy?: string) {
  const rows = await tx.select().from(stockReservations).where(and(eq(stockReservations.orderId, orderId), eq(stockReservations.status, "ACTIVE")));
  for (const r of rows) {
    await postMovement(tx, { productId: r.productId, locationId: r.locationId, qty: -r.qty, type: "SALE", refType: "order", refId: orderId, createdBy });
    await tx.update(stockReservations).set({ status: "CONSUMED" }).where(eq(stockReservations.id, r.id));
  }
}

/** Sellable quantity per product = on hand - active reservations. */
export async function getAvailability(tx: Tx, productIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>(productIds.map((id) => [id, 0]));
  if (productIds.length === 0) return out;
  const bal = await tx.select({ productId: stockBalances.productId, onHand: sql<string>`sum(${stockBalances.onHand})` }).from(stockBalances).where(inArray(stockBalances.productId, productIds)).groupBy(stockBalances.productId);
  for (const b of bal) out.set(b.productId, Number(b.onHand));
  const res = await tx.select({ productId: stockReservations.productId, r: sql<string>`sum(${stockReservations.qty})` }).from(stockReservations).where(and(inArray(stockReservations.productId, productIds), eq(stockReservations.status, "ACTIVE"))).groupBy(stockReservations.productId);
  for (const r of res) out.set(r.productId, (out.get(r.productId) ?? 0) - Number(r.r));
  return out;
}

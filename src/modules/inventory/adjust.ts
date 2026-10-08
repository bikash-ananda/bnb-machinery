import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { Tx } from "../../db/client";
import { lineTotal } from "../../lib/money";
import { ACC, postJournal } from "../accounting/posting";
import { products } from "../catalog/schema";
import { weightedAverage } from "./costing";
import { stockBalances } from "./schema";
import { postMovement } from "./service";

/**
 * Opening stock / stock-count correction. Updates the stock ledger AND the accounts together.
 * OPENING: Dr Inventory / Cr Owner's Capital.  COUNT: gain Dr Inventory / Cr Stock Adjustments, loss the reverse.
 */
export async function adjustStock(
  tx: Tx,
  a: { productId: string; qty: number; reason: "OPENING" | "COUNT"; unitCostPaisa?: bigint; note?: string; createdBy?: string },
) {
  if (!Number.isFinite(a.qty) || a.qty === 0) throw new Error("Quantity must be non-zero.");
  await tx.execute(sql`select 1 from products where id = ${a.productId} for update`);
  const [p] = await tx.select().from(products).where(eq(products.id, a.productId));
  if (!p) throw new Error("Product not found.");
  let cost = a.unitCostPaisa ?? p.costPaisa;

  if (a.reason === "OPENING") {
    if (a.qty < 0 || cost === null || cost === undefined) throw new Error("Opening stock needs a positive quantity and a unit cost.");
    const [bal] = await tx.select({ s: sql<string>`coalesce(sum(${stockBalances.onHand}), 0)` }).from(stockBalances).where(eq(stockBalances.productId, a.productId));
    cost = weightedAverage(Number(bal.s), p.costPaisa, a.qty, cost);
    await tx.update(products).set({ costPaisa: cost, trackStock: true }).where(eq(products.id, a.productId));
  }
  if (cost === null || cost === undefined) throw new Error("Set a cost for this product before correcting stock.");

  await postMovement(tx, { productId: a.productId, qty: a.qty, type: a.reason === "OPENING" ? "OPENING" : "ADJUSTMENT", refType: "adjustment", note: a.note, createdBy: a.createdBy });

  const value = lineTotal(Math.abs(a.qty), a.unitCostPaisa ?? cost);
  const gain = a.qty > 0;
  await postJournal(tx, {
    sourceType: "stock_adjustment", sourceId: randomUUID(), createdBy: a.createdBy,
    narration: `${a.reason === "OPENING" ? "Opening stock" : "Stock count adjustment"} - ${p.nameEn}`,
    lines: a.reason === "OPENING"
      ? [{ code: ACC.INVENTORY, debit: value }, { code: "3010", credit: value }]
      : gain
        ? [{ code: ACC.INVENTORY, debit: value }, { code: "5020", credit: value }]
        : [{ code: "5020", debit: value }, { code: ACC.INVENTORY, credit: value }],
  });
}

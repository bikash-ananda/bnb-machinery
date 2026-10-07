import { sql } from "drizzle-orm";
import { bigserial, boolean, check, index, numeric, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "../../db/columns";
import { products } from "../catalog/schema";

const qty = (name: string) => numeric(name, { precision: 14, scale: 3, mode: "number" });

export const stockLocations = pgTable("stock_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
});

/** Append-only ledger. Stock changes ONLY through inventory.postMovement(). */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    productId: uuid("product_id").notNull().references(() => products.id),
    locationId: uuid("location_id").notNull().references(() => stockLocations.id),
    qty: qty("qty").notNull(),
    type: text("type").notNull(),
    refType: text("ref_type"),
    refId: text("ref_id"),
    note: text("note"),
    createdBy: text("created_by"),
    createdAt: createdAt(),
  },
  (t) => [
    index("stock_mov_product_idx").on(t.productId, t.locationId),
    index("stock_mov_ref_idx").on(t.refType, t.refId),
    check("stock_mov_qty_nonzero", sql`${t.qty} <> 0`),
  ],
);

export const stockBalances = pgTable(
  "stock_balances",
  {
    productId: uuid("product_id").notNull().references(() => products.id),
    locationId: uuid("location_id").notNull().references(() => stockLocations.id),
    onHand: qty("on_hand").notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.productId, t.locationId] }), check("stock_on_hand_nonneg", sql`${t.onHand} >= 0`)],
);

export const stockReservations = pgTable(
  "stock_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").notNull().references(() => products.id),
    locationId: uuid("location_id").notNull().references(() => stockLocations.id),
    orderId: uuid("order_id").notNull(),
    qty: qty("qty").notNull(),
    status: text("status").notNull().default("ACTIVE"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("stock_res_product_idx").on(t.productId, t.status), index("stock_res_order_idx").on(t.orderId)],
);

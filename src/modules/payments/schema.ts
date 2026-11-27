import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { paisa } from "../../db/columns";
import { orders } from "../sales/schema";

// Mirrors drizzle/0010_manual_payments.sql (hand-written migration, same as 0008/0009).
// method: QR | BANK | ESEWA | KHALTI      status: PENDING | VERIFIED | REJECTED

/** Bank / wallet accounts the owner edits from the admin panel. The QR image is stored as base64 text. */
export const paymentAccounts = pgTable(
  "payment_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    label: text("label").notNull(),
    method: text("method").notNull().default("QR"),
    payeeName: text("payee_name").notNull(),
    accountNo: text("account_no"),
    instructions: text("instructions"),
    qrMime: text("qr_mime"),
    qrData: text("qr_data"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    updatedBy: text("updated_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("payment_accounts_method_check", sql`${t.method} in ('QR','BANK','ESEWA','KHALTI')`),
    check("payment_accounts_label_check", sql`length(trim(${t.label})) between 2 and 60`),
  ],
);

/** A customer's claim "I paid, my transaction reference is X". Staff verify it against the real bank/wallet before money is recorded. */
export const paymentSubmissions = pgTable(
  "payment_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id),
    accountId: uuid("account_id").references(() => paymentAccounts.id),
    method: text("method").notNull(),
    txnId: text("txn_id").notNull(),
    status: text("status").notNull().default("PENDING"),
    receivedPaisa: paisa("received_paisa"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rejectReason: text("reject_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("payment_sub_status_check", sql`${t.status} in ('PENDING','VERIFIED','REJECTED')`),
    check("payment_sub_method_check", sql`${t.method} in ('QR','BANK','ESEWA','KHALTI')`),
    uniqueIndex("payment_sub_txn_uq").on(t.txnId).where(sql`${t.status} in ('PENDING','VERIFIED')`),
    index("payment_sub_order_idx").on(t.orderId),
    index("payment_sub_queue_idx").on(t.status, t.createdAt),
  ],
);

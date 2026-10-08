import { date, index, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { createdAt, paisa } from "../../db/columns";
import { products } from "../catalog/schema";

const qty = (name: string) => numeric(name, { precision: 14, scale: 3, mode: "number" });

export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  panNo: text("pan_no"),
  createdAt: createdAt(),
});

/** Supplier bill. The same supplier invoice number can only be entered once. */
export const purchaseBills = pgTable(
  "purchase_bills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    billNo: text("bill_no").notNull().unique(),
    fiscalYear: text("fiscal_year").notNull(),
    supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
    supplierInvoiceNo: text("supplier_invoice_no").notNull(),
    supplierInvoiceDate: date("supplier_invoice_date", { mode: "string" }).notNull(),
    bsDate: text("bs_date").notNull(),
    netPaisa: paisa("net_paisa").notNull(),
    vatPaisa: paisa("vat_paisa").notNull(),
    totalPaisa: paisa("total_paisa").notNull(),
    status: text("status").notNull().default("POSTED"),
    createdBy: text("created_by"),
    createdAt: createdAt(),
  },
  (t) => [unique("pb_supplier_invoice_uq").on(t.supplierId, t.supplierInvoiceNo), index("pb_fy_idx").on(t.fiscalYear)],
);

export const purchaseBillItems = pgTable("purchase_bill_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  billId: uuid("bill_id").notNull().references(() => purchaseBills.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  qty: qty("qty").notNull(),
  unitPaisa: paisa("unit_paisa").notNull(),
  taxCategory: text("tax_category").notNull().default("STANDARD"),
  netPaisa: paisa("net_paisa").notNull(),
  vatPaisa: paisa("vat_paisa").notNull(),
});

export const supplierPayments = pgTable("supplier_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
  billId: uuid("bill_id").references(() => purchaseBills.id),
  method: text("method").notNull(),
  amountPaisa: paisa("amount_paisa").notNull(),
  reference: text("reference"),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: text("created_by"),
});

import { index, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { createdAt, paisa } from "../../db/columns";
import { products } from "../catalog/schema";
import { customers } from "../customers/schema";

const qty = (name: string) => numeric(name, { precision: 14, scale: 3, mode: "number" });
const zero = () => BigInt(0);

// status: NEW | CONFIRMED | PACKED | DISPATCHED | READY_FOR_PICKUP | COMPLETED | CANCELLED
// channel: WEB | POS | WHATSAPP | PHONE      paymentStatus: UNPAID | PARTIAL | PAID | REFUNDED
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNo: text("order_no").notNull().unique(),
    channel: text("channel").notNull().default("WEB"),
    status: text("status").notNull().default("NEW"),
    customerId: uuid("customer_id").references(() => customers.id),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    address: text("address"),
    district: text("district"),
    deliveryMethod: text("delivery_method").notNull().default("delivery"),
    paymentMethod: text("payment_method").notNull().default("cod"),
    paymentStatus: text("payment_status").notNull().default("UNPAID"),
    subtotalPaisa: paisa("subtotal_paisa").notNull().default(zero()),
    discountPaisa: paisa("discount_paisa").notNull().default(zero()),
    vatPaisa: paisa("vat_paisa").notNull().default(zero()),
    totalPaisa: paisa("total_paisa").notNull().default(zero()),
    unpricedItems: integer("unpriced_items").notNull().default(0),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("orders_status_idx").on(t.status), index("orders_phone_idx").on(t.phone)],
);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  qty: qty("qty").notNull(),
  unitPaisa: paisa("unit_paisa").notNull(),
  discountPaisa: paisa("discount_paisa").notNull().default(zero()),
  vatRateBp: integer("vat_rate_bp").notNull().default(0),
  vatPaisa: paisa("vat_paisa").notNull().default(zero()),
  linePaisa: paisa("line_paisa").notNull(),
});

/** Gapless numbering per fiscal year: bump lastSeq inside the same transaction as the document insert. */
export const documentSequences = pgTable(
  "document_sequences",
  {
    key: text("key").notNull(),
    fiscalYear: text("fiscal_year").notNull(),
    lastSeq: integer("last_seq").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.fiscalYear] })],
);

// Issued invoices are immutable (DB trigger). Corrections = credit note + new invoice.
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fiscalYear: text("fiscal_year").notNull(),
    seqNo: integer("seq_no").notNull(),
    invoiceNo: text("invoice_no").notNull().unique(),
    orderId: uuid("order_id").references(() => orders.id),
    customerId: uuid("customer_id").references(() => customers.id),
    buyer: jsonb("buyer").$type<{ name: string; phone?: string; address?: string; panNo?: string }>().notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    bsDate: text("bs_date").notNull(),
    subtotalPaisa: paisa("subtotal_paisa").notNull(),
    discountPaisa: paisa("discount_paisa").notNull().default(zero()),
    taxablePaisa: paisa("taxable_paisa").notNull(),
    vatPaisa: paisa("vat_paisa").notNull(),
    totalPaisa: paisa("total_paisa").notNull(),
    status: text("status").notNull().default("ISSUED"),
    createdBy: text("created_by"),
  },
  (t) => [unique("invoices_fy_seq_uq").on(t.fiscalYear, t.seqNo)],
);

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id),
  productId: uuid("product_id").references(() => products.id),
  sku: text("sku"),
  name: text("name").notNull(),
  qty: qty("qty").notNull(),
  unitPaisa: paisa("unit_paisa").notNull(),
  discountPaisa: paisa("discount_paisa").notNull().default(zero()),
  vatRateBp: integer("vat_rate_bp").notNull().default(0),
  vatPaisa: paisa("vat_paisa").notNull().default(zero()),
  linePaisa: paisa("line_paisa").notNull(),
});

// method: CASH | CARD | QR | ESEWA | KHALTI | BANK | CREDIT
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id),
    invoiceId: uuid("invoice_id").references(() => invoices.id),
    method: text("method").notNull(),
    amountPaisa: paisa("amount_paisa").notNull(),
    reference: text("reference"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: text("created_by"),
  },
  (t) => [index("payments_order_idx").on(t.orderId)],
);

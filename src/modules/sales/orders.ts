import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db, type Tx } from "../../db/client";
import { adToBs, fiscalYearOfAd, nepalToday, toIso } from "../../lib/dates-bs";
import { postInvoiceCogs, postInvoiceSale, postPayment } from "../accounting/posting";
import { products } from "../catalog/schema";
import { customers } from "../customers/schema";
import { InsufficientStockError, consumeReservations, releaseReservations, reserveStock } from "../inventory/service";
import { nextSeq } from "./numbering";
import { priceLine, type TaxCategory } from "./pricing";
import { invoiceItems, invoices, orderItems, orders, payments } from "./schema";

export class OrderError extends Error {}

export type OrderLineInput = { slug?: string; productId?: string; qty: number; discountBp?: number; unitPaisa?: bigint };
export type NewOrderInput = {
  channel?: "WEB" | "POS" | "WHATSAPP" | "PHONE";
  customer: { name: string; phone?: string; email?: string; address?: string; district?: string; panNo?: string };
  delivery: "delivery" | "pickup";
  payment: "cod" | "shop" | "digital";
  note?: string;
  items: OrderLineInput[];
  createdBy?: string;
};

/** Creates the order, finds or creates the customer by phone, prices every line (tax + discount) and reserves stock. */
export async function createOrderTx(tx: Tx, input: NewOrderInput) {
  if (input.items.length === 0) throw new OrderError("Cart is empty.");
  for (const it of input.items) {
    if (!Number.isFinite(it.qty) || it.qty <= 0 || it.qty > 9999) throw new OrderError("Invalid quantity.");
    if (it.discountBp !== undefined && (!Number.isInteger(it.discountBp) || it.discountBp < 0 || it.discountBp > 10000)) throw new OrderError("Invalid discount.");
    if (!it.slug && !it.productId) throw new OrderError("Invalid item.");
  }
  const web = (input.channel ?? "WEB") === "WEB";
  const slugs = [...new Set(input.items.map((i) => i.slug).filter((x): x is string => !!x))];
  const ids = [...new Set(input.items.map((i) => i.productId).filter((x): x is string => !!x))];
  const conds: ReturnType<typeof inArray>[] = [];
  if (slugs.length) conds.push(inArray(products.slug, slugs));
  if (ids.length) conds.push(inArray(products.id, ids));
  const rows = await tx.select().from(products).where(web ? and(or(...conds), eq(products.isPublished, true)) : or(...conds));
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const byId = new Map(rows.map((r) => [r.id, r]));

  const lines = input.items.map((it) => {
    const p = (it.productId ? byId.get(it.productId) : undefined) ?? (it.slug ? bySlug.get(it.slug) : undefined);
    if (!p) throw new OrderError("An item is no longer available.");
    const unit = it.unitPaisa ?? p.pricePaisa;
    const calc = unit !== null && unit !== undefined
      ? priceLine({ qty: it.qty, unitPaisa: unit, taxCategory: p.taxCategory as TaxCategory, priceIncludesVat: p.priceIncludesVat, discountBp: it.discountBp })
      : null;
    return { p, qty: it.qty, unit: unit ?? 0n, priced: calc !== null, calc: calc ?? { netPaisa: 0n, vatPaisa: 0n, totalPaisa: 0n, vatRateBp: 0, discountPaisa: 0n } };
  });
  const sum = (f: (l: (typeof lines)[number]) => bigint) => lines.reduce((a, l) => a + f(l), 0n);
  const net = sum((l) => l.calc.netPaisa), vat = sum((l) => l.calc.vatPaisa), total = sum((l) => l.calc.totalPaisa), disc = sum((l) => l.calc.discountPaisa);
  const unpriced = lines.filter((l) => !l.priced).length;

  const name = input.customer.name?.trim() || "Walk-in customer";
  const phone = (input.customer.phone ?? "").replace(/[^\d+]/g, "");
  let customerId: string | null = null;
  if (phone) {
    await tx.insert(customers).values({ name, phone, email: input.customer.email || null, address: input.customer.address || null, district: input.customer.district || null, panNo: input.customer.panNo || null }).onConflictDoNothing();
    const [c] = await tx.select().from(customers).where(eq(customers.phone, phone)).limit(1);
    customerId = c?.id ?? null;
    if (c && input.customer.panNo && !c.panNo) await tx.update(customers).set({ panNo: input.customer.panNo }).where(eq(customers.id, c.id));
  }

  const t = nepalToday();
  const day = String(t.year).slice(2) + String(t.month).padStart(2, "0") + String(t.day).padStart(2, "0");
  const orderNo = `MTN-${day}-${String(await nextSeq(tx, "order", day)).padStart(4, "0")}`;

  const [order] = await tx.insert(orders).values({
    orderNo, channel: input.channel ?? "WEB", customerId, customerName: name, phone,
    email: input.customer.email || null, address: input.customer.address || null, district: input.customer.district || null,
    deliveryMethod: input.delivery, paymentMethod: input.payment,
    subtotalPaisa: net, discountPaisa: disc, vatPaisa: vat, totalPaisa: total, unpricedItems: unpriced, note: input.note || null,
  }).returning({ id: orders.id });

  await tx.insert(orderItems).values(lines.map((l) => ({
    orderId: order.id, productId: l.p.id, sku: l.p.sku, name: l.p.nameEn, qty: l.qty,
    unitPaisa: l.unit, discountPaisa: l.calc.discountPaisa, taxCategory: l.p.taxCategory,
    vatRateBp: l.calc.vatRateBp, vatPaisa: l.calc.vatPaisa, linePaisa: l.calc.totalPaisa,
  })));

  const tracked = lines.filter((l) => l.p.trackStock);
  try {
    if (tracked.length) await reserveStock(tx, order.id, tracked.map((l) => ({ productId: l.p.id, qty: l.qty })));
  } catch (e) {
    if (e instanceof InsufficientStockError) {
      const nm = lines.find((l) => l.p.id === e.productId)?.p.nameEn ?? "item";
      throw new InsufficientStockError(e.productId, e.available, `Only ${e.available} of "${nm}" in stock.`);
    }
    throw e;
  }
  return { id: order.id, orderNo, customerId, totalPaisa: total, unpriced };
}
export const createOrder = (input: NewOrderInput) => db.transaction((tx) => createOrderTx(tx, input));

async function issueInvoice(tx: Tx, orderId: string, createdBy?: string) {
  const [o] = await tx.select().from(orders).where(eq(orders.id, orderId));
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const [cust] = o.customerId ? await tx.select().from(customers).where(eq(customers.id, o.customerId)) : [];
  const today = nepalToday();
  const fy = fiscalYearOfAd(today).label;
  const seq = await nextSeq(tx, "invoice", fy);
  const netOf = (i: (typeof items)[number]) => i.linePaisa - i.vatPaisa;
  const net = items.reduce((a, i) => a + netOf(i), 0n);
  const vat = items.reduce((a, i) => a + i.vatPaisa, 0n);
  const [inv] = await tx.insert(invoices).values({
    fiscalYear: fy, seqNo: seq, invoiceNo: `INV-${fy.replace("/", "-")}-${String(seq).padStart(5, "0")}`,
    orderId, customerId: o.customerId,
    buyer: { name: o.customerName, phone: o.phone || undefined, address: o.address ?? cust?.address ?? undefined, panNo: cust?.panNo ?? undefined },
    bsDate: toIso(adToBs(today)),
    subtotalPaisa: net, discountPaisa: items.reduce((a, i) => a + i.discountPaisa, 0n),
    taxablePaisa: items.filter((i) => i.taxCategory === "STANDARD").reduce((a, i) => a + netOf(i), 0n),
    vatPaisa: vat, totalPaisa: net + vat, createdBy: createdBy ?? null,
  }).returning();
  await tx.insert(invoiceItems).values(items.map((i) => ({
    invoiceId: inv.id, productId: i.productId, sku: i.sku, name: i.name, qty: i.qty, unitPaisa: i.unitPaisa,
    discountPaisa: i.discountPaisa, taxCategory: i.taxCategory, vatRateBp: i.vatRateBp, vatPaisa: i.vatPaisa, linePaisa: i.linePaisa,
  })));
  return inv;
}

/** One action: stock leaves the ledger, the invoice is issued and the accounts are posted. Safe to call twice. */
export async function confirmOrderTx(tx: Tx, orderId: string, createdBy?: string) {
  const locked = await tx.execute(sql`select status, unpriced_items from orders where id = ${orderId} for update`);
  const row = locked.rows[0] as { status: string; unpriced_items: number } | undefined;
  if (!row) throw new OrderError("Order not found.");
  if (row.status === "CANCELLED") throw new OrderError("Order is cancelled.");
  const [existing] = await tx.select().from(invoices).where(eq(invoices.orderId, orderId)).limit(1);
  if (existing) return existing;
  if (row.unpriced_items > 0) throw new OrderError("Set prices for all items before confirming.");
  await consumeReservations(tx, orderId, createdBy);
  await tx.update(orders).set({ status: "CONFIRMED" }).where(eq(orders.id, orderId));
  const inv = await issueInvoice(tx, orderId, createdBy);
  await postInvoiceSale(tx, inv.id, createdBy);
  await postInvoiceCogs(tx, inv.id, createdBy);
  return inv;
}
export const confirmOrder = (orderId: string, createdBy?: string) => db.transaction((tx) => confirmOrderTx(tx, orderId, createdBy));

export async function cancelOrder(orderId: string) {
  return db.transaction(async (tx) => {
    const locked = await tx.execute(sql`select status from orders where id = ${orderId} for update`);
    const row = locked.rows[0] as { status: string } | undefined;
    if (!row) throw new OrderError("Order not found.");
    if (row.status !== "NEW") throw new OrderError("Only new orders can be cancelled. Use a credit note after invoicing.");
    await releaseReservations(tx, orderId);
    await tx.update(orders).set({ status: "CANCELLED" }).where(eq(orders.id, orderId));
  });
}

export async function recordPaymentTx(tx: Tx, orderId: string, method: string, amountPaisa: bigint, reference?: string, createdBy?: string) {
  const [pay] = await tx.insert(payments).values({ orderId, method, amountPaisa, reference: reference ?? null, createdBy: createdBy ?? null }).returning({ id: payments.id });
  await postPayment(tx, pay.id, createdBy);
  const [o] = await tx.select({ total: orders.totalPaisa }).from(orders).where(eq(orders.id, orderId));
  const [s] = await tx.select({ s: sql<string>`coalesce(sum(${payments.amountPaisa}), 0)` }).from(payments).where(eq(payments.orderId, orderId));
  const paid = BigInt(s.s);
  const status = paid >= o.total ? "PAID" : paid > 0n ? "PARTIAL" : "UNPAID";
  await tx.update(orders).set({ paymentStatus: status }).where(eq(orders.id, orderId));
  return status;
}
export const recordPayment = (orderId: string, method: string, amountPaisa: bigint, reference?: string, createdBy?: string) =>
  db.transaction((tx) => recordPaymentTx(tx, orderId, method, amountPaisa, reference, createdBy));

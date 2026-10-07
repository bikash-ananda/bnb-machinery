import { and, eq, inArray, sql } from "drizzle-orm";
import { db, type Tx } from "../../db/client";
import { adToBs, fiscalYearOfAd, nepalToday, toIso } from "../../lib/dates-bs";
import { products } from "../catalog/schema";
import { customers } from "../customers/schema";
import { InsufficientStockError, consumeReservations, releaseReservations, reserveStock } from "../inventory/service";
import { nextSeq } from "./numbering";
import { priceLine, type TaxCategory } from "./pricing";
import { postInvoiceCogs, postInvoiceSale, postPayment } from "../accounting/posting";
import { invoiceItems, invoices, orderItems, orders, payments } from "./schema";

export class OrderError extends Error {}

export type NewOrderInput = {
  channel?: "WEB" | "POS" | "WHATSAPP" | "PHONE";
  customer: { name: string; phone: string; email?: string; address?: string; district?: string };
  delivery: "delivery" | "pickup";
  payment: "cod" | "shop" | "digital";
  note?: string;
  items: { slug: string; qty: number }[];
  createdBy?: string;
};

export async function createOrder(input: NewOrderInput) {
  const wanted = new Map<string, number>();
  for (const it of input.items) {
    if (!Number.isFinite(it.qty) || it.qty <= 0 || it.qty > 999) throw new OrderError("Invalid quantity.");
    wanted.set(it.slug, (wanted.get(it.slug) ?? 0) + it.qty);
  }
  if (wanted.size === 0) throw new OrderError("Cart is empty.");

  return db.transaction(async (tx) => {
    const rows = await tx.select().from(products).where(and(inArray(products.slug, [...wanted.keys()]), eq(products.isPublished, true)));
    if (rows.length !== wanted.size) throw new OrderError("An item is no longer available.");

    const lines = rows.map((p) => {
      const qty = wanted.get(p.slug)!;
      const priced = p.pricePaisa !== null;
      const calc = priced
        ? priceLine({ qty, unitPaisa: p.pricePaisa!, taxCategory: p.taxCategory as TaxCategory, priceIncludesVat: p.priceIncludesVat })
        : { netPaisa: 0n, vatPaisa: 0n, totalPaisa: 0n, vatRateBp: 0 };
      return { p, qty, priced, calc };
    });
    const net = lines.reduce((a, l) => a + l.calc.netPaisa, 0n);
    const vat = lines.reduce((a, l) => a + l.calc.vatPaisa, 0n);
    const total = lines.reduce((a, l) => a + l.calc.totalPaisa, 0n);
    const unpriced = lines.filter((l) => !l.priced).length;

    const phone = input.customer.phone.replace(/[^\d+]/g, "");
    let customerId: string | null = null;
    if (phone) {
      await tx.insert(customers).values({ name: input.customer.name, phone, email: input.customer.email || null, address: input.customer.address || null, district: input.customer.district || null }).onConflictDoNothing();
      const [c] = await tx.select({ id: customers.id }).from(customers).where(eq(customers.phone, phone)).limit(1);
      customerId = c?.id ?? null;
    }

    const t = nepalToday();
    const day = String(t.year).slice(2) + String(t.month).padStart(2, "0") + String(t.day).padStart(2, "0");
    const orderNo = `MTN-${day}-${String(await nextSeq(tx, "order", day)).padStart(4, "0")}`;

    const [order] = await tx.insert(orders).values({
      orderNo, channel: input.channel ?? "WEB", customerId,
      customerName: input.customer.name, phone, email: input.customer.email || null,
      address: input.customer.address || null, district: input.customer.district || null,
      deliveryMethod: input.delivery, paymentMethod: input.payment,
      subtotalPaisa: net, vatPaisa: vat, totalPaisa: total, unpricedItems: unpriced, note: input.note || null,
    }).returning({ id: orders.id });

    await tx.insert(orderItems).values(lines.map((l) => ({
      orderId: order.id, productId: l.p.id, sku: l.p.sku, name: l.p.nameEn, qty: l.qty,
      unitPaisa: l.p.pricePaisa ?? 0n, taxCategory: l.p.taxCategory, vatRateBp: l.calc.vatRateBp, vatPaisa: l.calc.vatPaisa, linePaisa: l.calc.totalPaisa,
    })));

    const tracked = lines.filter((l) => l.p.trackStock);
    try {
      if (tracked.length) await reserveStock(tx, order.id, tracked.map((l) => ({ productId: l.p.id, qty: l.qty })));
    } catch (e) {
      if (e instanceof InsufficientStockError) {
        const name = lines.find((l) => l.p.id === e.productId)?.p.nameEn ?? "item";
        throw new InsufficientStockError(e.productId, e.available, `Only ${e.available} of "${name}" in stock.`);
      }
      throw e;
    }
    return { id: order.id, orderNo, totalPaisa: total, unpriced };
  });
}

async function issueInvoice(tx: Tx, orderId: string, createdBy?: string) {
  const [o] = await tx.select().from(orders).where(eq(orders.id, orderId));
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const today = nepalToday();
  const fy = fiscalYearOfAd(today).label;
  const seq = await nextSeq(tx, "invoice", fy);
  const net = items.reduce((a, i) => a + (i.linePaisa - i.vatPaisa), 0n);
  const vat = items.reduce((a, i) => a + i.vatPaisa, 0n);
  const [inv] = await tx.insert(invoices).values({
    fiscalYear: fy, seqNo: seq, invoiceNo: `INV-${fy.replace("/", "-")}-${String(seq).padStart(5, "0")}`,
    orderId, customerId: o.customerId,
    buyer: { name: o.customerName, phone: o.phone, address: o.address ?? undefined },
    bsDate: toIso(adToBs(today)),
    subtotalPaisa: net, discountPaisa: 0n, taxablePaisa: items.filter((i) => i.taxCategory === "STANDARD").reduce((a, i) => a + (i.linePaisa - i.vatPaisa), 0n), vatPaisa: vat, totalPaisa: net + vat, createdBy: createdBy ?? null,
  }).returning();
  await tx.insert(invoiceItems).values(items.map((i) => ({
    invoiceId: inv.id, productId: i.productId, sku: i.sku, name: i.name, qty: i.qty,
    unitPaisa: i.unitPaisa, discountPaisa: i.discountPaisa, taxCategory: i.taxCategory, vatRateBp: i.vatRateBp, vatPaisa: i.vatPaisa, linePaisa: i.linePaisa,
  })));
  return inv;
}

/** Staff confirms an order: stock leaves the ledger and the invoice is issued, atomically. Safe to call twice. */
export async function confirmOrder(orderId: string, createdBy?: string) {
  return db.transaction(async (tx) => {
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
  });
}

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

export async function recordPayment(orderId: string, method: string, amountPaisa: bigint, reference?: string, createdBy?: string) {
  return db.transaction(async (tx) => {
    const [pay] = await tx.insert(payments).values({ orderId, method, amountPaisa, reference: reference ?? null, createdBy: createdBy ?? null }).returning({ id: payments.id });
    await postPayment(tx, pay.id, createdBy);
    const [o] = await tx.select({ total: orders.totalPaisa }).from(orders).where(eq(orders.id, orderId));
    const [s] = await tx.select({ s: sql<string>`coalesce(sum(${payments.amountPaisa}), 0)` }).from(payments).where(eq(payments.orderId, orderId));
    const paid = BigInt(s.s);
    const status = paid >= o.total ? "PAID" : paid > 0n ? "PARTIAL" : "UNPAID";
    await tx.update(orders).set({ paymentStatus: status }).where(eq(orders.id, orderId));
    return status;
  });
}

import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { invoiceItems, invoices, orderItems, orders, payments } from "./schema";

export type BoardOrder = {
  id: string; orderNo: string; createdAt: string; status: string; paymentStatus: string; channel: string;
  customerName: string; phone: string; address: string | null; deliveryMethod: string; paymentMethod: string;
  totalPaisa: string; paidPaisa: string; unpriced: number; invoiceId: string | null; invoiceNo: string | null;
  items: { name: string; qty: number; linePaisa: string }[];
};

export async function listOrders(limit = 100): Promise<BoardOrder[]> {
  const rows = await db.select({ o: orders, invoiceId: invoices.id, invoiceNo: invoices.invoiceNo })
    .from(orders).leftJoin(invoices, eq(invoices.orderId, orders.id)).orderBy(desc(orders.createdAt)).limit(limit);
  const ids = rows.map((r) => r.o.id);
  const items = ids.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, ids)) : [];
  const paid = ids.length
    ? await db.select({ orderId: payments.orderId, s: sql<string>`sum(${payments.amountPaisa})` }).from(payments).where(inArray(payments.orderId, ids)).groupBy(payments.orderId)
    : [];
  return rows.map(({ o, invoiceId, invoiceNo }) => ({
    id: o.id, orderNo: o.orderNo, createdAt: o.createdAt.toISOString(), status: o.status, paymentStatus: o.paymentStatus, channel: o.channel,
    customerName: o.customerName, phone: o.phone, address: o.address, deliveryMethod: o.deliveryMethod, paymentMethod: o.paymentMethod,
    totalPaisa: o.totalPaisa.toString(), paidPaisa: (paid.find((p) => p.orderId === o.id)?.s ?? "0").split(".")[0], unpriced: o.unpricedItems,
    invoiceId, invoiceNo,
    items: items.filter((i) => i.orderId === o.id).map((i) => ({ name: i.name, qty: i.qty, linePaisa: i.linePaisa.toString() })),
  }));
}

export async function getInvoiceView(id: string) {
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
  if (!invoice) return null;
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
  const pays = invoice.orderId ? await db.select().from(payments).where(eq(payments.orderId, invoice.orderId)) : [];
  return { invoice, items, payments: pays };
}

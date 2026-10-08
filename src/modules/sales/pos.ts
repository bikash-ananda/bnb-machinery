import { eq, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { formatNPR } from "../../lib/money";
import { customers } from "../customers/schema";
import { OrderError, confirmOrderTx, createOrderTx, recordPaymentTx, type OrderLineInput } from "./orders";
import { orders } from "./schema";

export type PosPayment = { method: "CASH" | "QR" | "ESEWA" | "KHALTI" | "CARD" | "BANK"; amountPaisa: bigint | "ALL"; reference?: string };
export type PosSaleInput = {
  customer?: { name?: string; phone?: string; panNo?: string };
  items: OrderLineInput[];
  payments: PosPayment[];
  onCredit?: boolean;
  note?: string;
  createdBy: string;
};

/**
 * The whole counter sale in ONE transaction: customer, order, stock, VAT invoice, accounts and payments.
 * If anything fails (e.g. not enough stock, credit limit) nothing is saved.
 */
export async function completePosSale(input: PosSaleInput) {
  return db.transaction(async (tx) => {
    const order = await createOrderTx(tx, {
      channel: "POS", customer: { name: input.customer?.name?.trim() || "Walk-in customer", phone: input.customer?.phone, panNo: input.customer?.panNo },
      delivery: "pickup", payment: "shop", note: input.note, items: input.items, createdBy: input.createdBy,
    });
    if (order.unpriced > 0) throw new OrderError("Every item needs a price. Ask a manager to set it.");
    const inv = await confirmOrderTx(tx, order.id, input.createdBy);

    let remaining = inv.totalPaisa;
    let change = 0n;
    for (const p of input.payments) {
      const amount = p.amountPaisa === "ALL" ? remaining : p.amountPaisa;
      if (amount <= 0n) continue;
      const apply = amount < remaining ? amount : remaining;
      const extra = amount - apply;
      if (extra > 0n) {
        if (p.method === "CASH") change += extra;
        else if (extra > 100n) throw new OrderError("Payment is more than the total.");
      }
      if (apply > 0n) {
        await recordPaymentTx(tx, order.id, p.method, apply, p.reference, input.createdBy);
        remaining -= apply;
      }
    }

    if (remaining > 0n) {
      if (!input.onCredit) throw new OrderError(`Payment is short by ${formatNPR(remaining)}.`);
      if (!order.customerId) throw new OrderError("A credit sale needs the customer's phone number.");
      const [c] = await tx.select({ limit: customers.creditLimitPaisa }).from(customers).where(eq(customers.id, order.customerId));
      if (!c || c.limit <= 0n) throw new OrderError("Credit is not enabled for this customer. Set a credit limit first.");
      const r = await tx.execute(sql`select coalesce(sum(l.debit_paisa - l.credit_paisa), 0) as bal from journal_lines l join accounts a on a.id = l.account_id where a.code = '1100' and l.customer_id = ${order.customerId}`);
      const outstanding = BigInt(String((r.rows[0] as { bal: string }).bal).split(".")[0]);
      if (outstanding > c.limit) throw new OrderError(`Credit limit exceeded (limit ${formatNPR(c.limit)}, would owe ${formatNPR(outstanding)}).`);
    }
    await tx.update(orders).set({ status: remaining === 0n ? "COMPLETED" : "CONFIRMED" }).where(eq(orders.id, order.id));
    return {
      orderId: order.id, orderNo: order.orderNo, invoiceId: inv.id, invoiceNo: inv.invoiceNo,
      totalPaisa: inv.totalPaisa, paidPaisa: inv.totalPaisa - remaining, changePaisa: change, duePaisa: remaining,
    };
  });
}

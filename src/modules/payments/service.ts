import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { recordPaymentTx } from "../sales/orders";
import { invoices, orders, payments } from "../sales/schema";
import { paymentAccounts, paymentSubmissions } from "./schema";
import {
  MAX_PENDING_PER_ORDER, PaymentError, UUID, assertPayable, isPaymentMethod, normalizeTxnId, parseQrUpload, phonesMatch,
  type PaymentMethod,
} from "./rules";

export { PaymentError } from "./rules";

const text = (v: unknown, min: number, max: number, what: string) => {
  const t = typeof v === "string" ? v.trim() : "";
  if (t.length < min || t.length > max) throw new PaymentError(`${what} must be ${min === 0 ? "at most" : `${min} to`} ${max} characters.`);
  return t;
};
const optText = (v: unknown, max: number, what: string) => (v === undefined || v === null || v === "" ? null : text(v, 1, max, what));

function pgCode(e: unknown): string | undefined {
  const o = e as { code?: unknown; cause?: { code?: unknown } } | null;
  const c = o?.code ?? o?.cause?.code;
  return typeof c === "string" ? c : undefined;
}

/* ------------------------------------------------------------------ public (checkout) */

/** Active accounts for the checkout. Never returns the QR bytes, only whether one exists. */
export async function listPublicAccounts() {
  return db
    .select({
      id: paymentAccounts.id, label: paymentAccounts.label, method: paymentAccounts.method, payeeName: paymentAccounts.payeeName,
      accountNo: paymentAccounts.accountNo, instructions: paymentAccounts.instructions,
      hasQr: sql<boolean>`${paymentAccounts.qrData} is not null`,
    })
    .from(paymentAccounts)
    .where(eq(paymentAccounts.active, true))
    .orderBy(asc(paymentAccounts.sortOrder), asc(paymentAccounts.label));
}

/** QR image of an active account, or null. */
export async function getAccountQr(id: string): Promise<{ mime: string; bytes: Buffer } | null> {
  if (!UUID.test(id)) return null;
  const [row] = await db.select({ mime: paymentAccounts.qrMime, data: paymentAccounts.qrData }).from(paymentAccounts)
    .where(and(eq(paymentAccounts.id, id), eq(paymentAccounts.active, true))).limit(1);
  if (!row?.mime || !row.data) return null;
  return { mime: row.mime, bytes: Buffer.from(row.data, "base64") };
}

/**
 * The customer says "I paid, my reference is X". This records the claim only; no money is booked until staff verify it.
 * The order is found by order number AND phone so people cannot probe other customers' orders.
 */
export async function submitPayment(input: { orderNo: unknown; phone: unknown; txnId: unknown; accountId?: unknown; method?: unknown }) {
  const txnId = normalizeTxnId(input.txnId);
  if (!txnId) throw new PaymentError("Enter the transaction reference exactly as your payment app shows it (4 to 40 letters or digits).");
  const orderNo = typeof input.orderNo === "string" ? input.orderNo.trim().toUpperCase().slice(0, 40) : "";
  const phone = typeof input.phone === "string" ? input.phone.slice(0, 20) : "";
  if (!orderNo || !phone) throw new PaymentError("Enter your order number and phone number.");

  let accountId: string | null = null;
  let method: PaymentMethod | null = null;
  if (input.accountId !== undefined && input.accountId !== null && input.accountId !== "") {
    if (typeof input.accountId !== "string" || !UUID.test(input.accountId)) throw new PaymentError("Choose a valid payment account.");
    accountId = input.accountId;
  } else if (isPaymentMethod(input.method)) method = input.method;
  else throw new PaymentError("Choose where you paid.");

  try {
    return await db.transaction(async (tx) => {
      const [o] = await tx.select({
        id: orders.id, phone: orders.phone, status: orders.status, paymentStatus: orders.paymentStatus, unpriced: orders.unpricedItems,
      }).from(orders).where(eq(orders.orderNo, orderNo)).for("update");
      if (!o || !phonesMatch(o.phone, phone)) throw new PaymentError("We could not find that order. Check the order number and phone number.");
      if (o.status === "CANCELLED") throw new PaymentError("This order was cancelled.");
      if (o.unpriced > 0) throw new PaymentError("The final price of this order is not confirmed yet. Please wait for our team before paying.");
      if (o.paymentStatus === "PAID" || o.paymentStatus === "REFUNDED") throw new PaymentError("This order is already settled.");

      if (accountId) {
        const [a] = await tx.select({ method: paymentAccounts.method }).from(paymentAccounts)
          .where(and(eq(paymentAccounts.id, accountId), eq(paymentAccounts.active, true))).limit(1);
        if (!a || !isPaymentMethod(a.method)) throw new PaymentError("That payment account is not available.");
        method = a.method;
      }
      if (!method) throw new PaymentError("Choose where you paid.");

      const [pending] = await tx.select({ n: sql<number>`count(*)::int` }).from(paymentSubmissions)
        .where(and(eq(paymentSubmissions.orderId, o.id), eq(paymentSubmissions.status, "PENDING")));
      if ((pending?.n ?? 0) >= MAX_PENDING_PER_ORDER) throw new PaymentError("Several payments are already waiting for verification on this order. Please wait for our team.");

      const [row] = await tx.insert(paymentSubmissions).values({ orderId: o.id, accountId, method, txnId }).returning({ id: paymentSubmissions.id });
      return { id: row.id, status: "PENDING" as const };
    });
  } catch (e) {
    if (pgCode(e) === "23505") throw new PaymentError("This transaction reference has already been submitted.");
    throw e;
  }
}

/* ------------------------------------------------------------------ admin: accounts */

export type AccountInput = {
  label?: unknown; method?: unknown; payeeName?: unknown; accountNo?: unknown; instructions?: unknown; sortOrder?: unknown; active?: unknown;
  /** { mime, data } to set or replace the QR, null to remove it, undefined to leave it alone. */
  qr?: { mime?: unknown; data?: unknown } | null;
};

function accountValues(input: AccountInput, partial: boolean) {
  const v: Partial<typeof paymentAccounts.$inferInsert> = {};
  if (!partial || input.label !== undefined) v.label = text(input.label, 2, 60, "Label");
  if (!partial || input.method !== undefined) {
    if (!isPaymentMethod(input.method)) throw new PaymentError("Choose a valid method.");
    v.method = input.method;
  }
  if (!partial || input.payeeName !== undefined) v.payeeName = text(input.payeeName, 2, 120, "Payee name");
  if (input.accountNo !== undefined) v.accountNo = optText(input.accountNo, 60, "Account number");
  if (input.instructions !== undefined) v.instructions = optText(input.instructions, 500, "Instructions");
  if (input.sortOrder !== undefined) {
    const n = Number(input.sortOrder);
    if (!Number.isInteger(n) || n < -1000 || n > 1000) throw new PaymentError("Sort order must be a whole number.");
    v.sortOrder = n;
  }
  if (input.active !== undefined) {
    if (typeof input.active !== "boolean") throw new PaymentError("Invalid active flag.");
    v.active = input.active;
  }
  if (input.qr === null) { v.qrMime = null; v.qrData = null; }
  else if (input.qr !== undefined) {
    const q = parseQrUpload(input.qr.mime, input.qr.data);
    v.qrMime = q.mime; v.qrData = q.base64;
  }
  return v;
}

export async function listAccountsAdmin() {
  return db.select({
    id: paymentAccounts.id, label: paymentAccounts.label, method: paymentAccounts.method, payeeName: paymentAccounts.payeeName,
    accountNo: paymentAccounts.accountNo, instructions: paymentAccounts.instructions, active: paymentAccounts.active,
    sortOrder: paymentAccounts.sortOrder, updatedBy: paymentAccounts.updatedBy, updatedAt: paymentAccounts.updatedAt,
    hasQr: sql<boolean>`${paymentAccounts.qrData} is not null`,
  }).from(paymentAccounts).orderBy(asc(paymentAccounts.sortOrder), asc(paymentAccounts.label));
}

export async function createAccount(input: AccountInput, by: string) {
  const v = accountValues(input, false);
  const [row] = await db.insert(paymentAccounts).values({ ...v, updatedBy: by } as typeof paymentAccounts.$inferInsert).returning({ id: paymentAccounts.id });
  return row.id;
}

export async function updateAccount(id: string, input: AccountInput, by: string) {
  if (!UUID.test(id)) throw new PaymentError("Invalid account.");
  const v = accountValues(input, true);
  const rows = await db.update(paymentAccounts).set({ ...v, updatedBy: by, updatedAt: new Date() }).where(eq(paymentAccounts.id, id)).returning({ id: paymentAccounts.id });
  if (!rows.length) throw new PaymentError("Account not found.");
}

/* ------------------------------------------------------------------ admin: verification queue */

export async function listPendingSubmissions() {
  const rows = await db.select({
    id: paymentSubmissions.id, orderId: paymentSubmissions.orderId, orderNo: orders.orderNo, customerName: orders.customerName, phone: orders.phone,
    orderStatus: orders.status, paymentStatus: orders.paymentStatus, totalPaisa: orders.totalPaisa,
    method: paymentSubmissions.method, txnId: paymentSubmissions.txnId, accountLabel: paymentAccounts.label, createdAt: paymentSubmissions.createdAt,
  }).from(paymentSubmissions)
    .innerJoin(orders, eq(orders.id, paymentSubmissions.orderId))
    .leftJoin(paymentAccounts, eq(paymentAccounts.id, paymentSubmissions.accountId))
    .where(eq(paymentSubmissions.status, "PENDING"))
    .orderBy(asc(paymentSubmissions.createdAt)).limit(200);
  const ids = [...new Set(rows.map((r) => r.orderId))];
  const paid = ids.length
    ? await db.select({ orderId: payments.orderId, s: sql<string>`coalesce(sum(${payments.amountPaisa}), 0)` }).from(payments).where(inArray(payments.orderId, ids)).groupBy(payments.orderId)
    : [];
  const paidBy = new Map(paid.map((p) => [p.orderId, BigInt(p.s)]));
  return rows.map((r) => {
    const paidPaisa = paidBy.get(r.orderId) ?? 0n;
    return { ...r, paidPaisa, duePaisa: r.totalPaisa - paidPaisa };
  });
}

export async function listOrderSubmissions(orderId: string) {
  if (!UUID.test(orderId)) return [];
  return db.select().from(paymentSubmissions).where(eq(paymentSubmissions.orderId, orderId)).orderBy(desc(paymentSubmissions.createdAt));
}

/**
 * Staff have checked the real bank/wallet and saw `receivedPaisa` arrive. One transaction:
 * lock submission, lock order, check balance, book the payment through the existing ledger path, mark the submission verified.
 * Any failure rolls everything back, so a submission can never be "verified" without a matching payment row.
 */
export async function verifySubmission(id: string, receivedPaisa: bigint, by: string) {
  if (!UUID.test(id)) throw new PaymentError("Invalid submission.");
  return db.transaction(async (tx) => {
    const [s] = await tx.select().from(paymentSubmissions).where(eq(paymentSubmissions.id, id)).for("update");
    if (!s) throw new PaymentError("Submission not found.");
    if (s.status !== "PENDING") throw new PaymentError("This submission was already reviewed.");

    const [o] = await tx.select({ total: orders.totalPaisa, status: orders.status }).from(orders).where(eq(orders.id, s.orderId)).for("update");
    if (!o) throw new PaymentError("Order not found.");
    if (o.status === "CANCELLED") throw new PaymentError("The order is cancelled. Reject this submission instead.");
    const [inv] = await tx.select({ id: invoices.id }).from(invoices).where(eq(invoices.orderId, s.orderId)).limit(1);
    if (!inv) throw new PaymentError("Confirm the order (this issues the invoice) before verifying a payment.");

    const [sum] = await tx.select({ s: sql<string>`coalesce(sum(${payments.amountPaisa}), 0)` }).from(payments).where(eq(payments.orderId, s.orderId));
    const due = o.total - BigInt(sum.s);
    assertPayable(receivedPaisa, due);

    const paymentStatus = await recordPaymentTx(tx, s.orderId, s.method, receivedPaisa, s.txnId, by);
    await tx.update(paymentSubmissions).set({ status: "VERIFIED", receivedPaisa, reviewedBy: by, reviewedAt: new Date(), rejectReason: null }).where(eq(paymentSubmissions.id, id));
    return { orderId: s.orderId, paymentStatus, dueAfterPaisa: due - receivedPaisa };
  });
}

/** Funds never arrived or the reference is wrong. A rejected reference may be submitted again (the duplicate index only covers PENDING and VERIFIED). */
export async function rejectSubmission(id: string, reason: unknown, by: string) {
  if (!UUID.test(id)) throw new PaymentError("Invalid submission.");
  const why = text(reason, 3, 200, "Reason");
  const rows = await db.update(paymentSubmissions)
    .set({ status: "REJECTED", rejectReason: why, reviewedBy: by, reviewedAt: new Date() })
    .where(and(eq(paymentSubmissions.id, id), eq(paymentSubmissions.status, "PENDING")))
    .returning({ id: paymentSubmissions.id, orderId: paymentSubmissions.orderId });
  if (!rows.length) throw new PaymentError("Submission not found or already reviewed.");
  return rows[0];
}

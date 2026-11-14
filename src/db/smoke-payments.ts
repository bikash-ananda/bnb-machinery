// End-to-end check of manual payments. ONLY runs against the throwaway database host "bnb-pg-test".
import { eq, sql } from "drizzle-orm";
import { db } from "./client";
import { products } from "../modules/catalog/schema";
import { orders, payments } from "../modules/sales/schema";
import { confirmOrder, createOrder } from "../modules/sales/orders";
import { paymentSubmissions } from "../modules/payments/schema";
import {
  PaymentError, createAccount, getAccountQr, listPendingSubmissions, listPublicAccounts, rejectSubmission, submitPayment, verifySubmission,
} from "../modules/payments/service";

if (new URL(process.env.DATABASE_URL ?? "postgres://x@none/x").hostname !== "bnb-pg-test") {
  console.error("REFUSING TO RUN: DATABASE_URL is not the throwaway test database.");
  process.exit(2);
}

let failed = 0;
const check = (name: string, ok: boolean, extra = "") => { console.log((ok ? "PASS  " : "FAIL  ") + name + (ok ? "" : "  -> " + extra)); if (!ok) failed++; };
async function throws(name: string, f: () => Promise<unknown>, match?: RegExp) {
  let err: unknown = null;
  try { await f(); } catch (e) { err = e; }
  check(name, err instanceof PaymentError && (!match || match.test(err.message)), err ? String(err) : "did not throw");
}
const orderRow = async (id: string) => (await db.select({ ps: orders.paymentStatus, total: orders.totalPaisa }).from(orders).where(eq(orders.id, id)))[0];
const paidSum = async (id: string) => BigInt((await db.select({ s: sql<string>`coalesce(sum(${payments.amountPaisa}),0)` }).from(payments).where(eq(payments.orderId, id)))[0].s);
const subStatus = async (id: string) => (await db.select({ s: paymentSubmissions.status }).from(paymentSubmissions).where(eq(paymentSubmissions.id, id)))[0].s;

async function main() {
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const candidates = (await db.select({ slug: products.slug, price: products.pricePaisa }).from(products).where(eq(products.isPublished, true))).filter((p) => p.price !== null && p.price > 0n).slice(0, 25);
async function newOrder(phone: string) {
  let lastErr: unknown = null;
  for (const p of candidates) {
    try { return await createOrder({ channel: "PHONE", customer: { name: "Smoke Test", phone }, delivery: "pickup", payment: "digital", items: [{ slug: p.slug, qty: 1 }] }); } catch (e) { lastErr = e; }
  }
  console.error("createOrder failed with:", lastErr);
  throw new Error("No orderable priced product found in the test database.");
}

const PHONE = "9800000001";
const acc = await createAccount({ label: "Smoke QR", method: "QR", payeeName: "Smoke Payee", qr: { mime: "image/png", data: PNG } }, "smoke");
const pub = await listPublicAccounts();
check("account is listed publicly with a QR", pub.some((a) => a.id === acc && a.hasQr));
const qr = await getAccountQr(acc);
check("QR image is served as PNG", qr?.mime === "image/png" && (qr?.bytes.length ?? 0) > 20);
await throws("bad QR (svg) is rejected", () => createAccount({ label: "Bad", method: "QR", payeeName: "Bad Payee", qr: { mime: "image/png", data: Buffer.from("<svg/>").toString("base64") } }, "smoke"));

// ---- order 1: partial + exact payment
const o1 = await newOrder(PHONE);
await confirmOrder(o1.id, "smoke");
const total = o1.totalPaisa;
console.log("order 1:", o1.orderNo, "total paisa", total.toString());
await throws("wrong phone is refused", () => submitPayment({ orderNo: o1.orderNo, phone: "9811111111", txnId: "SMOKE-TXN-001", accountId: acc }), /could not find/i);
const s1 = await submitPayment({ orderNo: o1.orderNo, phone: "+977-" + PHONE, txnId: "smoke-txn-001", accountId: acc });
check("submission is PENDING", (await subStatus(s1.id)) === "PENDING");
await throws("duplicate reference (different case) is refused", () => submitPayment({ orderNo: o1.orderNo, phone: PHONE, txnId: " SMOKE-TXN-001 ", accountId: acc }), /already been submitted/i);
const queue = await listPendingSubmissions();
check("submission appears in the pending queue", queue.some((q) => q.id === s1.id));

const half = total / 2n;
const v1 = await verifySubmission(s1.id, half, "smoke");
check("partial verify gives PARTIAL", v1.paymentStatus === "PARTIAL" && (await paidSum(o1.id)) === half, JSON.stringify(v1, (_, x) => (typeof x === "bigint" ? x.toString() : x)));
await throws("re-verifying the same submission is refused", () => verifySubmission(s1.id, half, "smoke"), /already reviewed/i);

const s2 = await submitPayment({ orderNo: o1.orderNo, phone: PHONE, txnId: "SMOKE-TXN-002", accountId: acc });
await throws("overpayment is refused", () => verifySubmission(s2.id, total, "smoke"), /more than the balance/i);
check("refused overpayment left the submission PENDING and booked nothing", (await subStatus(s2.id)) === "PENDING" && (await paidSum(o1.id)) === half);
const v2 = await verifySubmission(s2.id, total - half, "smoke");
check("exact remaining amount gives PAID", v2.paymentStatus === "PAID" && (await paidSum(o1.id)) === total && (await orderRow(o1.id)).ps === "PAID");
await throws("submitting on a paid order is refused", () => submitPayment({ orderNo: o1.orderNo, phone: PHONE, txnId: "SMOKE-TXN-009", accountId: acc }), /settled/i);

// ---- order 2: reject, then the same reference may be reused
const o2 = await newOrder(PHONE);
await confirmOrder(o2.id, "smoke");
const s3 = await submitPayment({ orderNo: o2.orderNo, phone: PHONE, txnId: "SMOKE-TXN-003", method: "BANK" });
await throws("reject needs a reason", () => rejectSubmission(s3.id, "", "smoke"));
await rejectSubmission(s3.id, "Funds not received", "smoke");
check("rejected submission is REJECTED and booked nothing", (await subStatus(s3.id)) === "REJECTED" && (await paidSum(o2.id)) === 0n);
const s3b = await submitPayment({ orderNo: o2.orderNo, phone: PHONE, txnId: "SMOKE-TXN-003", method: "BANK" });
check("a rejected reference can be submitted again", (await subStatus(s3b.id)) === "PENDING");

// ---- order 3: not confirmed yet (no invoice)
const o3 = await newOrder(PHONE);
const s4 = await submitPayment({ orderNo: o3.orderNo, phone: PHONE, txnId: "SMOKE-TXN-004", accountId: acc });
await throws("verify before the order is confirmed is refused", () => verifySubmission(s4.id, 100n, "smoke"), /confirm the order/i);
check("that refusal booked nothing", (await subStatus(s4.id)) === "PENDING" && (await paidSum(o3.id)) === 0n);

console.log(failed === 0 ? "\nALL CHECKS PASSED" : `\n${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);

}
main().catch((e) => { console.error(e); process.exit(1); });

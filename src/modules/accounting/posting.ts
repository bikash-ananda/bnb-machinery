import { and, eq, inArray } from "drizzle-orm";
import type { Tx } from "../../db/client";
import { adToBs, fiscalYearOfAd, nepalToday, toIso } from "../../lib/dates-bs";
import { lineTotal } from "../../lib/money";
import { products } from "../catalog/schema";
import { nextSeq } from "../sales/numbering";
import { invoiceItems, invoices, orders, payments } from "../sales/schema";
import { accounts, fiscalYears, journalEntries, journalLines } from "./schema";

export const ACC = {
  CASH: "1010", BANK: "1020", WALLET: "1030", AR: "1100", INVENTORY: "1200", INPUT_VAT: "1210",
  AP: "2010", OUTPUT_VAT: "2100", SALES_STD: "4010", SALES_EXEMPT: "4020", SALES_ZERO: "4030", COGS: "5010",
} as const;

type Line = { code: string; debit?: bigint; credit?: bigint; customerId?: string | null; supplierId?: string | null; memo?: string };

/** Every posting goes through here: balanced, numbered gaplessly, idempotent per source, immutable afterwards. */
export async function postJournal(
  tx: Tx,
  j: { sourceType?: string; sourceId?: string; narration: string; lines: Line[]; createdBy?: string; date?: Date },
) {
  const lines = j.lines.filter((l) => (l.debit ?? 0n) !== 0n || (l.credit ?? 0n) !== 0n);
  const dr = lines.reduce((a, l) => a + (l.debit ?? 0n), 0n);
  const cr = lines.reduce((a, l) => a + (l.credit ?? 0n), 0n);
  if (lines.length < 2 || dr !== cr) throw new Error(`Unbalanced journal: Dr ${dr} Cr ${cr}`);

  if (j.sourceType && j.sourceId) {
    const done = await tx.select({ id: journalEntries.id }).from(journalEntries)
      .where(and(eq(journalEntries.sourceType, j.sourceType), eq(journalEntries.sourceId, j.sourceId))).limit(1);
    if (done.length) return null;
  }

  const when = nepalToday(j.date ?? new Date());
  const fy = fiscalYearOfAd(when);
  await tx.insert(fiscalYears).values({ label: fy.label, startDate: toIso(fy.startAd), endDate: toIso(fy.endAd) }).onConflictDoNothing();

  const codes = [...new Set(lines.map((l) => l.code))];
  const accs = await tx.select({ id: accounts.id, code: accounts.code }).from(accounts).where(inArray(accounts.code, codes));
  const byCode = new Map(accs.map((a) => [a.code, a.id]));
  for (const c of codes) if (!byCode.has(c)) throw new Error(`Account ${c} is missing. Run: pnpm db:seed-accounts`);

  const seq = await nextSeq(tx, "journal", fy.label);
  const [e] = await tx.insert(journalEntries).values({
    entryNo: `JV-${fy.label.replace("/", "-")}-${String(seq).padStart(6, "0")}`,
    fiscalYear: fy.label, entryDate: toIso(when), bsDate: toIso(adToBs(when)),
    narration: j.narration, sourceType: j.sourceType ?? null, sourceId: j.sourceId ?? null, createdBy: j.createdBy ?? null,
  }).returning({ id: journalEntries.id });

  await tx.insert(journalLines).values(lines.map((l) => ({
    entryId: e.id, accountId: byCode.get(l.code)!, debitPaisa: l.debit ?? 0n, creditPaisa: l.credit ?? 0n,
    customerId: l.customerId ?? null, supplierId: l.supplierId ?? null, memo: l.memo ?? null,
  })));
  return e.id;
}

/** Dr Receivable / Cr Sales (taxable, exempt, zero-rated) / Cr Output VAT. */
export async function postInvoiceSale(tx: Tx, invoiceId: string, createdBy?: string) {
  const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
  const items = await tx.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  const net = (cat: string) => items.filter((i) => i.taxCategory === cat).reduce((a, i) => a + (i.linePaisa - i.vatPaisa), 0n);
  return postJournal(tx, {
    sourceType: "invoice_sale", sourceId: invoiceId, createdBy, date: inv.issuedAt,
    narration: `Sales invoice ${inv.invoiceNo} - ${inv.buyer.name}`,
    lines: [
      { code: ACC.AR, debit: inv.totalPaisa, customerId: inv.customerId, memo: inv.invoiceNo },
      { code: ACC.SALES_STD, credit: net("STANDARD") },
      { code: ACC.SALES_EXEMPT, credit: net("EXEMPT") },
      { code: ACC.SALES_ZERO, credit: net("ZERO") },
      { code: ACC.OUTPUT_VAT, credit: inv.vatPaisa },
    ],
  });
}

/** Dr Cost of Goods Sold / Cr Inventory, for stock-tracked products only, at product cost. */
export async function postInvoiceCogs(tx: Tx, invoiceId: string, createdBy?: string) {
  const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
  const rows = await tx.select({ qty: invoiceItems.qty, cost: products.costPaisa, track: products.trackStock })
    .from(invoiceItems).innerJoin(products, eq(products.id, invoiceItems.productId)).where(eq(invoiceItems.invoiceId, invoiceId));
  const cogs = rows.filter((r) => r.track && r.cost !== null).reduce((a, r) => a + lineTotal(r.qty, r.cost!), 0n);
  if (cogs === 0n) return null;
  return postJournal(tx, {
    sourceType: "invoice_cogs", sourceId: invoiceId, createdBy, date: inv.issuedAt,
    narration: `Cost of goods sold - ${inv.invoiceNo}`,
    lines: [{ code: ACC.COGS, debit: cogs }, { code: ACC.INVENTORY, credit: cogs }],
  });
}

export const PAY_ACCOUNT: Record<string, string> = { CASH: ACC.CASH, BANK: ACC.BANK, CARD: ACC.BANK, QR: ACC.BANK, ESEWA: ACC.WALLET, KHALTI: ACC.WALLET };

/** Dr Cash/Bank/Wallet / Cr Receivable. Credit sales (method CREDIT) post nothing. */
export async function postPayment(tx: Tx, paymentId: string, createdBy?: string) {
  const [p] = await tx.select({ method: payments.method, amount: payments.amountPaisa, receivedAt: payments.receivedAt, customerId: orders.customerId, orderNo: orders.orderNo })
    .from(payments).leftJoin(orders, eq(orders.id, payments.orderId)).where(eq(payments.id, paymentId));
  const code = PAY_ACCOUNT[p.method.toUpperCase()];
  if (!code) return null;
  return postJournal(tx, {
    sourceType: "payment", sourceId: paymentId, createdBy, date: p.receivedAt,
    narration: `Payment received ${p.method} - order ${p.orderNo ?? ""}`,
    lines: [{ code, debit: p.amount }, { code: ACC.AR, credit: p.amount, customerId: p.customerId }],
  });
}

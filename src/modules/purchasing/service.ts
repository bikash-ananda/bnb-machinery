import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { adToBs, fiscalYearOfAd, toIso } from "../../lib/dates-bs";
import { lineTotal, mulBp } from "../../lib/money";
import { ACC, PAY_ACCOUNT, postJournal } from "../accounting/posting";
import { products } from "../catalog/schema";
import { weightedAverage } from "../inventory/costing";
import { stockBalances } from "../inventory/schema";
import { postMovement } from "../inventory/service";
import { nextSeq } from "../sales/numbering";
import { VAT_RATE_BP, type TaxCategory } from "../sales/pricing";
import { purchaseBillItems, purchaseBills, supplierPayments, suppliers } from "./schema";

export class PurchaseError extends Error {}

export type NewPurchaseBill = {
  supplier: { id?: string; name?: string; phone?: string; address?: string; panNo?: string };
  supplierInvoiceNo: string;
  invoiceDate: { year: number; month: number; day: number }; // AD date on the supplier's invoice
  items: { slug: string; qty: number; unitPaisa: bigint; taxCategory?: TaxCategory }[]; // unit price EXCLUDING VAT
  createdBy?: string;
};

const pgCode = (e: unknown) => {
  const x = e as { code?: string; cause?: { code?: string } };
  return x.code ?? x.cause?.code;
};

/** Supplier bill: stock in + weighted-average cost + Dr Inventory / Dr Input VAT / Cr Payables, all in one transaction. */
export async function createPurchaseBill(input: NewPurchaseBill) {
  const invoiceNo = input.supplierInvoiceNo.trim();
  if (!invoiceNo) throw new PurchaseError("Supplier invoice number is required.");
  if (input.items.length === 0) throw new PurchaseError("A bill needs at least one item.");

  return db.transaction(async (tx) => {
    let supplierId = input.supplier.id;
    if (!supplierId) {
      const name = input.supplier.name?.trim();
      if (!name) throw new PurchaseError("Supplier name is required.");
      const [sp] = await tx.insert(suppliers).values({ name, phone: input.supplier.phone || null, address: input.supplier.address || null, panNo: input.supplier.panNo || null }).returning({ id: suppliers.id });
      supplierId = sp.id;
    }
    const [sup] = await tx.select().from(suppliers).where(eq(suppliers.id, supplierId));
    if (!sup) throw new PurchaseError("Supplier not found.");

    const rows = await tx.select().from(products).where(inArray(products.slug, [...new Set(input.items.map((i) => i.slug))]));
    const bySlug = new Map(rows.map((r) => [r.slug, r]));
    const lines = input.items.map((it) => {
      const p = bySlug.get(it.slug);
      if (!p) throw new PurchaseError(`Unknown product: ${it.slug}`);
      if (!(it.qty > 0) || it.unitPaisa < 0n) throw new PurchaseError("Invalid quantity or price.");
      const cat: TaxCategory = it.taxCategory ?? "STANDARD";
      const net = lineTotal(it.qty, it.unitPaisa);
      return { p, qty: it.qty, unit: it.unitPaisa, cat, net, vat: cat === "STANDARD" ? mulBp(net, VAT_RATE_BP) : 0n };
    });
    const net = lines.reduce((a, l) => a + l.net, 0n);
    const vat = lines.reduce((a, l) => a + l.vat, 0n);
    const total = net + vat;

    const d = input.invoiceDate;
    const fy = fiscalYearOfAd(d).label;
    const seq = await nextSeq(tx, "purchase", fy);
    const billNo = `PB-${fy.replace("/", "-")}-${String(seq).padStart(5, "0")}`;

    let bill: { id: string };
    try {
      [bill] = await tx.insert(purchaseBills).values({
        billNo, fiscalYear: fy, supplierId, supplierInvoiceNo: invoiceNo, supplierInvoiceDate: toIso(d), bsDate: toIso(adToBs(d)),
        netPaisa: net, vatPaisa: vat, totalPaisa: total, createdBy: input.createdBy ?? null,
      }).returning({ id: purchaseBills.id });
    } catch (e) {
      if (pgCode(e) === "23505") throw new PurchaseError("This supplier invoice number was already entered.");
      throw e;
    }

    await tx.insert(purchaseBillItems).values(lines.map((l) => ({
      billId: bill.id, productId: l.p.id, qty: l.qty, unitPaisa: l.unit, taxCategory: l.cat, netPaisa: l.net, vatPaisa: l.vat,
    })));

    for (const l of lines) {
      await tx.execute(sql`select 1 from products where id = ${l.p.id} for update`);
      const [cur] = await tx.select({ cost: products.costPaisa }).from(products).where(eq(products.id, l.p.id));
      const [bal] = await tx.select({ s: sql<string>`coalesce(sum(${stockBalances.onHand}), 0)` }).from(stockBalances).where(eq(stockBalances.productId, l.p.id));
      await tx.update(products).set({ costPaisa: weightedAverage(Number(bal.s), cur.cost, l.qty, l.unit), trackStock: true }).where(eq(products.id, l.p.id));
      await postMovement(tx, { productId: l.p.id, qty: l.qty, type: "PURCHASE", refType: "purchase_bill", refId: bill.id, createdBy: input.createdBy });
    }

    await postJournal(tx, {
      sourceType: "purchase_bill", sourceId: bill.id, createdBy: input.createdBy, date: new Date(Date.UTC(d.year, d.month - 1, d.day, 6)),
      narration: `Purchase ${billNo} - ${sup.name} inv ${invoiceNo}`,
      lines: [
        { code: ACC.INVENTORY, debit: net },
        { code: ACC.INPUT_VAT, debit: vat },
        { code: ACC.AP, credit: total, supplierId, memo: invoiceNo },
      ],
    });
    return { id: bill.id, billNo, supplierId, netPaisa: net, vatPaisa: vat, totalPaisa: total };
  });
}

/** Dr Payables / Cr Cash, Bank or Wallet. */
export async function paySupplier(p: { supplierId: string; billId?: string; method: string; amountPaisa: bigint; reference?: string; createdBy?: string }) {
  const account = PAY_ACCOUNT[p.method.toUpperCase()];
  if (!account) throw new PurchaseError("Unsupported payment method.");
  if (p.amountPaisa <= 0n) throw new PurchaseError("Amount must be positive.");
  return db.transaction(async (tx) => {
    const [pay] = await tx.insert(supplierPayments).values({
      supplierId: p.supplierId, billId: p.billId ?? null, method: p.method.toUpperCase(), amountPaisa: p.amountPaisa, reference: p.reference ?? null, createdBy: p.createdBy ?? null,
    }).returning({ id: supplierPayments.id });
    await postJournal(tx, {
      sourceType: "supplier_payment", sourceId: pay.id, createdBy: p.createdBy, narration: `Payment to supplier (${p.method})`,
      lines: [{ code: ACC.AP, debit: p.amountPaisa, supplierId: p.supplierId }, { code: account, credit: p.amountPaisa }],
    });
    return pay.id;
  });
}

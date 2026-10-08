export {};
async function main() {
  try { process.loadEnvFile(".env.local"); } catch {}
  const { db } = await import("./client");
  const s = await import("./schema");
  const buy = await import("../modules/purchasing/service");
  const sales = await import("../modules/sales/orders");
  const rep = await import("../modules/accounting/reports");
  const { fiscalYearOfAd, nepalToday } = await import("../lib/dates-bs");
  const { formatNPR } = await import("../lib/money");
  const { eq } = await import("drizzle-orm");

  await db.update(s.products).set({ pricePaisa: 15000000n, taxCategory: "EXEMPT" }).where(eq(s.products.slug, "self-propelled-reaper"));
  const t = nepalToday();
  const bill = await buy.createPurchaseBill({
    supplier: { name: "Test Supplier Pvt Ltd", panNo: "123456789" },
    supplierInvoiceNo: "TS-" + Date.now(),
    invoiceDate: t,
    items: [
      { slug: "corn-sheller", qty: 5, unitPaisa: 3000000n, taxCategory: "STANDARD" },
      { slug: "self-propelled-reaper", qty: 2, unitPaisa: 9000000n, taxCategory: "EXEMPT" },
    ],
    createdBy: "smoke",
  });
  console.log("bill", bill.billNo, "net", formatNPR(bill.netPaisa), "input VAT", formatNPR(bill.vatPaisa), "total", formatNPR(bill.totalPaisa));
  await buy.paySupplier({ supplierId: bill.supplierId, billId: bill.id, method: "BANK", amountPaisa: 10000000n, createdBy: "smoke" });

  const o = await sales.createOrder({ customer: { name: "Exempt Buyer", phone: "9822222222" }, delivery: "pickup", payment: "shop", items: [{ slug: "self-propelled-reaper", qty: 1 }] });
  const inv = await sales.confirmOrder(o.id, "smoke");
  console.log("exempt sale", inv.invoiceNo, "VAT", formatNPR(inv.vatPaisa), "(expect 0.00)");

  for (const r of await rep.vatReturn(fiscalYearOfAd(t).label)) {
    console.log(r.month, "| output VAT", formatNPR(r.outVat), "| input VAT", formatNPR(r.inVat), "| creditable", r.ratioBp / 100 + "%", formatNPR(r.creditable), "| net payable", formatNPR(r.netPayable));
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });

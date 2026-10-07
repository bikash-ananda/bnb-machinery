import fs from "node:fs";
const edit = (f, pairs) => {
  let s = fs.readFileSync(f, "utf8");
  for (const [a, b] of pairs) {
    if (!s.includes(a)) { console.log("NOT FOUND in " + f + ": " + a.slice(0, 70)); continue; }
    s = s.replace(a, b);
  }
  fs.writeFileSync(f, s, "utf8");
};
edit("src/modules/sales/orders.ts", [
  ['import { priceLine } from "./pricing";', 'import { priceLine, type TaxCategory } from "./pricing";'],
  ["vatApplicable: p.vatApplicable, priceIncludesVat", "taxCategory: p.taxCategory as TaxCategory, priceIncludesVat"],
  ["unitPaisa: l.p.pricePaisa ?? 0n, vatRateBp: l.calc.vatRateBp,", "unitPaisa: l.p.pricePaisa ?? 0n, taxCategory: l.p.taxCategory, vatRateBp: l.calc.vatRateBp,"],
  ["unitPaisa: i.unitPaisa, discountPaisa: i.discountPaisa, vatRateBp: i.vatRateBp,", "unitPaisa: i.unitPaisa, discountPaisa: i.discountPaisa, taxCategory: i.taxCategory, vatRateBp: i.vatRateBp,"],
  ["subtotalPaisa: net, discountPaisa: 0n, taxablePaisa: net,", 'subtotalPaisa: net, discountPaisa: 0n, taxablePaisa: items.filter((i) => i.taxCategory === "STANDARD").reduce((a, i) => a + (i.linePaisa - i.vatPaisa), 0n),'],
  ['import { invoiceItems, invoices, orderItems, orders, payments } from "./schema";', 'import { postInvoiceCogs, postInvoiceSale, postPayment } from "../accounting/posting";\nimport { invoiceItems, invoices, orderItems, orders, payments } from "./schema";'],
  ["return issueInvoice(tx, orderId, createdBy);", "const inv = await issueInvoice(tx, orderId, createdBy);\n    await postInvoiceSale(tx, inv.id, createdBy);\n    await postInvoiceCogs(tx, inv.id, createdBy);\n    return inv;"],
  ["await tx.insert(payments).values({ orderId, method, amountPaisa, reference: reference ?? null, createdBy: createdBy ?? null });",
   "const [pay] = await tx.insert(payments).values({ orderId, method, amountPaisa, reference: reference ?? null, createdBy: createdBy ?? null }).returning({ id: payments.id });\n    await postPayment(tx, pay.id, createdBy);"],
]);
edit("src/db/smoke.ts", [
  ["set({ pricePaisa: 4500000n, trackStock: true })", "set({ pricePaisa: 4500000n, costPaisa: 3200000n, trackStock: true })"],
  ['await avail("available after confirm (expect 8):");', 'await avail("available after confirm (expect 8):");\n  console.log("payment status:", await sales.recordPayment(o.id, "CASH", invoice.totalPaisa, undefined, "smoke"));'],
]);
console.log("done");

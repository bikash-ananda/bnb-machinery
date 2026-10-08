import fs from "node:fs";
const edit = (f, pairs) => {
  let s = fs.readFileSync(f, "utf8");
  for (const [a, b] of pairs) {
    if (!s.includes(a)) { console.log("NOT FOUND in " + f + ": " + a.slice(0, 70)); continue; }
    s = s.replace(a, b);
  }
  fs.writeFileSync(f, s, "utf8");
};

edit("src/modules/accounting/posting.ts", [
  ["customerId?: string | null; memo?: string };", "customerId?: string | null; supplierId?: string | null; memo?: string };"],
  ["customerId: l.customerId ?? null, memo: l.memo ?? null,", "customerId: l.customerId ?? null, supplierId: l.supplierId ?? null, memo: l.memo ?? null,"],
  ["const PAY_ACCOUNT", "export const PAY_ACCOUNT"],
]);

edit("src/modules/accounting/schema.ts", [
  ['import { customers } from "../customers/schema";', 'import { customers } from "../customers/schema";\nimport { suppliers } from "../purchasing/schema";'],
  ['customerId: uuid("customer_id").references(() => customers.id),', 'customerId: uuid("customer_id").references(() => customers.id),\n    supplierId: uuid("supplier_id").references(() => suppliers.id),'],
]);

fs.appendFileSync("src/modules/accounting/reports.ts", `
/** Purchase register (Kharid Khata): one row per supplier bill. */
export async function purchaseRegister(fiscalYear: string) {
  const r = await db.execute(sql\`
    select b.bill_no, b.bs_date, s.name as supplier, s.pan_no as pan, b.supplier_invoice_no,
           b.net_paisa, b.vat_paisa, b.total_paisa,
           coalesce(sum(case when it.tax_category <> 'STANDARD' then it.net_paisa end), 0) as nontaxable
    from purchase_bills b join suppliers s on s.id = b.supplier_id join purchase_bill_items it on it.bill_id = b.id
    where b.fiscal_year = \${fiscalYear}
    group by b.id, s.name, s.pan_no order by b.bill_no\`);
  return (r.rows as Record<string, unknown>[]).map((x) => ({
    billNo: String(x.bill_no), bsDate: String(x.bs_date), supplier: String(x.supplier), pan: String(x.pan ?? ""),
    supplierInvoiceNo: String(x.supplier_invoice_no), net: big(x.net_paisa), vat: big(x.vat_paisa), total: big(x.total_paisa), nonTaxable: big(x.nontaxable),
  }));
}

/**
 * Monthly VAT return worksheet (BS month). Because exempt and taxable goods are both sold, input VAT is apportioned:
 * creditable = input VAT x (taxable + zero-rated sales) / total sales. VERIFY the method and period with your accountant.
 */
export async function vatReturn(fiscalYear: string) {
  const r = await db.execute(sql\`
    with s as (
      select substr(i.bs_date, 1, 7) as m,
        sum(case when it.tax_category = 'STANDARD' then it.line_paisa - it.vat_paisa else 0 end) as taxable,
        sum(case when it.tax_category = 'ZERO' then it.line_paisa else 0 end) as zero,
        sum(case when it.tax_category = 'EXEMPT' then it.line_paisa else 0 end) as exempt,
        sum(it.vat_paisa) as out_vat
      from invoices i join invoice_items it on it.invoice_id = i.id
      where i.fiscal_year = \${fiscalYear} group by 1
    ), p as (
      select substr(bs_date, 1, 7) as m, sum(vat_paisa) as in_vat from purchase_bills where fiscal_year = \${fiscalYear} group by 1
    )
    select coalesce(s.m, p.m) as m, coalesce(s.taxable, 0) as taxable, coalesce(s.zero, 0) as zero,
           coalesce(s.exempt, 0) as exempt, coalesce(s.out_vat, 0) as out_vat, coalesce(p.in_vat, 0) as in_vat
    from s full join p on p.m = s.m order by 1\`);
  return (r.rows as Record<string, unknown>[]).map((x) => {
    const taxable = big(x.taxable), zero = big(x.zero), exempt = big(x.exempt), outVat = big(x.out_vat), inVat = big(x.in_vat);
    const total = taxable + zero + exempt;
    const ratioBp = total === 0n ? 10000 : Number(((taxable + zero) * 10000n) / total);
    const creditable = (inVat * BigInt(ratioBp)) / 10000n;
    return { month: String(x.m), taxable, zero, exempt, outVat, inVat, ratioBp, creditable, nonCreditable: inVat - creditable, netPayable: outVat - creditable };
  });
}
`);

edit("src/db/audit-check.ts", [
  ["const gap = await q(sql", `const apBills = await q(sql\`select coalesce(sum(total_paisa),0) as t from purchase_bills\`);
  const apPaid = await q(sql\`select coalesce(sum(amount_paisa),0) as t from supplier_payments where upper(method) <> 'CREDIT'\`);
  const apExpected = BigInt(String(apBills.t).split(".")[0]) - BigInt(String(apPaid.t).split(".")[0]);
  checks.push(["Payables in ledger = bills - supplier payments", bal(tbAll, "2010", "cr") === apExpected, \`Ledger \${rs(bal(tbAll, "2010", "cr"))}\`]);
  const val = await q(sql\`select coalesce(sum(round(b.on_hand * p.cost_paisa)),0) as t from stock_balances b join products p on p.id = b.product_id where p.cost_paisa is not null\`);
  const valuation = BigInt(String(val.t).split(".")[0]);
  const invLedger = bal(tbAll, "1200", "dr");
  const diff = valuation > invLedger ? valuation - invLedger : invLedger - valuation;
  checks.push(["Inventory in ledger = stock quantity x average cost (tolerance Rs 5)", diff <= 500n, \`Ledger \${rs(invLedger)} / Stock valuation \${rs(valuation)}\`]);
  const gap = await q(sql`],
  ["process.exit(checks.every((c) => c[1]) ? 0 : 2);", `const pr = await rep.purchaseRegister(fy);
  writeFileSync(\`exports/purchase-register-\${tag}.csv\`, csv([["Bill No", "Date (BS)", "Supplier", "PAN", "Supplier Invoice", "Net", "VAT", "Total", "Non-taxable"], ...pr.map((r) => [r.billNo, r.bsDate, r.supplier, r.pan, r.supplierInvoiceNo, r.net, r.vat, r.total, r.nonTaxable])]));
  const vr = await rep.vatReturn(fy);
  writeFileSync(\`exports/vat-return-worksheet-\${tag}.csv\`, csv([["Month (BS)", "Taxable sales", "Zero-rated", "Exempt", "Output VAT", "Input VAT", "Creditable %", "Creditable input VAT", "Non-creditable", "Net payable"], ...vr.map((r) => [r.month, r.taxable, r.zero, r.exempt, r.outVat, r.inVat, String(r.ratioBp / 100), r.creditable, r.nonCreditable, r.netPayable])]));
  console.log("Also wrote purchase register and VAT return worksheet CSVs");
  process.exit(checks.every((c) => c[1]) ? 0 : 2);`],
]);

edit("src/db/smoke.ts", [
  ['const inv = await import("../modules/inventory/service");', 'const inv = await import("../modules/inventory/service");\n  const adj = await import("../modules/inventory/adjust");'],
  ['await db.transaction((tx) => inv.postMovement(tx, { productId: p.id, qty: 10, type: "PURCHASE", note: "smoke test" }));', 'await db.transaction((tx) => adj.adjustStock(tx, { productId: p.id, qty: 10, reason: "OPENING", unitCostPaisa: 3200000n, note: "smoke test", createdBy: "smoke" }));'],
]);
console.log("done");

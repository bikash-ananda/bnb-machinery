import { sql } from "drizzle-orm";
import { db } from "../../db/client";

const big = (v: unknown) => BigInt(String(v ?? 0).split(".")[0]);

export async function trialBalance(fiscalYear?: string) {
  const fy = fiscalYear ?? null;
  const r = await db.execute(sql`
    select a.code, a.name_en, a.type, a.group_name,
           coalesce(sum(x.debit_paisa), 0) as dr, coalesce(sum(x.credit_paisa), 0) as cr
    from accounts a
    left join (select l.* from journal_lines l join journal_entries e on e.id = l.entry_id
               where (${fy}::text is null or e.fiscal_year = ${fy})) x on x.account_id = a.id
    group by a.id, a.code, a.name_en, a.type, a.group_name
    order by a.code`);
  return (r.rows as Record<string, unknown>[]).map((x) => ({
    code: String(x.code), name: String(x.name_en), type: String(x.type), group: String(x.group_name),
    dr: big(x.dr), cr: big(x.cr),
  }));
}

/** VAT sales register (Bikri Khata): one row per invoice, split taxable / exempt / zero-rated. */
export async function salesRegister(fiscalYear: string) {
  const r = await db.execute(sql`
    select i.invoice_no, i.bs_date, i.issued_at, i.buyer->>'name' as buyer, i.buyer->>'panNo' as pan,
           i.total_paisa, i.vat_paisa,
           coalesce(sum(case when it.tax_category = 'EXEMPT' then it.line_paisa end), 0) as exempt,
           coalesce(sum(case when it.tax_category = 'ZERO' then it.line_paisa end), 0) as zero,
           coalesce(sum(case when it.tax_category = 'STANDARD' then it.line_paisa - it.vat_paisa end), 0) as taxable
    from invoices i join invoice_items it on it.invoice_id = i.id
    where i.fiscal_year = ${fiscalYear}
    group by i.id order by i.seq_no`);
  return (r.rows as Record<string, unknown>[]).map((x) => ({
    invoiceNo: String(x.invoice_no), bsDate: String(x.bs_date), buyer: String(x.buyer ?? ""), pan: String(x.pan ?? ""),
    total: big(x.total_paisa), exempt: big(x.exempt), zero: big(x.zero), taxable: big(x.taxable), vat: big(x.vat_paisa),
  }));
}

/** Purchase register (Kharid Khata): one row per supplier bill. */
export async function purchaseRegister(fiscalYear: string) {
  const r = await db.execute(sql`
    select b.bill_no, b.bs_date, s.name as supplier, s.pan_no as pan, b.supplier_invoice_no,
           b.net_paisa, b.vat_paisa, b.total_paisa,
           coalesce(sum(case when it.tax_category <> 'STANDARD' then it.net_paisa end), 0) as nontaxable
    from purchase_bills b join suppliers s on s.id = b.supplier_id join purchase_bill_items it on it.bill_id = b.id
    where b.fiscal_year = ${fiscalYear}
    group by b.id, s.name, s.pan_no order by b.bill_no`);
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
  const r = await db.execute(sql`
    with s as (
      select substr(i.bs_date, 1, 7) as m,
        sum(case when it.tax_category = 'STANDARD' then it.line_paisa - it.vat_paisa else 0 end) as taxable,
        sum(case when it.tax_category = 'ZERO' then it.line_paisa else 0 end) as zero,
        sum(case when it.tax_category = 'EXEMPT' then it.line_paisa else 0 end) as exempt,
        sum(it.vat_paisa) as out_vat
      from invoices i join invoice_items it on it.invoice_id = i.id
      where i.fiscal_year = ${fiscalYear} group by 1
    ), p as (
      select substr(bs_date, 1, 7) as m, sum(vat_paisa) as in_vat from purchase_bills where fiscal_year = ${fiscalYear} group by 1
    )
    select coalesce(s.m, p.m) as m, coalesce(s.taxable, 0) as taxable, coalesce(s.zero, 0) as zero,
           coalesce(s.exempt, 0) as exempt, coalesce(s.out_vat, 0) as out_vat, coalesce(p.in_vat, 0) as in_vat
    from s full join p on p.m = s.m order by 1`);
  return (r.rows as Record<string, unknown>[]).map((x) => {
    const taxable = big(x.taxable), zero = big(x.zero), exempt = big(x.exempt), outVat = big(x.out_vat), inVat = big(x.in_vat);
    const total = taxable + zero + exempt;
    const ratioBp = total === 0n ? 10000 : Number(((taxable + zero) * 10000n) / total);
    const creditable = (inVat * BigInt(ratioBp)) / 10000n;
    return { month: String(x.m), taxable, zero, exempt, outVat, inVat, ratioBp, creditable, nonCreditable: inVat - creditable, netPayable: outVat - creditable };
  });
}

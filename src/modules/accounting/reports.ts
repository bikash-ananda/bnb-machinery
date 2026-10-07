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

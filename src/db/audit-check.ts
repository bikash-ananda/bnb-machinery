import { mkdirSync, writeFileSync } from "node:fs";

const rs = (p: bigint) => `${p / 100n}.${String(p % 100n).padStart(2, "0")}`;
const csv = (rows: (string | bigint)[][]) =>
  "\uFEFF" + rows.map((r) => r.map((c) => `"${typeof c === "bigint" ? rs(c) : String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");

async function main() {
  try { process.loadEnvFile(".env.local"); } catch {}
  const { db } = await import("./client");
  const { sql } = await import("drizzle-orm");
  const rep = await import("../modules/accounting/reports");
  const { fiscalYearOfAd, nepalToday } = await import("../lib/dates-bs");
  const fy = process.argv[2] ?? fiscalYearOfAd(nepalToday()).label;
  const q = async (s: ReturnType<typeof sql>) => (await db.execute(s)).rows[0] as Record<string, unknown>;
  const checks: [string, boolean, string][] = [];

  const tb = await rep.trialBalance(fy);
  const dr = tb.reduce((a, r) => a + r.dr, 0n), cr = tb.reduce((a, r) => a + r.cr, 0n);
  checks.push(["Trial balance: total debits = total credits", dr === cr, `Dr ${rs(dr)} / Cr ${rs(cr)}`]);

  const bal = (rows: typeof tb, code: string, side: "dr" | "cr") => { const r = rows.find((x) => x.code === code); return r ? (side === "cr" ? r.cr - r.dr : r.dr - r.cr) : 0n; };
  const inv = await q(sql`select coalesce(sum(total_paisa),0) as t from invoices where fiscal_year = ${fy} and status = 'ISSUED'`);
  const glSales = bal(tb, "4010", "cr") + bal(tb, "4020", "cr") + bal(tb, "4030", "cr") + bal(tb, "2100", "cr");
  checks.push(["Invoices total = sales + output VAT in ledger", BigInt(String(inv.t)) === glSales, `Invoices ${rs(BigInt(String(inv.t)))} / Ledger ${rs(glSales)}`]);

  const tbAll = await rep.trialBalance();
  const allInv = await q(sql`select coalesce(sum(total_paisa),0) as t from invoices where status = 'ISSUED'`);
  const allPay = await q(sql`select coalesce(sum(amount_paisa),0) as t from payments where upper(method) <> 'CREDIT'`);
  const ar = bal(tbAll, "1100", "dr");
  checks.push(["Receivables in ledger = invoices - payments", ar === BigInt(String(allInv.t)) - BigInt(String(allPay.t)), `Ledger ${rs(ar)}`]);

  const stock = await q(sql`select count(*) as c from stock_balances b where b.on_hand <> (select coalesce(sum(m.qty),0) from stock_movements m where m.product_id = b.product_id and m.location_id = b.location_id)`);
  checks.push(["Stock balances = sum of stock movements", Number(stock.c) === 0, `${stock.c} mismatches`]);

  const gap = await q(sql`select count(*) as n, coalesce(max(seq_no),0) as mx from invoices where fiscal_year = ${fy}`);
  checks.push(["Invoice numbers are gapless", Number(gap.n) === Number(gap.mx), `${gap.n} invoices, last no. ${gap.mx}`]);

  console.log(`\nAUDIT SELF-CHECK  FY ${fy}\n`);
  for (const [name, ok, detail] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (${detail})`);

  mkdirSync("exports", { recursive: true });
  const tag = fy.replace("/", "-");
  writeFileSync(`exports/trial-balance-${tag}.csv`, csv([["Code", "Account", "Type", "Group", "Debit", "Credit"], ...tb.filter((r) => r.dr || r.cr).map((r) => [r.code, r.name, r.type, r.group, r.dr, r.cr])]));
  const sr = await rep.salesRegister(fy);
  writeFileSync(`exports/vat-sales-register-${tag}.csv`, csv([["Invoice No", "Date (BS)", "Buyer", "PAN", "Total", "Exempt", "Zero rated", "Taxable value", "VAT"], ...sr.map((r) => [r.invoiceNo, r.bsDate, r.buyer, r.pan, r.total, r.exempt, r.zero, r.taxable, r.vat])]));
  console.log(`\nWrote exports/trial-balance-${tag}.csv and exports/vat-sales-register-${tag}.csv`);
  process.exit(checks.every((c) => c[1]) ? 0 : 2);
}
main().catch((e) => { console.error(e); process.exit(1); });

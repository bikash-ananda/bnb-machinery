import { ACC } from "@/src/modules/accounting/codes";

export function paisaValue(value: unknown): bigint {
  const raw = String(value ?? "0").trim();
  if (!/^[+-]?\d+$/.test(raw)) throw new Error("Invalid paisa value");
  return BigInt(raw);
}
export function formatPaisa(value: bigint) {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  const whole = absolute / 100n;
  const fraction = String(absolute % 100n).padStart(2, "0");
  return `${sign}NPR ${whole.toLocaleString("en-IN")}.${fraction}`;
}
export function quantityMilli(value: unknown): bigint {
  const raw = String(value ?? "0").trim();
  if (!/^[+-]?\d+(?:\.\d{1,3})?$/.test(raw)) throw new Error("Invalid stock quantity");
  const negative = raw.startsWith("-");
  const clean = raw.replace(/^[+-]/, "");
  const [wholePart, fractionPart = ""] = clean.split(".");
  const fraction = (fractionPart + "000").slice(0, 3);
  const total = BigInt(wholePart) * 1000n + BigInt(fraction || "0");
  return negative ? -total : total;
}
export function formatQuantity(value: bigint, unit = "pcs") {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  const whole = (absolute / 1000n).toLocaleString("en-IN");
  const decimals = String(absolute % 1000n).padStart(3, "0").replace(/0+$/, "");
  return `${sign}${whole}${decimals ? `.${decimals}` : ""} ${unit || "pcs"}`;
}
export function aggregateInvoiceTotals(rows: { total_paisa: unknown }[]) {
  return rows.reduce((sum, row) => sum + paisaValue(row.total_paisa), 0n);
}
export function aggregateJournal(rows: { journal_lines?: { debit_paisa: unknown; credit_paisa: unknown; accounts?: { code: string; name_en: string; type: string } | null }[] }[]) {
  let debit = 0n, credit = 0n, income = 0n, expenses = 0n, receivable = 0n, payable = 0n, cashAndBank = 0n;
  let balanced = true;
  for (const entry of rows) {
    let entryDebit = 0n, entryCredit = 0n;
    for (const line of entry.journal_lines ?? []) {
      const dr = paisaValue(line.debit_paisa), cr = paisaValue(line.credit_paisa), account = line.accounts;
      debit += dr; credit += cr; entryDebit += dr; entryCredit += cr;
      if (account?.type === "INCOME") income += cr - dr;
      if (account?.type === "EXPENSE") expenses += dr - cr;
      if (account?.code === ACC.AR) receivable += dr - cr;
      if (account?.code === ACC.AP) payable += cr - dr;
      if (new Set<string>([ACC.CASH, ACC.BANK, ACC.WALLET]).has(account?.code ?? "")) cashAndBank += dr - cr;
    }
    if (entryDebit !== entryCredit) balanced = false;
  }
  return { debit, credit, income, expenses, net: income - expenses, receivable, payable, cashAndBank, balanced };
}
export function estimateCostUsdMicros(inputTokens: number | null, outputTokens: number | null, inputRate: number | null, outputRate: number | null) {
  if (inputTokens === null || outputTokens === null || inputRate === null || outputRate === null) return null;
  return Math.round(inputTokens * inputRate + outputTokens * outputRate);
}
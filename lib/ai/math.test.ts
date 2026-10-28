import { describe, expect, it } from "vitest";
import { aggregateInvoiceTotals, aggregateJournal, estimateCostUsdMicros, formatPaisa, formatQuantity, paisaValue, quantityMilli } from "@/lib/ai/math";

describe("deterministic AI report calculations", () => {
  it("sums invoice paisa without floating-point arithmetic", () => {
    expect(aggregateInvoiceTotals([{ total_paisa: "100000" }, { total_paisa: 250 }])).toBe(100250n);
    expect(formatPaisa(100250n)).toBe("NPR 1,002.50");
    expect(formatPaisa(-25n)).toBe("-NPR 0.25");
    expect(() => paisaValue("12.5")).toThrow();
  });

  it("keeps stock quantities at the ledger's three-decimal precision", () => {
    expect(quantityMilli("1.234")).toBe(1234n);
    expect(quantityMilli("-0.015")).toBe(-15n);
    expect(formatQuantity(1234n, "m")).toBe("1.234 m");
    expect(() => quantityMilli("1.2345")).toThrow();
  });

  it("calculates posted balances and checks each journal entry independently", () => {
    const totals = aggregateJournal([
      { journal_lines: [
        { debit_paisa: 12000, credit_paisa: 0, accounts: { code: "1100", name_en: "Receivable", type: "ASSET" } },
        { debit_paisa: 0, credit_paisa: 10000, accounts: { code: "4010", name_en: "Sales", type: "INCOME" } },
        { debit_paisa: 0, credit_paisa: 2000, accounts: { code: "2100", name_en: "VAT", type: "LIABILITY" } },
      ] },
      { journal_lines: [
        { debit_paisa: 5000, credit_paisa: 0, accounts: { code: "1010", name_en: "Cash", type: "ASSET" } },
        { debit_paisa: 0, credit_paisa: 5000, accounts: { code: "1100", name_en: "Receivable", type: "ASSET" } },
      ] },
    ]);
    expect(totals).toMatchObject({ debit: 17000n, credit: 17000n, income: 10000n, receivable: 7000n, cashAndBank: 5000n, balanced: true });

    const separatelyUnbalanced = aggregateJournal([
      { journal_lines: [{ debit_paisa: 10, credit_paisa: 0, accounts: null }] },
      { journal_lines: [{ debit_paisa: 0, credit_paisa: 10, accounts: null }] },
    ]);
    expect(separatelyUnbalanced.debit).toBe(separatelyUnbalanced.credit);
    expect(separatelyUnbalanced.balanced).toBe(false);
  });

  it("estimates cost only when token usage and both provider rates exist", () => {
    expect(estimateCostUsdMicros(1000, 500, 2, 6)).toBe(5000);
    expect(estimateCostUsdMicros(1000, null, 2, 6)).toBeNull();
    expect(estimateCostUsdMicros(1000, 500, null, null)).toBeNull();
  });
});
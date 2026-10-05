import { describe, expect, it } from "vitest";
import { formatNPR, lineTotal, mulBp, splitInclusive, sumPaisa, toPaisa } from "@/src/lib/money";

describe("money", () => {
  it("parses rupees to paisa exactly", () => {
    expect(toPaisa("1234.5")).toBe(123450n);
    expect(toPaisa(0.1 + 0.2)).toBe(30n); // float noise never leaks in
    expect(toPaisa("-5")).toBe(-500n);
    expect(() => toPaisa("1.234")).toThrow();
    expect(() => toPaisa("abc")).toThrow();
  });

  it("13% VAT on Rs 90,000 is Rs 11,700 (total Rs 1,01,700)", () => {
    const taxable = toPaisa("90000");
    const vat = mulBp(taxable, 1300);
    expect(vat).toBe(toPaisa("11700"));
    expect(formatNPR(taxable + vat)).toBe("Rs 1,01,700.00");
  });

  it("rounds half up at 2 decimals", () => {
    expect(mulBp(toPaisa("0.05"), 1300)).toBe(1n); // 0.0065 rupees -> 1 paisa (0.65 paisa rounds up)
    expect(mulBp(toPaisa("0.03"), 1300)).toBe(0n); // 0.39 paisa rounds down
    expect(mulBp(toPaisa("10.00"), 1250)).toBe(125n);
    expect(mulBp(-toPaisa("0.05"), 1300)).toBe(-1n); // symmetric for credit notes
  });

  it("multiplies quantity by price with 3-decimal quantities", () => {
    expect(lineTotal(3, toPaisa("250"))).toBe(toPaisa("750"));
    expect(lineTotal("2.5", toPaisa("100.10"))).toBe(toPaisa("250.25"));
    expect(() => lineTotal("1.2345", 100n)).toThrow();
  });

  it("splits a tax-inclusive price so net + tax = gross", () => {
    const gross = toPaisa("113");
    const { net, tax } = splitInclusive(gross, 1300);
    expect(net).toBe(toPaisa("100"));
    expect(tax).toBe(toPaisa("13"));
    for (const g of [1n, 99n, 12345n, 987654321n]) {
      const s = splitInclusive(g, 1300);
      expect(s.net + s.tax).toBe(g);
    }
  });

  it("formats with Indian digit grouping", () => {
    expect(formatNPR(0n)).toBe("Rs 0.00");
    expect(formatNPR(99999n, { symbol: false })).toBe("999.99");
    expect(formatNPR(123456789n)).toBe("Rs 12,34,567.89");
    expect(formatNPR(-250050n)).toBe("-Rs 2,500.50");
    expect(formatNPR(1000000000n)).toBe("Rs 1,00,00,000.00"); // 1 crore
  });

  it("sums without drift", () => {
    expect(sumPaisa(Array.from({ length: 1000 }, () => toPaisa("0.10")))).toBe(toPaisa("100"));
  });
});

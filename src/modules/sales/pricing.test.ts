import { describe, expect, it } from "vitest";
import { toPaisa } from "../../lib/money";
import { priceLine } from "./pricing";

describe("priceLine", () => {
  it("splits a VAT-inclusive price", () => {
    const r = priceLine({ qty: 1, unitPaisa: toPaisa("1130"), taxCategory: "STANDARD", priceIncludesVat: true });
    expect(r.netPaisa).toBe(toPaisa("1000"));
    expect(r.vatPaisa).toBe(toPaisa("130"));
    expect(r.totalPaisa).toBe(toPaisa("1130"));
  });
  it("adds VAT to an exclusive price", () => {
    const r = priceLine({ qty: 2, unitPaisa: toPaisa("500"), taxCategory: "STANDARD", priceIncludesVat: false });
    expect(r.totalPaisa).toBe(toPaisa("1130"));
  });
  it("charges no VAT on exempt and zero-rated items", () => {
    for (const taxCategory of ["EXEMPT", "ZERO"] as const) {
      const r = priceLine({ qty: 3, unitPaisa: toPaisa("100"), taxCategory, priceIncludesVat: true });
      expect(r.vatPaisa).toBe(0n);
      expect(r.totalPaisa).toBe(toPaisa("300"));
    }
  });
});

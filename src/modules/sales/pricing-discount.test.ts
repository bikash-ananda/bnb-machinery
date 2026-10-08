import { describe, expect, it } from "vitest";
import { toPaisa } from "../../lib/money";
import { priceLine } from "./pricing";

describe("priceLine with discount", () => {
  it("takes the discount off before splitting VAT", () => {
    const r = priceLine({ qty: 1, unitPaisa: toPaisa("1130"), taxCategory: "STANDARD", priceIncludesVat: true, discountBp: 1000 });
    expect(r.discountPaisa).toBe(toPaisa("113"));
    expect(r.totalPaisa).toBe(toPaisa("1017"));
    expect(r.netPaisa).toBe(toPaisa("900"));
    expect(r.vatPaisa).toBe(toPaisa("117"));
  });
  it("discounts an exempt item with no VAT", () => {
    const r = priceLine({ qty: 2, unitPaisa: toPaisa("500"), taxCategory: "EXEMPT", priceIncludesVat: true, discountBp: 500 });
    expect(r.totalPaisa).toBe(toPaisa("950"));
    expect(r.vatPaisa).toBe(0n);
  });
});

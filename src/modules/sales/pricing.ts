import { lineTotal, mulBp, splitInclusive, type Paisa } from "../../lib/money";

/** Standard Nepal VAT 13%. VERIFY exemptions per product with the accountant (docs/TAX-NEPAL.md). */
export const VAT_RATE_BP = 1300;
/** STANDARD = 13% VAT. EXEMPT = Schedule 1 (no VAT, no input credit). ZERO = Schedule 2 (0%, input credit allowed). */
export type TaxCategory = "STANDARD" | "EXEMPT" | "ZERO";

export function priceLine(o: { qty: number; unitPaisa: Paisa; taxCategory: TaxCategory; priceIncludesVat: boolean; discountBp?: number }) {
  const gross = lineTotal(o.qty, o.unitPaisa);
  const discountPaisa = o.discountBp ? mulBp(gross, o.discountBp) : 0n;
  const base = gross - discountPaisa; // discount comes off BEFORE VAT is worked out
  if (o.taxCategory !== "STANDARD") return { netPaisa: base, vatPaisa: 0n, totalPaisa: base, vatRateBp: 0, discountPaisa };
  if (o.priceIncludesVat) {
    const { net, tax } = splitInclusive(base, VAT_RATE_BP);
    return { netPaisa: net, vatPaisa: tax, totalPaisa: base, vatRateBp: VAT_RATE_BP, discountPaisa };
  }
  const vat = mulBp(base, VAT_RATE_BP);
  return { netPaisa: base, vatPaisa: vat, totalPaisa: base + vat, vatRateBp: VAT_RATE_BP, discountPaisa };
}

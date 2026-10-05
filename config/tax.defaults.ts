// Seed data for tax codes (inserted into tax_codes / tax_rates in Roadmap 4.1). Rates are basis points: 1300 = 13%.
// VERIFY every line with the accountant before go-live (docs/TAX-NEPAL.md). Never hardcode these numbers elsewhere.
export const taxCodeSeeds = [
  { key: "VAT13", kind: "vat", bucket: "taxable", rateBp: 1300, nameEn: "VAT 13%", nameNe: "मूल्य अभिवृद्धि कर १३%" },
  { key: "VAT_EXEMPT", kind: "vat", bucket: "exempt", rateBp: 0, nameEn: "VAT exempt", nameNe: "मूल्य अभिवृद्धि कर छुट" },
  { key: "VAT_ZERO", kind: "vat", bucket: "zero_rated", rateBp: 0, nameEn: "VAT zero-rated", nameNe: "शून्य दर" },
] as const;

export type TaxBucket = (typeof taxCodeSeeds)[number]["bucket"];

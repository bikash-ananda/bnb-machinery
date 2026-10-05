// Document number formats. Tokens: {fy} fiscal year like 2083-84, {seq:N} zero-padded counter, {yymmdd}.
// Invoice numbers must stay sequential and gapless per fiscal year (see docs/TAX-NEPAL.md).
export const numbering = {
  invoice: { format: "{seq:6}", resetEachFiscalYear: true },
  creditNote: { format: "CN-{fy}-{seq:5}", resetEachFiscalYear: true },
  debitNote: { format: "DN-{fy}-{seq:5}", resetEachFiscalYear: true },
  receipt: { format: "RC-{fy}-{seq:5}", resetEachFiscalYear: true },
  quote: { format: "QT-{fy}-{seq:5}", resetEachFiscalYear: true },
  order: { format: "BB-{yymmdd}-{seq:4}", resetEachFiscalYear: false },
  purchaseOrder: { format: "PO-{fy}-{seq:5}", resetEachFiscalYear: true },
} as const;

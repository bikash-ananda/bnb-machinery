/** Account codes used by the deterministic accounting posting and reporting services. */
export const ACC = {
  CASH: "1010", BANK: "1020", WALLET: "1030", AR: "1100", INVENTORY: "1200", INPUT_VAT: "1210",
  AP: "2010", OUTPUT_VAT: "2100", SALES_STD: "4010", SALES_EXEMPT: "4020", SALES_ZERO: "4030", COGS: "5010",
} as const;
const chart: [string, string, string, string][] = [
  ["1010", "Cash in Hand", "ASSET", "Cash and Cash Equivalents"],
  ["1020", "Bank Account - Operating", "ASSET", "Cash and Cash Equivalents"],
  ["1030", "Digital Wallets Clearing (eSewa/Khalti)", "ASSET", "Cash and Cash Equivalents"],
  ["1100", "Trade Receivables", "ASSET", "Receivables"],
  ["1200", "Inventory - Trading Goods", "ASSET", "Inventories"],
  ["1210", "Input VAT Receivable", "ASSET", "Tax Assets"],
  ["1220", "Advance Income Tax / TDS Receivable", "ASSET", "Tax Assets"],
  ["1300", "Advances to Suppliers", "ASSET", "Other Current Assets"],
  ["1500", "Property, Plant and Equipment - Cost", "ASSET", "Non-current Assets"],
  ["1590", "Accumulated Depreciation", "ASSET", "Non-current Assets"],
  ["2010", "Trade Payables", "LIABILITY", "Payables"],
  ["2100", "Output VAT Payable", "LIABILITY", "Tax Liabilities"],
  ["2110", "TDS Payable", "LIABILITY", "Tax Liabilities"],
  ["2120", "Income Tax Payable", "LIABILITY", "Tax Liabilities"],
  ["2200", "Customer Advances", "LIABILITY", "Other Current Liabilities"],
  ["2300", "Accrued Expenses", "LIABILITY", "Other Current Liabilities"],
  ["2400", "Loans and Borrowings", "LIABILITY", "Borrowings"],
  ["3010", "Owner's Capital", "EQUITY", "Equity"],
  ["3020", "Retained Earnings", "EQUITY", "Equity"],
  ["3030", "Owner's Drawings", "EQUITY", "Equity"],
  ["4010", "Sales - VAT Taxable (13%)", "INCOME", "Revenue"],
  ["4020", "Sales - VAT Exempt", "INCOME", "Revenue"],
  ["4030", "Sales - Zero Rated", "INCOME", "Revenue"],
  ["4040", "Service and Repair Income", "INCOME", "Revenue"],
  ["4100", "Other Income", "INCOME", "Other Income"],
  ["5010", "Cost of Goods Sold", "EXPENSE", "Cost of Sales"],
  ["5020", "Stock Adjustments and Shrinkage", "EXPENSE", "Cost of Sales"],
  ["5100", "Salaries and Wages", "EXPENSE", "Operating Expenses"],
  ["5110", "Rent", "EXPENSE", "Operating Expenses"],
  ["5120", "Electricity and Utilities", "EXPENSE", "Operating Expenses"],
  ["5130", "Transport and Delivery", "EXPENSE", "Operating Expenses"],
  ["5140", "Marketing and Advertising", "EXPENSE", "Operating Expenses"],
  ["5150", "Bank Charges and Gateway Fees", "EXPENSE", "Operating Expenses"],
  ["5160", "Repairs and Maintenance", "EXPENSE", "Operating Expenses"],
  ["5170", "Depreciation", "EXPENSE", "Operating Expenses"],
  ["5180", "Professional and Audit Fees", "EXPENSE", "Operating Expenses"],
  ["5190", "Office and Miscellaneous", "EXPENSE", "Operating Expenses"],
  ["5900", "Rounding Differences", "EXPENSE", "Operating Expenses"],
];
async function main() {
  try { process.loadEnvFile(".env.local"); } catch {}
  const { db } = await import("./client");
  const { accounts } = await import("./schema");
  for (const [code, nameEn, type, groupName] of chart) {
    await db.insert(accounts).values({ code, nameEn, type, groupName }).onConflictDoNothing();
  }
  console.log("Chart of accounts ready:", chart.length, "accounts");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });

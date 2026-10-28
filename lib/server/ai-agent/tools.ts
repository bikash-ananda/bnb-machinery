import "server-only";

import { and, asc, desc, eq, gte, inArray, isNotNull, lt, max } from "drizzle-orm";
import { canUseAgentTool, selectAgentTools, type AgentId, type AgentToolId } from "@/lib/ai/agents";
import type { AdminRole } from "@/lib/admin/access";
import { addCalendarDays, businessDate, dateWindowsForQuestion } from "@/lib/ai/date-period";
import { aggregateInvoiceTotals, aggregateJournal, formatPaisa, formatQuantity, paisaValue, quantityMilli } from "@/lib/ai/math";
import type { AgentReport, Metric } from "@/lib/ai/types";
import { db } from "@/src/db/client";
import { products as productTable } from "@/src/modules/catalog/schema";
import { accounts, journalEntries, journalLines } from "@/src/modules/accounting/schema";
import { stockBalances, stockMovements } from "@/src/modules/inventory/schema";
import { purchaseBillItems, purchaseBills, suppliers } from "@/src/modules/purchasing/schema";
import { invoiceItems, invoices } from "@/src/modules/sales/schema";

const MAX_ROWS = 50000;

export class AgentDataError extends Error { constructor() { super("AI data source unavailable"); this.name = "AgentDataError"; } }


function bounded<T>(rows: T[]) {
  if (rows.length > MAX_ROWS) throw new AgentDataError();
  return rows;
}

async function salesSummary(question: string): Promise<AgentReport> {
  const windows = dateWindowsForQuestion(question);
  const periods = await Promise.all(windows.map(async (window) => {
    const rows = bounded(await db.select({ id: invoices.id, totalPaisa: invoices.totalPaisa })
      .from(invoices).where(and(eq(invoices.status, "ISSUED"), gte(invoices.issuedAt, new Date(window.start)), lt(invoices.issuedAt, new Date(window.end))))
      .orderBy(asc(invoices.issuedAt), asc(invoices.id)).limit(MAX_ROWS + 1));
    const total = aggregateInvoiceTotals(rows.map((row) => ({ total_paisa: row.totalPaisa })));
    return { window, count: rows.length, total };
  }));
  const metrics: Metric[] = [];
  for (let i = 0; i < periods.length; i++) {
    const { count, total } = periods[i];
    const caption = periods.length === 2 ? (i === 0 ? "Current month" : "Previous month") : "Selected period";
    metrics.push({ label: `${caption} issued invoices`, value: String(count) });
    metrics.push({ label: `${caption} invoiced total`, value: formatPaisa(total) });
    if (count) metrics.push({ label: `${caption} average invoice`, value: formatPaisa((total + BigInt(Math.floor(count / 2))) / BigInt(count)) });
  }
  if (periods.length === 2) {
    const [current, previous] = periods;
    const difference = current.total - previous.total;
    const scaledChange = previous.total === 0n ? null : (difference < 0n ? -difference : difference) * 10000n / previous.total;
    const change = scaledChange === null ? "Not available (no issued invoices in the previous period)" : `${difference < 0n ? "−" : "+"}${scaledChange / 100n}.${String(scaledChange % 100n).padStart(2, "0")}%`;
    metrics.push({ label: "Change in invoiced total", value: change });
  }
  return { tool: "sales_summary", title: "Issued sales invoices", period: periods.map((period) => period.window.label).join(" · "), source: "Issued invoices, totals stored in NPR paisa", metrics, notes: ["This is the issued invoice total, not a cash collection total. Voided or draft invoices are excluded."] };
}

async function bestSellers(question: string): Promise<AgentReport> {
  const window = dateWindowsForQuestion(question)[0];
  const rows = bounded(await db.select({ sku: invoiceItems.sku, name: invoiceItems.name, qty: invoiceItems.qty, linePaisa: invoiceItems.linePaisa })
    .from(invoiceItems).innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
    .where(and(eq(invoices.status, "ISSUED"), gte(invoices.issuedAt, new Date(window.start)), lt(invoices.issuedAt, new Date(window.end))))
    .orderBy(asc(invoices.issuedAt), asc(invoiceItems.id)).limit(MAX_ROWS + 1));
  const grouped = new Map<string, { name: string; sku: string; quantity: bigint; revenue: bigint }>();
  for (const row of rows) {
    const key = row.sku || row.name;
    const current = grouped.get(key) ?? { name: row.name, sku: row.sku ?? "—", quantity: 0n, revenue: 0n };
    current.quantity += quantityMilli(row.qty);
    current.revenue += paisaValue(row.linePaisa);
    grouped.set(key, current);
  }
  const top = [...grouped.values()].sort((a, b) => a.quantity === b.quantity ? a.revenue === b.revenue ? a.name.localeCompare(b.name) : a.revenue > b.revenue ? -1 : 1 : a.quantity > b.quantity ? -1 : 1).slice(0, 10);
  return {
    tool: "best_sellers", title: "Top-selling products", period: window.label, source: "Issued invoice items",
    metrics: [{ label: "Products with invoice sales", value: String(grouped.size) }],
    table: { headings: ["Product", "SKU", "Quantity invoiced", "Invoiced total"], rows: top.map((item) => [item.name, item.sku, formatQuantity(item.quantity), formatPaisa(item.revenue)]) },
    notes: ["Ranked by invoiced quantity, then invoiced total. This measures recorded sales, not profit."],
  };
}

async function inventoryAlerts(): Promise<AgentReport> {
  const [products, balances] = await Promise.all([
    db.select({ id: productTable.id, sku: productTable.sku, name: productTable.nameEn, reorderLevel: productTable.reorderLevel, unit: productTable.unit })
      .from(productTable).where(and(eq(productTable.trackStock, true), gte(productTable.reorderLevel, 1))).orderBy(asc(productTable.nameEn), asc(productTable.id)).limit(MAX_ROWS + 1),
    db.select({ productId: stockBalances.productId, onHand: stockBalances.onHand }).from(stockBalances)
      .orderBy(asc(stockBalances.productId), asc(stockBalances.locationId)).limit(MAX_ROWS + 1),
  ]);
  bounded(products); bounded(balances);
  const onHand = new Map<string, bigint>();
  for (const balance of balances) onHand.set(balance.productId, (onHand.get(balance.productId) ?? 0n) + quantityMilli(balance.onHand));
  const low = products.map((product) => ({ product, quantity: onHand.get(product.id) ?? 0n, threshold: BigInt(product.reorderLevel) * 1000n }))
    .filter((item) => item.quantity < item.threshold)
    .sort((a, b) => a.quantity < b.quantity ? -1 : a.quantity > b.quantity ? 1 : a.product.name.localeCompare(b.product.name));
  return {
    tool: "inventory_alerts", title: "Products below reorder level", source: "Tracked products and stock balances, summed across locations",
    metrics: [
      { label: "Below configured reorder level", value: String(low.length) },
      { label: "Out of stock", value: String(low.filter((item) => item.quantity <= 0n).length) },
      { label: "Tracked reorder levels checked", value: String(products.length) },
    ],
    table: { headings: ["Product", "SKU", "On hand", "Reorder level", "Gap to threshold"], rows: low.slice(0, 15).map(({ product, quantity, threshold }) => [product.name, product.sku, formatQuantity(quantity, product.unit), formatQuantity(threshold, product.unit), formatQuantity(threshold - quantity, product.unit)]) },
    notes: ["The gap is the quantity required to reach the configured reorder level. It is not a demand forecast or purchase order quantity."],
  };
}

async function stockMovement(question: string): Promise<AgentReport> {
  const rolling = question.match(/\b(?:last|past)\s+(7|30|90)\s+days?\b/i);
  const days = Number(rolling?.[1] ?? 30);
  const window = dateWindowsForQuestion(`last ${days} days`)[0];

  // Movement reports need timestamps to apply the exclusive period end.
  const withDates = bounded(await db.select({ productId: stockMovements.productId, qty: stockMovements.qty, createdAt: stockMovements.createdAt, sku: productTable.sku, name: productTable.nameEn, unit: productTable.unit })
    .from(stockMovements).innerJoin(productTable, eq(stockMovements.productId, productTable.id))
    .where(and(gte(stockMovements.createdAt, new Date(window.start)), lt(stockMovements.createdAt, new Date(window.end))))
    .orderBy(asc(stockMovements.id)).limit(MAX_ROWS + 1));
  const grouped = new Map<string, { sku: string; name: string; unit: string; net: bigint; moves: number }>();
  for (const row of withDates) {
    const current = grouped.get(row.productId) ?? { sku: row.sku, name: row.name, unit: row.unit, net: 0n, moves: 0 };
    current.net += quantityMilli(row.qty); current.moves++;
    grouped.set(row.productId, current);
  }
  return {
    tool: "stock_movement", title: "Stock ledger movement", period: window.label, source: "Append-only stock movement ledger",
    metrics: [{ label: "Movement records", value: String(withDates.length) }],
    table: { headings: ["Product", "SKU", "Movement records", "Net quantity change"], rows: [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 15).map((item) => [item.name, item.sku, String(item.moves), formatQuantity(item.net, item.unit)]) },
    notes: ["Net quantity change combines signed ledger entries per product. Different units are not added together."],
  };
}

async function slowMovers(question: string): Promise<AgentReport> {
  const dayMatch = question.match(/\b(30|60|90|180)\s+days?\b/i);
  const days = Number(dayMatch?.[1] ?? 90);
  const cutoff = addCalendarDays(businessDate(), -days);
  const [products, balances, sales] = await Promise.all([
    db.select({ id: productTable.id, sku: productTable.sku, name: productTable.nameEn, unit: productTable.unit }).from(productTable)
      .where(eq(productTable.trackStock, true)).orderBy(asc(productTable.nameEn), asc(productTable.id)).limit(MAX_ROWS + 1),
    db.select({ productId: stockBalances.productId, onHand: stockBalances.onHand }).from(stockBalances)
      .orderBy(asc(stockBalances.productId), asc(stockBalances.locationId)).limit(MAX_ROWS + 1),
    db.select({ productId: invoiceItems.productId, date: max(invoices.issuedAt) }).from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(and(eq(invoices.status, "ISSUED"), isNotNull(invoiceItems.productId)))
      .groupBy(invoiceItems.productId).limit(MAX_ROWS + 1),
  ]);
  bounded(products); bounded(balances); bounded(sales);
  const stock = new Map<string, bigint>();
  for (const balance of balances) stock.set(balance.productId, (stock.get(balance.productId) ?? 0n) + quantityMilli(balance.onHand));
  const lastSold = new Map<string, string>();
  for (const sale of sales) if (sale.productId && sale.date) lastSold.set(sale.productId, sale.date.toISOString());
  const slow = products.map((product) => ({ product, quantity: stock.get(product.id) ?? 0n, date: lastSold.get(product.id) ?? null }))
    .filter((item) => item.quantity > 0n && (!item.date || item.date.slice(0, 10) <= cutoff))
    .sort((a, b) => a.date === b.date ? a.product.name.localeCompare(b.product.name) : !a.date ? -1 : !b.date ? 1 : a.date.localeCompare(b.date));
  return {
    tool: "slow_movers", title: `Tracked stock with no invoice sales in ${days}+ days`, period: `On or before ${cutoff} (Nepal time)`, source: "Tracked stock balances and all issued invoice items",
    metrics: [{ label: "Products with stock and no recent invoice sale", value: String(slow.length) }, { label: "Tracked products checked", value: String(products.length) }],
    table: { headings: ["Product", "SKU", "On hand", "Last invoiced sale"], rows: slow.slice(0, 15).map((item) => [item.product.name, item.product.sku, formatQuantity(item.quantity, item.product.unit), item.date ? item.date.slice(0, 10) : "No recorded invoice sale"]) },
    notes: ["A product is included only when its tracked stock is above zero. This report uses invoice history; it does not include unrecorded cash sales."],
  };
}

async function supplierPrices(): Promise<AgentReport> {
  const cutoff = addCalendarDays(businessDate(), -365);
  const rows = bounded(await db.select({
    productId: purchaseBillItems.productId,
    unitPaisa: purchaseBillItems.unitPaisa,
    sku: productTable.sku,
    productName: productTable.nameEn,
    supplierId: purchaseBills.supplierId,
    invoiceDate: purchaseBills.supplierInvoiceDate,
    supplierName: suppliers.name,
  }).from(purchaseBillItems)
    .innerJoin(productTable, eq(purchaseBillItems.productId, productTable.id))
    .innerJoin(purchaseBills, eq(purchaseBillItems.billId, purchaseBills.id))
    .innerJoin(suppliers, eq(purchaseBills.supplierId, suppliers.id))
    .where(and(eq(purchaseBills.status, "POSTED"), gte(purchaseBills.supplierInvoiceDate, cutoff)))
    .orderBy(desc(purchaseBills.supplierInvoiceDate), asc(purchaseBillItems.id)).limit(MAX_ROWS + 1));
  type SupplierPrice = { product: string; sku: string; supplier: string; date: string; price: bigint };
  const latest = new Map<string, SupplierPrice>();
  for (const row of rows) {
    const key = `${row.productId}:${row.supplierId}`;
    if (!latest.has(key)) latest.set(key, { product: row.productName, sku: row.sku, supplier: row.supplierName, date: row.invoiceDate, price: paisaValue(row.unitPaisa) });
  }
  const byProduct = new Map<string, SupplierPrice[]>();
  for (const [key, value] of latest) {
    const productId = key.split(":")[0];
    const list = byProduct.get(productId) ?? [];
    list.push(value); byProduct.set(productId, list);
  }
  const comparable = [...byProduct.values()].filter((list) => list.length > 1).map((list) => ({ list, low: [...list].sort((a, b) => a.price < b.price ? -1 : a.price > b.price ? 1 : 0)[0] })).slice(0, 15);
  return {
    tool: "supplier_prices", title: "Recent supplier purchase prices", period: `Bills dated since ${cutoff}`, source: "Posted purchase bill items from the last 365 days",
    metrics: [{ label: "Products with multiple supplier prices", value: String(comparable.length) }, { label: "Supplier-product prices compared", value: String(latest.size) }],
    table: { headings: ["Product", "SKU", "Lowest recent supplier price", "Supplier", "Invoice date", "Prices compared"], rows: comparable.map(({ list, low }) => [low.product, low.sku, formatPaisa(low.price), low.supplier, low.date, String(list.length)]) },
    notes: ["For each product and supplier, only the most recent posted bill in the 365-day window is compared. Prices are unit prices before landed-cost allocation."],
  };
}

async function readAllJournalEntries() {
  const entries = bounded(await db.select({ id: journalEntries.id, entryDate: journalEntries.entryDate })
    .from(journalEntries).orderBy(asc(journalEntries.entryDate), asc(journalEntries.id)).limit(MAX_ROWS + 1));
  const entryIds = entries.map((entry) => entry.id);
  const lines = entryIds.length ? bounded(await db.select({
    entryId: journalLines.entryId,
    debitPaisa: journalLines.debitPaisa,
    creditPaisa: journalLines.creditPaisa,
    code: accounts.code,
    nameEn: accounts.nameEn,
    type: accounts.type,
  }).from(journalLines).innerJoin(accounts, eq(journalLines.accountId, accounts.id))
    .where(inArray(journalLines.entryId, entryIds)).orderBy(asc(journalLines.entryId), asc(journalLines.id)).limit(MAX_ROWS + 1)) : [];
  const byEntry = new Map<string, typeof lines>();
  for (const line of lines) byEntry.set(line.entryId, [...(byEntry.get(line.entryId) ?? []), line]);
  return entries.map((entry) => ({
    entry_date: entry.entryDate,
    journal_lines: (byEntry.get(entry.id) ?? []).map((line) => ({
      debit_paisa: line.debitPaisa,
      credit_paisa: line.creditPaisa,
      accounts: { code: line.code, name_en: line.nameEn, type: line.type },
    })),
  }));
}

async function accountingSummary(question: string): Promise<AgentReport> {
  const windows = dateWindowsForQuestion(question);
  const entries = await readAllJournalEntries();
  const lifetime = aggregateJournal(entries);
  const metrics: Metric[] = [];
  for (let index = 0; index < windows.length; index++) {
    const window = windows[index];
    const periodEntries = entries.filter((entry) => entry.entry_date >= window.startDay && entry.entry_date < window.endDay);
    const totals = aggregateJournal(periodEntries);
    const name = windows.length === 2 ? (index === 0 ? "Current month to date" : "Previous month matching days") : "Selected period";
    metrics.push({ label: `${name} posted income`, value: formatPaisa(totals.income) });
    metrics.push({ label: `${name} posted expenses`, value: formatPaisa(totals.expenses) });
    metrics.push({ label: `${name} posted net income`, value: formatPaisa(totals.net) });
  }
  metrics.push(
    { label: "Current ledger receivables", value: formatPaisa(lifetime.receivable) },
    { label: "Current ledger payables", value: formatPaisa(lifetime.payable) },
    { label: "Cash, bank and wallet ledger balance", value: formatPaisa(lifetime.cashAndBank) },
    { label: "Journal entries balanced", value: lifetime.balanced ? "Yes" : "No" },
  );
  return {
    tool: "accounting_summary", title: "Posted journal summary", period: windows.map((window) => window.label).join(" · "), source: "Posted journal entries, journal lines and chart of accounts",
    metrics,
    notes: ["Cash, bank and wallet figures are ledger balances, not a bank reconciliation.", "Receivables and payables are control-account totals; the data model has no due-date field, so overdue balances cannot be identified."],
  };
}

async function outstandingBalances(): Promise<AgentReport> {
  const entries = await readAllJournalEntries();
  const totals = aggregateJournal(entries);
  return {
    tool: "outstanding_balances", title: "Current ledger receivables and payables", source: "All posted journal entries and control accounts",
    metrics: [
      { label: "Current ledger receivables", value: formatPaisa(totals.receivable) },
      { label: "Current ledger payables", value: formatPaisa(totals.payable) },
      { label: "Journal entries balanced", value: totals.balanced ? "Yes" : "No" },
    ],
    notes: ["These are control-account totals, not a list of overdue accounts. The current data model has no due-date field."],
  };
}
async function productProfitability(): Promise<AgentReport> {
  return {
    tool: "product_profitability", title: "Product profitability coverage", source: "Invoice and product cost schema review",
    metrics: [],
    notes: ["The current invoice records do not store a cost snapshot for each sold item. Product cost is mutable catalog data, so using today's cost would give a misleading historical profit ranking.", "I can report invoiced sales by product. Historical product profit needs cost snapshots or reliable posted cost-of-goods-sold allocations per invoice."],
  };
}

const runners: Record<AgentToolId, (question: string) => Promise<AgentReport>> = {
  sales_summary: salesSummary,
  best_sellers: bestSellers,
  product_profitability: productProfitability,
  inventory_alerts: inventoryAlerts,
  slow_movers: slowMovers,
  stock_movement: stockMovement,
  supplier_prices: supplierPrices,
  accounting_summary: accountingSummary,
  outstanding_balances: () => outstandingBalances(),
};

export async function runAgentTools(agentId: AgentId, role: AdminRole, question: string) {
  const selected = selectAgentTools(agentId, role, question);
  const reports: AgentReport[] = [];
  for (const tool of selected) {
    if (!canUseAgentTool(role, tool)) continue;
    try {
      reports.push(await runners[tool](question));
    } catch {
      reports.push({ tool, title: "Live data unavailable", source: "Authorized business data service", metrics: [], status: "unavailable", notes: ["This data source could not be read safely, so no figure has been generated. Try again later or open the source module."] });
    }
  }
  return reports;
}

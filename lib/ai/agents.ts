import type { AdminRole } from "@/lib/admin/access";

export type AgentId = "business" | "sales" | "inventory" | "purchasing" | "accounting";
export type AgentToolId =
  | "sales_summary"
  | "best_sellers"
  | "product_profitability"
  | "inventory_alerts"
  | "slow_movers"
  | "stock_movement"
  | "supplier_prices"
  | "accounting_summary"
  | "outstanding_balances";

export type AgentDefinition = {
  id: AgentId;
  name: string;
  description: string;
  roles: readonly AdminRole[];
  prompts: readonly string[];
};

const OWNER_MANAGER: readonly AdminRole[] = ["SUPER_ADMIN", "BUSINESS_OWNER", "MANAGER"];
const SALES_ROLES: readonly AdminRole[] = [...OWNER_MANAGER, "SALES_MANAGER", "SALES_STAFF", "CASHIER", "ACCOUNTANT"];
const INVENTORY_ROLES: readonly AdminRole[] = [...OWNER_MANAGER, "INVENTORY_MANAGER", "WAREHOUSE_STAFF"];
const PURCHASING_ROLES: readonly AdminRole[] = [...OWNER_MANAGER, "PROCUREMENT_STAFF", "INVENTORY_MANAGER", "ACCOUNTANT"];
const ACCOUNTING_ROLES: readonly AdminRole[] = [...OWNER_MANAGER, "ACCOUNTANT"];

export const AI_AGENTS: readonly AgentDefinition[] = [
  {
    id: "business",
    name: "Business copilot",
    description: "A read-only overview across the business areas your role can access.",
    roles: OWNER_MANAGER,
    prompts: ["Summarize today's business performance", "Compare this month’s sales with last month", "What needs attention in inventory?"],
  },
  {
    id: "sales",
    name: "Sales intelligence",
    description: "Sales totals and best sellers from issued invoices.",
    roles: SALES_ROLES,
    prompts: ["What were today's sales?", "Which products sold the most this month?", "Which products generated the highest profit?"],
  },
  {
    id: "inventory",
    name: "Inventory intelligence",
    description: "Low stock, stock movement and slow-moving tracked products.",
    roles: INVENTORY_ROLES,
    prompts: ["Which products are running low?", "What stock moved in the last 30 days?", "Which machines have not sold in 90 days?"],
  },
  {
    id: "purchasing",
    name: "Purchasing assistant",
    description: "Recent supplier price comparisons and replenishment gaps.",
    roles: PURCHASING_ROLES,
    prompts: ["Which suppliers offer better purchasing prices?", "What products are below reorder level?"],
  },
  {
    id: "accounting",
    name: "Accounting assistant",
    description: "Period summaries from posted journal entries and control accounts.",
    roles: ACCOUNTING_ROLES,
    prompts: ["Summarize this month’s posted income and expenses", "What are the current receivable and payable balances?"],
  },
];

const TOOL_ROLES: Record<AgentToolId, readonly AdminRole[]> = {
  sales_summary: SALES_ROLES,
  best_sellers: SALES_ROLES,
  product_profitability: SALES_ROLES,
  inventory_alerts: INVENTORY_ROLES,
  slow_movers: INVENTORY_ROLES,
  stock_movement: INVENTORY_ROLES,
  supplier_prices: PURCHASING_ROLES,
  accounting_summary: ACCOUNTING_ROLES,
  outstanding_balances: ACCOUNTING_ROLES,
};

export function canUseAgent(role: AdminRole, agentId: AgentId) {
  return AI_AGENTS.some((agent) => agent.id === agentId && agent.roles.includes(role));
}

export function availableAgents(role: AdminRole) {
  return AI_AGENTS.filter((agent) => agent.roles.includes(role));
}

export function canUseAgentTool(role: AdminRole, tool: AgentToolId) {
  return TOOL_ROLES[tool].includes(role);
}

const patterns: Record<AgentToolId, RegExp> = {
  sales_summary: /\b(sales?|revenue|invoices?|turnover|orders?|business performance|compare|today|yesterday|this month|last month|month to date|week)\b|बिक्री|बिक्रीको|आम्दानी|अर्डर|आजको|यो महिना/i,
  best_sellers: /\b(best[ -]?sell|top[- ]selling|most[- ]sold|highest[- ]selling|products? sold (the )?(most|best)|most.*sold|कुन .*धेरै बिक्री)\b/i,
  product_profitability: /\b(product|item|machine|sku).{0,45}\b(profit|margin|profitable)\b|\b(profit|margin|profitable).{0,45}\b(product|item|machine|sku)\b/i,
  inventory_alerts: /\b(low[- ]?stock|out[- ]of[- ]stock|reorder|replenish|inventory|stock level|running low|available stock)\b|कम स्टक|स्टक कम|पुनः.?अर्डर/i,
  slow_movers: /\b(slow[- ]moving|dead[- ]stock|not sold|no sales|haven.t sold|90 days|ninety days)\b|बिक्री नभएको/i,
  stock_movement: /\b(stock movement|stock moved|movement history|stock in|stock out|inventory movement)\b|स्टक आवागमन/i,
  supplier_prices: /\b(supplier|suppliers|purchas(e|ing) price|purchase cost|vendor price|better price|price comparison)\b|आपूर्तिकर्ता|खरिद मूल्य/i,
  accounting_summary: /\b(accounting|profit and loss|income|expenses?|net profit|cash balance|bank balance|cash flow|trial balance|financial summary|journal|posted income)\b|लेखा|नाफा|खर्च|बैंक मौज्दात/i,
  outstanding_balances: /\b(receivables?|payables?|outstanding|customer balance|supplier balance|accounts receivable|accounts payable|overdue)\b|बक्यौता|उठ्न बाँकी|तिर्न बाँकी/i,
};

/** Picks a fixed set of server-owned read tools. The model cannot choose or invoke tools. */
export function selectAgentTools(agentId: AgentId, role: AdminRole, question: string): AgentToolId[] {
  if (!canUseAgent(role, agentId)) return [];
  const q = question.slice(0, 2400);
  const matched = (Object.keys(patterns) as AgentToolId[]).filter((tool) => patterns[tool].test(q) && canUseAgentTool(role, tool));
  const allowedByAgent: Record<AgentId, readonly AgentToolId[]> = {
    business: Object.keys(patterns) as AgentToolId[],
    sales: ["sales_summary", "best_sellers", "product_profitability"],
    inventory: ["inventory_alerts", "slow_movers", "stock_movement"],
    purchasing: ["supplier_prices", "inventory_alerts"],
    accounting: ["accounting_summary", "outstanding_balances"],
  };
  const selected = matched.filter((tool) => allowedByAgent[agentId].includes(tool));

  if (agentId === "business" && /\b(business|company|overall|daily|today.?s)\b.{0,35}\b(summary|overview|health|performance)\b|\b(summary|overview|health|performance)\b.{0,35}\b(business|company)\b|\b(summarize|summarise)\b.{0,35}\b(business|today|company)\b/i.test(q)) {
    for (const tool of ["sales_summary", "inventory_alerts", "accounting_summary"] as const) {
      if (canUseAgentTool(role, tool) && !selected.includes(tool)) selected.push(tool);
    }
  }
  return selected.slice(0, 3);
}
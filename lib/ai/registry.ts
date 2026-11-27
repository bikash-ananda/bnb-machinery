import type { AdminRole } from "@/lib/admin/access";
import type { AgentId as AdminAgentId } from "@/lib/ai/agents";

export type AgentChannel = "website" | "admin" | "whatsapp";
export type AgentVisibility = "public" | "private";
export type AgentMode = "read_only" | "draft_only";
export type AgentAction =
  | "quote_issue"
  | "order_create"
  | "order_confirm"
  | "price_change"
  | "stock_adjust"
  | "purchase_create"
  | "payment_record"
  | "accounting_post"
  | "refund"
  | "customer_update"
  | "supplier_update"
  | "product_publish"
  | "outbound_message"
  | "service_booking";

export type PlatformAgentId =
  | "customer_support"
  | "product_discovery"
  | "spare_parts_technical"
  | "sales_quotation_intake"
  | "product_content"
  | "service_intake"
  | "business"
  | "sales"
  | "inventory"
  | "purchasing"
  | "accounting";

export type AgentDefinition = {
  id: PlatformAgentId;
  name: string;
  description: string;
  visibility: AgentVisibility;
  channels: readonly AgentChannel[];
  mode: AgentMode;
  roles: readonly AdminRole[];
  dataDomains: readonly string[];
  allowedTools: readonly string[];
  approvalRequiredFor: readonly AgentAction[];
  version: 1;
};

const OWNER_MANAGER = ["SUPER_ADMIN", "BUSINESS_OWNER", "MANAGER"] as const;
const SALES_ROLES = [...OWNER_MANAGER, "SALES_MANAGER", "SALES_STAFF", "CASHIER", "ACCOUNTANT"] as const;
const INVENTORY_ROLES = [...OWNER_MANAGER, "INVENTORY_MANAGER", "WAREHOUSE_STAFF"] as const;
const PURCHASING_ROLES = [...OWNER_MANAGER, "PROCUREMENT_STAFF", "INVENTORY_MANAGER", "ACCOUNTANT"] as const;
const ACCOUNTING_ROLES = [...OWNER_MANAGER, "ACCOUNTANT"] as const;
const NO_PUBLIC_TOOLS: readonly string[] = [];

const ALWAYS_APPROVED_ACTIONS: readonly AgentAction[] = [
  "quote_issue",
  "order_create",
  "order_confirm",
  "price_change",
  "stock_adjust",
  "purchase_create",
  "payment_record",
  "accounting_post",
  "refund",
  "customer_update",
  "supplier_update",
  "product_publish",
  "outbound_message",
  "service_booking",
];

function definition(
  value: Omit<AgentDefinition, "version" | "approvalRequiredFor">,
): AgentDefinition {
  return { ...value, version: 1, approvalRequiredFor: ALWAYS_APPROVED_ACTIONS };
}

/**
 * Versioned platform-wide registry. This registry describes access; it does not
 * itself grant database access. Every data/tool request must still be authorized
 * by its owning server route and existing domain service.
 */
export const PLATFORM_AGENTS: readonly AgentDefinition[] = [
  definition({
    id: "customer_support",
    name: "Customer Support",
    description: "Company information, support triage and human handoff.",
    visibility: "public",
    channels: ["website", "whatsapp"],
    mode: "read_only",
    roles: [],
    dataDomains: ["approved_public_knowledge"],
    allowedTools: NO_PUBLIC_TOOLS,
  }),
  definition({
    id: "product_discovery",
    name: "Product Discovery",
    description: "Search approved published products, categories, brands and public specifications.",
    visibility: "public",
    channels: ["website", "whatsapp"],
    mode: "read_only",
    roles: [],
    dataDomains: ["neon_public_catalog"],
    allowedTools: ["public_catalog_search"],
  }),
  definition({
    id: "spare_parts_technical",
    name: "Spare Parts & Technical",
    description: "Collect machine and part details; use only approved catalog/manual evidence and escalate uncertain compatibility.",
    visibility: "public",
    channels: ["website", "whatsapp"],
    mode: "read_only",
    roles: [],
    dataDomains: ["neon_public_catalog", "approved_public_documents"],
    allowedTools: ["public_catalog_search", "public_document_search"],
  }),
  definition({
    id: "sales_quotation_intake",
    name: "Sales & Quotation Intake",
    description: "Collect a minimum set of customer details and prepare an inquiry or quotation request for staff review.",
    visibility: "public",
    channels: ["website", "whatsapp"],
    mode: "draft_only",
    roles: [],
    dataDomains: ["approved_public_catalog", "private_vps_inquiry_service"],
    allowedTools: ["public_catalog_search", "create_pending_inquiry"],
  }),
  definition({
    id: "product_content",
    name: "Product Content Assistant",
    description: "Prepare unverified product content drafts from staff-provided material; never publish.",
    visibility: "private",
    channels: ["admin"],
    mode: "draft_only",
    roles: OWNER_MANAGER,
    dataDomains: ["private_vps_product_drafts", "approved_public_catalog"],
    allowedTools: ["read_product_draft", "create_product_content_draft"],
  }),
  definition({
    id: "service_intake",
    name: "Service Intake",
    description: "Collect repair and maintenance requests for staff triage; does not confirm appointments.",
    visibility: "public",
    channels: ["website", "whatsapp"],
    mode: "draft_only",
    roles: [],
    dataDomains: ["approved_public_knowledge", "private_vps_service_intake"],
    allowedTools: ["create_pending_service_request"],
  }),
  definition({
    id: "business",
    name: "Business Copilot",
    description: "Role-filtered, read-only business overview.",
    visibility: "private",
    channels: ["admin"],
    mode: "read_only",
    roles: OWNER_MANAGER,
    dataDomains: ["private_vps_business_reports"],
    allowedTools: ["sales_summary", "inventory_alerts", "accounting_summary"],
  }),
  definition({
    id: "sales",
    name: "Sales Intelligence",
    description: "Role-filtered sales reports from issued invoices.",
    visibility: "private",
    channels: ["admin"],
    mode: "read_only",
    roles: SALES_ROLES,
    dataDomains: ["private_vps_sales_reports"],
    allowedTools: ["sales_summary", "best_sellers", "product_profitability"],
  }),
  definition({
    id: "inventory",
    name: "Inventory Intelligence",
    description: "Role-filtered stock alerts and movement reports.",
    visibility: "private",
    channels: ["admin"],
    mode: "read_only",
    roles: INVENTORY_ROLES,
    dataDomains: ["private_vps_inventory"],
    allowedTools: ["inventory_alerts", "slow_movers", "stock_movement"],
  }),
  definition({
    id: "purchasing",
    name: "Purchasing Assistant",
    description: "Role-filtered supplier price and replenishment reports.",
    visibility: "private",
    channels: ["admin"],
    mode: "read_only",
    roles: PURCHASING_ROLES,
    dataDomains: ["private_vps_purchasing", "private_vps_supplier_costs"],
    allowedTools: ["supplier_prices", "inventory_alerts"],
  }),
  definition({
    id: "accounting",
    name: "Accounting Assistant",
    description: "Role-filtered reports from posted journals and control accounts.",
    visibility: "private",
    channels: ["admin"],
    mode: "read_only",
    roles: ACCOUNTING_ROLES,
    dataDomains: ["private_vps_accounting"],
    allowedTools: ["accounting_summary", "outstanding_balances"],
  }),
];

const REGISTRY_BY_ID = new Map<PlatformAgentId, AgentDefinition>(
  PLATFORM_AGENTS.map((agent) => [agent.id, agent]),
);

export function getPlatformAgent(id: string): AgentDefinition | null {
  return REGISTRY_BY_ID.get(id as PlatformAgentId) ?? null;
}

export function canAccessPlatformAgent(
  id: string,
  channel: AgentChannel,
  role?: AdminRole,
): boolean {
  const agent = getPlatformAgent(id);
  if (!agent || !agent.channels.includes(channel)) return false;
  if (agent.visibility === "public") return channel !== "admin";
  return channel === "admin" && Boolean(role && agent.roles.includes(role));
}

export function getPlatformAgentsForChannel(
  channel: AgentChannel,
  role?: AdminRole,
): AgentDefinition[] {
  return PLATFORM_AGENTS.filter((agent) => canAccessPlatformAgent(agent.id, channel, role));
}

/** All consequential actions require a human approval, regardless of agent or channel. */
export function requiresHumanApproval(action: AgentAction): true {
  return ALWAYS_APPROVED_ACTIONS.includes(action);
}

/** Existing private admin agents remain mapped to their established role/tool checks. */
export function isExistingAdminAgent(id: string): id is AdminAgentId {
  return id === "business" || id === "sales" || id === "inventory" || id === "purchasing" || id === "accounting";
}

export const ROLES = [
  "SUPER_ADMIN", "BUSINESS_OWNER", "MANAGER", "SALES_MANAGER", "SALES_STAFF", "CASHIER",
  "INVENTORY_MANAGER", "WAREHOUSE_STAFF", "PROCUREMENT_STAFF", "ACCOUNTANT", "SERVICE_MANAGER", "TECHNICIAN",
] as const;
export type AdminRole = (typeof ROLES)[number];

export const ROLE_LABEL: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin", BUSINESS_OWNER: "Business Owner", MANAGER: "Manager", SALES_MANAGER: "Sales Manager",
  SALES_STAFF: "Sales Staff", CASHIER: "Cashier", INVENTORY_MANAGER: "Inventory Manager", WAREHOUSE_STAFF: "Warehouse Staff",
  PROCUREMENT_STAFF: "Procurement Staff", ACCOUNTANT: "Accountant", SERVICE_MANAGER: "Service Manager", TECHNICIAN: "Technician",
};

export const isRole = (v: unknown): v is AdminRole => typeof v === "string" && (ROLES as readonly string[]).includes(v);

export type ModuleId =
  | "dashboard" | "orders" | "reviews" | "quotations" | "support" | "customers" | "catalog" | "inventory" | "procurement"
  | "billing" | "pos" | "service" | "cms" | "analytics" | "automation" | "ai" | "users" | "audit" | "settings";

export type AdminModule = { id: ModuleId; label: string; group: string; ready: boolean; roles: readonly AdminRole[]; summary: string; features: string[] };

const SA: AdminRole[] = ["SUPER_ADMIN"];
const OWN: AdminRole[] = [...SA, "BUSINESS_OWNER"];
const MGR: AdminRole[] = [...OWN, "MANAGER"];
const SALES: AdminRole[] = [...MGR, "SALES_MANAGER", "SALES_STAFF"];
const SUPPORT: AdminRole[] = [...SALES, "SERVICE_MANAGER", "TECHNICIAN"];

export const MODULES: AdminModule[] = [
  { id: "dashboard", label: "Dashboard", group: "Overview", ready: true, roles: ROLES, summary: "Live counts from real data.", features: [] },
  { id: "orders", label: "Orders", group: "Sales", ready: true, roles: [...SALES, "CASHIER"], summary: "Website orders and their status.", features: [] },
  { id: "quotations", label: "Quotations", group: "Sales", ready: true, roles: SALES, summary: "Review and track incoming customer quotation requests.", features: ["Retail, wholesale and dealer requests", "Customer contact and delivery district", "Request status and item lines"] },
  { id: "support", label: "Customer support", group: "Sales", ready: true, roles: SUPPORT, summary: "Review customer chat transcripts and resolve human handoffs.", features: ["Website conversations", "Needs-human queue", "Transcript and resolution status"] },
  { id: "customers", label: "Customers & CRM", group: "Sales", ready: false, roles: SALES, summary: "One profile per customer with full history.", features: ["Retail, wholesale, dealer and business customers", "Leads, follow-ups and tasks", "Customer-specific pricing", "Orders, payments and service history in one profile"] },
  { id: "reviews", label: "Reviews", group: "Sales", ready: true, roles: [...MGR, "SALES_MANAGER"], summary: "Approve or reject customer reviews.", features: [] },
  { id: "catalog", label: "Catalog", group: "Catalog & stock", ready: false, roles: [...MGR, "SALES_MANAGER", "INVENTORY_MANAGER"], summary: "Products, categories, brands, media and prices. Product entry currently lives in the staff inventory portal.", features: ["Products, models, SKUs and part numbers", "Categories and brands", "Images, videos and documents", "Retail, wholesale and sale pricing"] },
  { id: "inventory", label: "Inventory & warehouse", group: "Catalog & stock", ready: true, roles: [...MGR, "INVENTORY_MANAGER", "WAREHOUSE_STAFF", "PROCUREMENT_STAFF"], summary: "Live stock, reservations, reorder levels and ledger-backed adjustments across configured stock locations.", features: ["Stock on hand and reserved quantities", "Low-stock visibility", "Opening balances and stock-count adjustments", "Adjustment audit trail and accounting entries"] },
  { id: "procurement", label: "Procurement", group: "Catalog & stock", ready: false, roles: [...MGR, "PROCUREMENT_STAFF", "INVENTORY_MANAGER", "ACCOUNTANT"], summary: "Suppliers to purchase orders to goods receipt.", features: ["Suppliers and supplier products", "Purchase requests and orders", "Goods receiving", "Supplier invoices and payments"] },
  { id: "billing", label: "Billing & accounts", group: "Finance", ready: false, roles: [...MGR, "ACCOUNTANT", "CASHIER"], summary: "Invoices, payments, credit notes.", features: ["Sales and purchase invoices with numbering", "Partial payments and credit sales", "Refunds, credit and debit notes", "Printable invoice PDF; Nepal tax rules to be verified before launch"] },
  { id: "pos", label: "Point of sale", group: "Finance", ready: true, roles: [...MGR, "CASHIER", "SALES_STAFF"], summary: "Shop counter sales on the same catalogue and stock.", features: ["Barcode and SKU scan", "Walk-in and registered customers", "Cash, digital and credit payment", "Receipts, returns and end-of-day report"] },
  { id: "service", label: "Service & warranty", group: "Operations", ready: false, roles: [...MGR, "SERVICE_MANAGER", "TECHNICIAN"], summary: "Repairs, installation and warranty claims.", features: ["Service requests and technician assignment", "Service quotation and invoice", "Warranty claims", "Service history per machine"] },
  { id: "cms", label: "Website content", group: "Operations", ready: false, roles: [...MGR, "SALES_MANAGER"], summary: "Edit pages, banners and news without code.", features: ["Pages, banners and gallery", "Blog and news", "FAQs", "SEO fields"] },
  { id: "analytics", label: "Analytics", group: "Insights", ready: false, roles: [...MGR, "ACCOUNTANT"], summary: "Real reports from real data.", features: ["Sales and revenue", "Best-selling products", "Inventory value and ageing", "Profitability where accounting data supports it"] },
  { id: "ai", label: "AI business assistant", group: "Insights", ready: true, roles: [...MGR, "SALES_MANAGER", "SALES_STAFF", "CASHIER", "INVENTORY_MANAGER", "WAREHOUSE_STAFF", "PROCUREMENT_STAFF", "ACCOUNTANT"], summary: "Role-scoped, read-only business agents grounded in invoices, inventory, purchasing and posted journals.", features: ["Live business questions", "Source-backed figures", "Role-scoped data access", "Audited AI requests"] },
  { id: "automation", label: "Automation center", group: "Operations", ready: true, roles: [...MGR, "ACCOUNTANT", "INVENTORY_MANAGER"], summary: "Business workflows, scheduled follow-ups and a monitored delivery queue.", features: ["Order and payment emails", "Inventory reorder alerts", "Customer follow-ups", "Daily sales and collection digest"] },
  { id: "users", label: "Users & roles", group: "Administration", ready: true, roles: OWN, summary: "Create staff accounts, reset passwords and manage staff access.", features: [] },
  { id: "audit", label: "Audit log", group: "Administration", ready: true, roles: OWN, summary: "Who did what, and when.", features: [] },
  { id: "settings", label: "Settings", group: "Administration", ready: false, roles: SA, summary: "Company profile, tax, delivery and payment providers.", features: ["Company and branch details", "Delivery zones and charges", "Payment provider connections", "Notification channels"] },
];

export const canAccess = (role: AdminRole, id: ModuleId) => !!MODULES.find((m) => m.id === id)?.roles.includes(role);
export const hrefOf = (id: ModuleId) => (id === "dashboard" ? "/admin" : `/admin/${id}`);

export function navFor(role: AdminRole) {
  const groups: { group: string; items: { id: ModuleId; label: string; href: string; ready: boolean }[] }[] = [];
  for (const m of MODULES) {
    if (!m.roles.includes(role)) continue;
    let g = groups.find((x) => x.group === m.group);
    if (!g) groups.push((g = { group: m.group, items: [] }));
    g.items.push({ id: m.id, label: m.label, href: hrefOf(m.id), ready: m.ready });
  }
  return groups;
}

const COMMON = ["example", "password", "12345678", "qwerty123", "admin123"];
export function passwordProblem(pw: string, email = ""): string | null {
  if (pw.length < 10) return "Use at least 10 characters.";
  if (pw.length > 100) return "Use at most 100 characters.";
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) return "Include an uppercase letter, a lowercase letter and a number.";
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && pw.toLowerCase().includes(local)) return "Do not include your email name in the password.";
  if (COMMON.some((c) => pw.toLowerCase().includes(c))) return "That password is too common.";
  return null;
}

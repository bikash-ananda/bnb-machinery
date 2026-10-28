import { describe, expect, it } from "vitest";
import { availableAgents, canUseAgent, selectAgentTools } from "@/lib/ai/agents";

describe("AI agent permissions and tool selection", () => {
  it("limits agents and tools to the authenticated role", () => {
    expect(canUseAgent("CASHIER", "sales")).toBe(true);
    expect(canUseAgent("CASHIER", "inventory")).toBe(false);
    expect(selectAgentTools("inventory", "CASHIER", "which products are low stock")).toEqual([]);
    expect(selectAgentTools("accounting", "PROCUREMENT_STAFF", "show payables")).toEqual([]);
  });

  it("selects the explicit product-profit limitation instead of inventing margins", () => {
    expect(selectAgentTools("sales", "SALES_STAFF", "Which products generated the highest profit?")).toEqual(["product_profitability"]);
  });

  it("builds a three-domain business snapshot only for an owner or manager", () => {
    expect(selectAgentTools("business", "BUSINESS_OWNER", "Summarize today's business performance")).toEqual(["sales_summary", "inventory_alerts", "accounting_summary"]);
    expect(availableAgents("WAREHOUSE_STAFF").map((agent) => agent.id)).toEqual(["inventory"]);
  });
});
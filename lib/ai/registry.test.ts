import { describe, expect, it } from "vitest";
import {
  canAccessPlatformAgent,
  getPlatformAgent,
  getPlatformAgentsForChannel,
  isExistingAdminAgent,
  requiresHumanApproval,
} from "@/lib/ai/registry";

describe("platform AI agent registry", () => {
  it("exposes only public agents on public channels", () => {
    expect(canAccessPlatformAgent("product_discovery", "website")).toBe(true);
    expect(canAccessPlatformAgent("inventory", "website")).toBe(false);
    expect(canAccessPlatformAgent("accounting", "whatsapp")).toBe(false);
    expect(getPlatformAgentsForChannel("website").every((agent) => agent.visibility === "public")).toBe(true);
  });

  it("enforces role-based access to private agents", () => {
    expect(canAccessPlatformAgent("inventory", "admin", "WAREHOUSE_STAFF")).toBe(true);
    expect(canAccessPlatformAgent("accounting", "admin", "WAREHOUSE_STAFF")).toBe(false);
    expect(canAccessPlatformAgent("business", "admin", "BUSINESS_OWNER")).toBe(true);
    expect(canAccessPlatformAgent("business", "admin")).toBe(false);
  });

  it("keeps customer and staff data domains separated", () => {
    expect(getPlatformAgent("product_discovery")?.dataDomains).toEqual(["neon_public_catalog"]);
    expect(getPlatformAgent("accounting")?.dataDomains).toContain("private_vps_accounting");
    expect(getPlatformAgent("accounting")?.channels).toEqual(["admin"]);
  });

  it("requires human approval for every consequential action", () => {
    for (const action of [
      "quote_issue", "order_create", "order_confirm", "price_change", "stock_adjust",
      "purchase_create", "payment_record", "accounting_post", "refund", "customer_update",
      "supplier_update", "product_publish", "outbound_message", "service_booking",
    ] as const) {
      expect(requiresHumanApproval(action)).toBe(true);
    }
  });

  it("maps the five existing admin agents without creating duplicate identities", () => {
    expect(isExistingAdminAgent("business")).toBe(true);
    expect(isExistingAdminAgent("accounting")).toBe(true);
    expect(isExistingAdminAgent("product_discovery")).toBe(false);
  });

  it("rejects unknown agents and mismatched channels", () => {
    expect(getPlatformAgent("unknown")).toBeNull();
    expect(canAccessPlatformAgent("unknown", "website")).toBe(false);
    expect(canAccessPlatformAgent("product_content", "whatsapp")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { canChangeAdminRole, canCreateAdminRole, canManageAdminTarget, protectsLastActiveSuperAdminFromDeactivation, protectsLastActiveSuperAdminFromDemotion } from "@/lib/admin/user-management";

describe("admin user-management authorization rules", () => {
  it("allows Business Owners to create staff roles but not privileged roles", () => {
    expect(canCreateAdminRole("BUSINESS_OWNER", "MANAGER")).toBe(true);
    expect(canCreateAdminRole("BUSINESS_OWNER", "SUPER_ADMIN")).toBe(false);
    expect(canCreateAdminRole("BUSINESS_OWNER", "BUSINESS_OWNER")).toBe(false);
  });
  it("allows only Super Admin to create privileged roles and change roles", () => {
    expect(canCreateAdminRole("SUPER_ADMIN", "SUPER_ADMIN")).toBe(true);
    expect(canChangeAdminRole("SUPER_ADMIN")).toBe(true);
    expect(canChangeAdminRole("BUSINESS_OWNER")).toBe(false);
  });
  it("prevents Business Owners from managing privileged accounts", () => {
    expect(canManageAdminTarget("BUSINESS_OWNER", "MANAGER")).toBe(true);
    expect(canManageAdminTarget("BUSINESS_OWNER", "SUPER_ADMIN")).toBe(false);
    expect(canManageAdminTarget("BUSINESS_OWNER", "BUSINESS_OWNER")).toBe(false);
  });
  it("protects the last active Super Admin from demotion", () => {
    expect(protectsLastActiveSuperAdminFromDemotion("SUPER_ADMIN", true, "MANAGER", 1)).toBe(true);
    expect(protectsLastActiveSuperAdminFromDemotion("SUPER_ADMIN", true, "MANAGER", 2)).toBe(false);
    expect(protectsLastActiveSuperAdminFromDemotion("SUPER_ADMIN", false, "MANAGER", 1)).toBe(false);
  });
  it("protects the last active Super Admin from deactivation", () => {
    expect(protectsLastActiveSuperAdminFromDeactivation("SUPER_ADMIN", true, 1)).toBe(true);
    expect(protectsLastActiveSuperAdminFromDeactivation("SUPER_ADMIN", true, 2)).toBe(false);
    expect(protectsLastActiveSuperAdminFromDeactivation("MANAGER", true, 1)).toBe(false);
  });
});

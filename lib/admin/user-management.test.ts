import { describe, expect, it } from "vitest";
import {
  canChangeAdminRole,
  canCreateAdminRole,
  canManageAdminTarget,
  protectsLastActiveSuperAdminFromDeactivation,
  protectsLastActiveSuperAdminFromDemotion,
} from "@/lib/admin/user-management";

describe("admin user-management authorization policy", () => {
  it("allows Business Owners to create MANAGER and regular staff accounts", () => {
    expect(canCreateAdminRole("BUSINESS_OWNER", "MANAGER")).toBe(true);
    expect(canCreateAdminRole("BUSINESS_OWNER", "SALES_STAFF")).toBe(true);
  });

  it("prevents Business Owners from creating either privileged role", () => {
    expect(canCreateAdminRole("BUSINESS_OWNER", "SUPER_ADMIN")).toBe(false);
    expect(canCreateAdminRole("BUSINESS_OWNER", "BUSINESS_OWNER")).toBe(false);
  });

  it("allows only valid roles to be created and denies staff account creation by other roles", () => {
    expect(canCreateAdminRole("SUPER_ADMIN", "BUSINESS_OWNER")).toBe(true);
    expect(canCreateAdminRole("MANAGER", "SALES_STAFF")).toBe(false);
    expect(canCreateAdminRole("BUSINESS_OWNER", "NOT_A_ROLE")).toBe(false);
  });

  it("lets Business Owners manage ordinary staff but not privileged accounts", () => {
    expect(canManageAdminTarget("BUSINESS_OWNER", "MANAGER")).toBe(true);
    expect(canManageAdminTarget("BUSINESS_OWNER", "SALES_STAFF")).toBe(true);
    expect(canManageAdminTarget("BUSINESS_OWNER", "BUSINESS_OWNER")).toBe(false);
    expect(canManageAdminTarget("BUSINESS_OWNER", "SUPER_ADMIN")).toBe(false);
  });

  it("allows only Super Admin to grant or revoke roles", () => {
    expect(canChangeAdminRole("SUPER_ADMIN")).toBe(true);
    expect(canChangeAdminRole("BUSINESS_OWNER")).toBe(false);
    expect(canChangeAdminRole("MANAGER")).toBe(false);
  });

  it("protects the last active Super Admin from demotion", () => {
    expect(protectsLastActiveSuperAdminFromDemotion("SUPER_ADMIN", true, "MANAGER", 1)).toBe(true);
    expect(protectsLastActiveSuperAdminFromDemotion("SUPER_ADMIN", true, "BUSINESS_OWNER", 1)).toBe(true);
    expect(protectsLastActiveSuperAdminFromDemotion("SUPER_ADMIN", true, "MANAGER", 2)).toBe(false);
    expect(protectsLastActiveSuperAdminFromDemotion("SUPER_ADMIN", false, "MANAGER", 1)).toBe(false);
    expect(protectsLastActiveSuperAdminFromDemotion("MANAGER", true, "SALES_STAFF", 1)).toBe(false);
    expect(protectsLastActiveSuperAdminFromDemotion("SUPER_ADMIN", true, "SUPER_ADMIN", 1)).toBe(false);
  });

  it("protects the last active Super Admin from deactivation", () => {
    expect(protectsLastActiveSuperAdminFromDeactivation("SUPER_ADMIN", true, 1)).toBe(true);
    expect(protectsLastActiveSuperAdminFromDeactivation("SUPER_ADMIN", true, 2)).toBe(false);
    expect(protectsLastActiveSuperAdminFromDeactivation("SUPER_ADMIN", false, 1)).toBe(false);
    expect(protectsLastActiveSuperAdminFromDeactivation("MANAGER", true, 1)).toBe(false);
  });
});

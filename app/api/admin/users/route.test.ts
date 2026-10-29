import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  adminApi: vi.fn(),
  dbRequest: vi.fn(),
  generateTempPassword: vi.fn(() => "TmpPassword123"),
  hashPassword: vi.fn(async (value: string) => "hashed:" + value),
  logAudit: vi.fn(async () => undefined),
  normalizeEmail: vi.fn((value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : ""),
  revokeUserSessions: vi.fn(async () => undefined),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/admin-api", () => ({
  adminApi: mocks.adminApi,
  fail: (error: string, status = 400) => Response.json({ error }, { status }),
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
}));
vi.mock("@/lib/server/admin-auth", () => ({
  generateTempPassword: mocks.generateTempPassword,
  hashPassword: mocks.hashPassword,
  logAudit: mocks.logAudit,
  normalizeEmail: mocks.normalizeEmail,
  revokeUserSessions: mocks.revokeUserSessions,
}));
vi.mock("@/lib/server/supabase", () => ({ dbRequest: mocks.dbRequest }));

import { PATCH, POST } from "@/app/api/admin/users/route";

const TARGET_ID = "22222222-2222-4222-8222-222222222222";
const ACTOR_ID = "11111111-1111-4111-8111-111111111111";

function request(body: unknown) {
  return new Request("https://example.test/api/admin/users", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patchRequest(body: unknown) {
  return new Request("https://example.test/api/admin/users", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

let actorRole = "BUSINESS_OWNER";
let target = { id: TARGET_ID, role: "MANAGER", active: true };
let activeSuperAdminCount = 1;

describe("admin users API authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actorRole = "BUSINESS_OWNER";
    target = { id: TARGET_ID, role: "MANAGER", active: true };
    activeSuperAdminCount = 1;

    mocks.adminApi.mockImplementation(async () => ({
      session: { userId: ACTOR_ID, email: "actor@example.test", role: actorRole, mustChange: false },
    }));
    mocks.dbRequest.mockImplementation(async (resource: string, options?: { method?: string }) => {
      if (resource.startsWith("admin_users?select=id,role,active&id=eq.")) return [target];
      if (resource.startsWith("admin_users?select=id&role=eq.SUPER_ADMIN")) {
        return Array.from({ length: activeSuperAdminCount }, (_, index) => ({ id: "admin-" + index }));
      }
      if (resource === "admin_users" && options?.method === "POST") return [{ id: "created-user" }];
      if (resource.startsWith("admin_users?id=eq.") && options?.method === "PATCH") return [{ id: TARGET_ID }];
      return [];
    });
  });

  it("allows a Business Owner to create a MANAGER account", async () => {
    const response = await POST(request({ email: "manager@example.test", name: "Store Manager", role: "MANAGER" }));
    expect(response.status).toBe(200);
    expect(mocks.dbRequest).toHaveBeenCalledWith("admin_users", expect.objectContaining({ method: "POST" }));
  });

  it.each(["SUPER_ADMIN", "BUSINESS_OWNER"])(
    "blocks a Business Owner from creating %s accounts",
    async (role) => {
      const response = await POST(request({ email: "privileged@example.test", name: "Privileged User", role }));
      expect(response.status).toBe(403);
      expect(mocks.dbRequest).not.toHaveBeenCalled();
    },
  );

  it.each(["SUPER_ADMIN", "BUSINESS_OWNER"])(
    "blocks a Business Owner from resetting a %s account",
    async (role) => {
      target = { ...target, role };
      const response = await PATCH(patchRequest({ id: TARGET_ID, action: "reset" }));
      expect(response.status).toBe(403);
      expect(mocks.revokeUserSessions).not.toHaveBeenCalled();
      expect(mocks.dbRequest).not.toHaveBeenCalledWith(
        "admin_users?id=eq." + TARGET_ID,
        expect.objectContaining({ method: "PATCH" }),
      );
    },
  );

  it("allows only Super Admin to change existing roles", async () => {
    const response = await PATCH(patchRequest({ id: TARGET_ID, action: "set-role", role: "SALES_STAFF" }));
    expect(response.status).toBe(403);
    expect(mocks.dbRequest).not.toHaveBeenCalledWith(
      "admin_users?id=eq." + TARGET_ID,
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("prevents demoting the last active Super Admin", async () => {
    actorRole = "SUPER_ADMIN";
    target = { ...target, role: "SUPER_ADMIN" };
    const response = await PATCH(patchRequest({ id: TARGET_ID, action: "set-role", role: "MANAGER" }));
    expect(response.status).toBe(409);
    expect(mocks.dbRequest).not.toHaveBeenCalledWith(
      "admin_users?id=eq." + TARGET_ID,
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("prevents deactivating the last active Super Admin", async () => {
    actorRole = "SUPER_ADMIN";
    target = { ...target, role: "SUPER_ADMIN" };
    const response = await PATCH(patchRequest({ id: TARGET_ID, action: "deactivate" }));
    expect(response.status).toBe(409);
    expect(mocks.revokeUserSessions).not.toHaveBeenCalled();
  });

  it("revokes sessions after a successful staff password reset", async () => {
    const response = await PATCH(patchRequest({ id: TARGET_ID, action: "reset" }));
    expect(response.status).toBe(200);
    expect(mocks.revokeUserSessions).toHaveBeenCalledWith(TARGET_ID);
  });

  it("revokes sessions after a successful staff deactivation", async () => {
    const response = await PATCH(patchRequest({ id: TARGET_ID, action: "deactivate" }));
    expect(response.status).toBe(200);
    expect(mocks.revokeUserSessions).toHaveBeenCalledWith(TARGET_ID);
  });
});

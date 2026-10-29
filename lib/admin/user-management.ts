import { isRole, type AdminRole } from "@/lib/admin/access";

/** Roles a signed-in administrator may create through the staff-management API. */
export function canCreateAdminRole(actorRole: AdminRole, requestedRole: unknown): requestedRole is AdminRole {
  if (!isRole(requestedRole)) return false;
  if (actorRole === "SUPER_ADMIN") return true;
  if (actorRole === "BUSINESS_OWNER") {
    return requestedRole !== "SUPER_ADMIN" && requestedRole !== "BUSINESS_OWNER";
  }
  return false;
}

/** Business Owners can manage staff accounts but cannot touch either privileged role. */
export function canManageAdminTarget(actorRole: AdminRole, targetRole: AdminRole): boolean {
  if (actorRole === "BUSINESS_OWNER") {
    return targetRole !== "SUPER_ADMIN" && targetRole !== "BUSINESS_OWNER";
  }
  return actorRole === "SUPER_ADMIN";
}

export function canChangeAdminRole(actorRole: AdminRole): boolean {
  return actorRole === "SUPER_ADMIN";
}

export function protectsLastActiveSuperAdminFromDemotion(
  targetRole: AdminRole,
  targetActive: boolean,
  requestedRole: AdminRole,
  activeSuperAdminCount: number,
): boolean {
  return targetRole === "SUPER_ADMIN"
    && targetActive
    && requestedRole !== "SUPER_ADMIN"
    && activeSuperAdminCount <= 1;
}

export function protectsLastActiveSuperAdminFromDeactivation(
  targetRole: AdminRole,
  targetActive: boolean,
  activeSuperAdminCount: number,
): boolean {
  return targetRole === "SUPER_ADMIN" && targetActive && activeSuperAdminCount <= 1;
}

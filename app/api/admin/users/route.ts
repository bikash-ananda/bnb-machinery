import { NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { isRole, type AdminRole } from "@/lib/admin/access";
import { canChangeAdminRole, canCreateAdminRole, canManageAdminTarget, protectsLastActiveSuperAdminFromDeactivation, protectsLastActiveSuperAdminFromDemotion } from "@/lib/admin/user-management";
import { adminApi, fail, UUID } from "@/lib/server/admin-api";
import { generateTempPassword, hashPassword, logAudit, normalizeEmail, revokeUserSessions } from "@/lib/server/admin-auth";
import { db } from "@/src/db/client";
import { localAdminUsers } from "@/src/modules/local-workflow/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const g = await adminApi(request, "users");
  if ("error" in g) return g.error;
  let body: { email?: unknown; name?: unknown; role?: unknown };
  try { body = await request.json(); } catch { return fail("Invalid request."); }
  const email = normalizeEmail(body.email);
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || name.length < 2 || !isRole(body.role)) return fail("Enter a full email, a name and a valid role.");
  if (!canCreateAdminRole(g.session.role, body.role)) return fail("Not allowed to create an account with that role.", 403);
  const tempPassword = generateTempPassword();
  try {
    const [created] = await db.insert(localAdminUsers).values({
      email, name, role: body.role, passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true, createdBy: g.session.email,
    }).onConflictDoNothing({ target: localAdminUsers.email }).returning({ id: localAdminUsers.id });
    if (!created) return fail("An account with that email already exists.", 409);
    await logAudit(g.session, "user.created", "admin_user", created.id, { email, role: body.role }, request);
    return NextResponse.json({ ok: true, tempPassword });
  } catch { return fail("Could not create the user.", 503); }
}

export async function PATCH(request: Request) {
  const g = await adminApi(request, "users");
  if ("error" in g) return g.error;
  let body: { id?: unknown; action?: unknown; role?: unknown };
  try { body = await request.json(); } catch { return fail("Invalid request."); }
  if (typeof body.id !== "string" || !UUID.test(body.id)) return fail("Invalid account ID.");
  if (body.id === g.session.userId) return fail("You cannot change your own account here. Use Change password.");
  if (!["reset", "activate", "deactivate", "set-role"].includes(String(body.action))) return fail("Invalid action.");

  try {
    return await db.transaction(async tx => {
      const [target] = await tx.select().from(localAdminUsers).where(eq(localAdminUsers.id, body.id as string)).limit(1);
      if (!target) return fail("Account not found.", 404);
      if (!isRole(target.role)) return fail("The target account has an invalid role. Contact the Super Admin.", 409);
      if (!canManageAdminTarget(g.session.role, target.role as AdminRole)) return fail("You do not have permission to manage this privileged account.", 403);

      if (body.action === "set-role") {
        if (!canChangeAdminRole(g.session.role)) return fail("Only the Super Admin can grant or revoke roles.", 403);
        if (!isRole(body.role)) return fail("Choose a valid role.");
        if (target.active && target.role === "SUPER_ADMIN" && body.role !== "SUPER_ADMIN") {
          const [result] = await tx.select({ total: count() }).from(localAdminUsers).where(and(eq(localAdminUsers.role, "SUPER_ADMIN"), eq(localAdminUsers.active, true)));
          if (protectsLastActiveSuperAdminFromDemotion(target.role as AdminRole, target.active, body.role, result.total)) return fail("The last active Super Admin cannot lose Super Admin privileges.", 409);
        }
        await tx.update(localAdminUsers).set({ role: body.role, updatedAt: new Date() }).where(eq(localAdminUsers.id, target.id));
        await tx.insert((await import("@/src/modules/local-workflow/schema")).localAdminAuditEvents).values({ actorUserId: g.session.userId, actorEmail: g.session.email, action: "user.role_changed", targetType: "admin_user", targetId: target.id, details: { from: target.role, to: body.role } });
        return NextResponse.json({ ok: true, role: body.role });
      }

      if (body.action === "deactivate" && target.active && target.role === "SUPER_ADMIN") {
        const [result] = await tx.select({ total: count() }).from(localAdminUsers).where(and(eq(localAdminUsers.role, "SUPER_ADMIN"), eq(localAdminUsers.active, true)));
        if (protectsLastActiveSuperAdminFromDeactivation(target.role as AdminRole, target.active, result.total)) return fail("The last active Super Admin cannot be deactivated.", 409);
      }
      if (body.action === "reset") {
        const tempPassword = generateTempPassword();
        await tx.update(localAdminUsers).set({ passwordHash: await hashPassword(tempPassword), mustChangePassword: true, failedAttempts: 0, lockedUntil: null, updatedAt: new Date() }).where(eq(localAdminUsers.id, target.id));
        await tx.insert((await import("@/src/modules/local-workflow/schema")).localAdminAuditEvents).values({ actorUserId: g.session.userId, actorEmail: g.session.email, action: "user.password_reset", targetType: "admin_user", targetId: target.id, details: { targetRole: target.role } });
        return NextResponse.json({ ok: true, tempPassword });
      }
      const active = body.action === "activate";
      await tx.update(localAdminUsers).set({ active, updatedAt: new Date() }).where(eq(localAdminUsers.id, target.id));
      await tx.insert((await import("@/src/modules/local-workflow/schema")).localAdminAuditEvents).values({ actorUserId: g.session.userId, actorEmail: g.session.email, action: active ? "user.activated" : "user.deactivated", targetType: "admin_user", targetId: target.id, details: { targetRole: target.role } });
      if (!active) await revokeUserSessions(target.id);
      return NextResponse.json({ ok: true });
    });
  } catch { return fail("Could not update the user.", 503); }
}
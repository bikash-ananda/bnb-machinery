import { NextResponse } from "next/server";
import { isRole, type AdminRole } from "@/lib/admin/access";
import { adminApi, fail, UUID } from "@/lib/server/admin-api";
import { generateTempPassword, hashPassword, logAudit, normalizeEmail, revokeUserSessions } from "@/lib/server/admin-auth";
import { dbRequest } from "@/lib/server/supabase";

export const runtime = "nodejs";

type TargetUser = { id: string; role: string; active: boolean };

async function findTarget(id: string) {
  const rows = await dbRequest<TargetUser[]>(
    "admin_users?select=id,role,active&id=eq." + encodeURIComponent(id) + "&limit=1",
  );
  return rows[0] ?? null;
}

function canManageTarget(actorRole: AdminRole, targetRole: string) {
  // Business owners can manage staff, but never privileged owner or Super Admin accounts.
  if (actorRole === "BUSINESS_OWNER") {
    return targetRole !== "SUPER_ADMIN" && targetRole !== "BUSINESS_OWNER";
  }
  return actorRole === "SUPER_ADMIN";
}

export async function POST(request: Request) {
  const g = await adminApi(request, "users");
  if ("error" in g) return g.error;

  let b: { email?: unknown; name?: unknown; role?: unknown };
  try {
    b = await request.json();
  } catch {
    return fail("Invalid request.");
  }

  const email = normalizeEmail(b.email);
  const name = typeof b.name === "string" ? b.name.trim().slice(0, 80) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length < 2 || !isRole(b.role)) {
    return fail("Enter a full email, a name and a valid role.");
  }

  if (g.session.role !== "SUPER_ADMIN" && g.session.role !== "BUSINESS_OWNER") {
    return fail("Not allowed.", 403);
  }
  if (g.session.role === "BUSINESS_OWNER" && (b.role === "SUPER_ADMIN" || b.role === "BUSINESS_OWNER")) {
    return fail("Business Owners can create staff accounts, but cannot create privileged accounts.", 403);
  }

  const tempPassword = generateTempPassword();
  try {
    const rows = await dbRequest<{ id: string }[]>("admin_users", {
      method: "POST",
      headers: { prefer: "return=representation,resolution=ignore-duplicates" },
      body: JSON.stringify({
        email,
        name,
        role: b.role,
        password_hash: await hashPassword(tempPassword),
        must_change_password: true,
        created_by: g.session.email,
      }),
    });
    if (!rows.length) return fail("An account with that email already exists.", 409);

    await logAudit(g.session, "user.created", "admin_user", rows[0].id, { email, role: b.role }, request);
    return NextResponse.json({ ok: true, tempPassword });
  } catch {
    return fail("Could not create the user.", 503);
  }
}

export async function PATCH(request: Request) {
  const g = await adminApi(request, "users");
  if ("error" in g) return g.error;

  let b: { id?: unknown; action?: unknown; role?: unknown };
  try {
    b = await request.json();
  } catch {
    return fail("Invalid request.");
  }

  if (typeof b.id !== "string" || !UUID.test(b.id)) return fail("Invalid account ID.");
  if (b.id === g.session.userId) return fail("You cannot change your own account here. Use Change password.");
  if (b.action !== "reset" && b.action !== "activate" && b.action !== "deactivate" && b.action !== "set-role") {
    return fail("Invalid action.");
  }

  try {
    const target = await findTarget(b.id);
    if (!target) return fail("Account not found.", 404);
    if (!isRole(target.role)) return fail("The target account has an invalid role. Contact the Super Admin.", 409);
    if (!canManageTarget(g.session.role, target.role)) {
      return fail("You do not have permission to manage this privileged account.", 403);
    }

    if (b.action === "set-role") {
      if (g.session.role !== "SUPER_ADMIN") {
        return fail("Only the Super Admin can grant or revoke roles.", 403);
      }
      if (!isRole(b.role)) return fail("Choose a valid role.");
      if (target.role === "SUPER_ADMIN" && b.role !== "SUPER_ADMIN" && target.active) {
        const activeAdmins = await dbRequest<{ id: string }[]>(
          "admin_users?select=id&role=eq.SUPER_ADMIN&active=eq.true&limit=2",
        );
        if (activeAdmins.length <= 1) {
          return fail("The last active Super Admin cannot lose Super Admin privileges.", 409);
        }
      }
      const rows = await dbRequest<{ id: string }[]>("admin_users?id=eq." + encodeURIComponent(b.id), {
        method: "PATCH",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({ role: b.role, updated_at: new Date().toISOString() }),
      });
      if (!rows.length) return fail("Account not found or no change was made.", 404);
      if (target.role !== b.role) {
        await logAudit(g.session, "user.role_changed", "admin_user", b.id, { from: target.role, to: b.role }, request);
      }
      return NextResponse.json({ ok: true, role: b.role });
    }

    if (b.action === "deactivate" && target.role === "SUPER_ADMIN") {
      const activeAdmins = await dbRequest<{ id: string }[]>(
        "admin_users?select=id&role=eq.SUPER_ADMIN&active=eq.true&limit=2",
      );
      if (activeAdmins.length <= 1) {
        return fail("The last active Super Admin cannot be deactivated.", 409);
      }
    }

    if (b.action === "reset") {
      const tempPassword = generateTempPassword();
      const rows = await dbRequest<{ id: string }[]>("admin_users?id=eq." + encodeURIComponent(b.id), {
        method: "PATCH",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({
          password_hash: await hashPassword(tempPassword),
          must_change_password: true,
          failed_attempts: 0,
          locked_until: null,
          updated_at: new Date().toISOString(),
        }),
      });
      if (!rows.length) return fail("Account not found or no change was made.", 404);

      await revokeUserSessions(b.id);
      await logAudit(g.session, "user.password_reset", "admin_user", b.id, { targetRole: target.role }, request);
      return NextResponse.json({ ok: true, tempPassword });
    }

    const rows = await dbRequest<{ id: string }[]>("admin_users?id=eq." + encodeURIComponent(b.id), {
      method: "PATCH",
      headers: { prefer: "return=representation" },
      body: JSON.stringify({ active: b.action === "activate", updated_at: new Date().toISOString() }),
    });
    if (!rows.length) return fail("Account not found or no change was made.", 404);

    if (b.action === "deactivate") await revokeUserSessions(b.id);
    await logAudit(g.session, "user." + b.action + "d", "admin_user", b.id, { targetRole: target.role }, request);
    return NextResponse.json({ ok: true });
  } catch {
    return fail("Could not update the user.", 503);
  }
}

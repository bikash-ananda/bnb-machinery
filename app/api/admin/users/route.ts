import { NextResponse } from "next/server";
import { isRole } from "@/lib/admin/access";
import { adminApi, fail, UUID } from "@/lib/server/admin-api";
import { generateTempPassword, hashPassword, logAudit, normalizeEmail, revokeUserSessions } from "@/lib/server/admin-auth";
import { dbRequest } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const g = await adminApi(request, "users");
  if ("error" in g) return g.error;
  let b: { email?: unknown; name?: unknown; role?: unknown };
  try { b = await request.json(); } catch { return fail("Invalid request."); }
  const email = normalizeEmail(b.email);
  const name = typeof b.name === "string" ? b.name.trim().slice(0, 80) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || name.length < 2 || !isRole(b.role)) return fail("Enter a full email, a name and a role.");
  const tempPassword = generateTempPassword();
  try {
    const rows = await dbRequest<{ id: string }[]>("admin_users", {
      method: "POST",
      headers: { prefer: "return=representation,resolution=ignore-duplicates" },
      body: JSON.stringify({ email, name, role: b.role, password_hash: await hashPassword(tempPassword), must_change_password: true, created_by: g.session.email }),
    });
    if (!rows.length) return fail("An account with that email already exists.", 409);
    await logAudit(g.session, "user.created", "admin_user", rows[0].id, { email, role: b.role }, request);
    return NextResponse.json({ ok: true, tempPassword });
  } catch { return fail("Could not create the user.", 503); }
}

export async function PATCH(request: Request) {
  const g = await adminApi(request, "users");
  if ("error" in g) return g.error;
  let b: { id?: unknown; action?: unknown };
  try { b = await request.json(); } catch { return fail("Invalid request."); }
  if (typeof b.id !== "string" || !UUID.test(b.id)) return fail("Invalid request.");
  if (b.id === g.session.userId) return fail("You cannot change your own account here. Use Change password.");
  try {
    if (b.action === "reset") {
      const tempPassword = generateTempPassword();
      await dbRequest("admin_users?id=eq." + b.id, {
        method: "PATCH", headers: { prefer: "return=minimal" },
        body: JSON.stringify({ password_hash: await hashPassword(tempPassword), must_change_password: true, failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() }),
      });
      await revokeUserSessions(b.id);
      await logAudit(g.session, "user.password_reset", "admin_user", b.id, null, request);
      return NextResponse.json({ ok: true, tempPassword });
    }
    if (b.action === "activate" || b.action === "deactivate") {
      await dbRequest("admin_users?id=eq." + b.id, {
        method: "PATCH", headers: { prefer: "return=minimal" },
        body: JSON.stringify({ active: b.action === "activate", updated_at: new Date().toISOString() }),
      });
      if (b.action === "deactivate") await revokeUserSessions(b.id);
      await logAudit(g.session, "user." + b.action + "d", "admin_user", b.id, null, request);
      return NextResponse.json({ ok: true });
    }
    return fail("Invalid request.");
  } catch { return fail("Could not update the user.", 503); }
}
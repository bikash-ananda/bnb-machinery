import { NextResponse } from "next/server";
import { passwordProblem } from "@/lib/admin/access";
import { rateLimited } from "@/lib/server/ai";
import { isAllowedOrigin } from "@/lib/server/auth";
import { getAdminSession, hashPassword, logAudit, revokeUserSessions, verifyPassword } from "@/lib/server/admin-auth";
import { dbRequest } from "@/lib/server/supabase";

export const runtime = "nodejs";
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return fail("Request blocked.", 403);
  if (rateLimited(request, "admin-pw", 6)) return fail("Too many attempts. Wait a minute.", 429);
  const s = await getAdminSession();
  if (!s) return fail("Not signed in.", 401);

  let body: { current?: unknown; next?: unknown };
  try { body = await request.json(); } catch { return fail("Invalid request."); }
  const current = typeof body.current === "string" ? body.current.slice(0, 200) : "";
  const next = typeof body.next === "string" ? body.next : "";

  const problem = passwordProblem(next, s.email);
  if (problem) return fail(problem);
  if (next === current) return fail("Choose a password different from the current one.");

  try {
    const rows = await dbRequest<{ password_hash: string }[]>("admin_users?select=password_hash&id=eq." + s.userId + "&limit=1");
    if (!rows[0] || !(await verifyPassword(current, rows[0].password_hash))) return fail("Current password is incorrect.", 401);
    await dbRequest("admin_users?id=eq." + s.userId, {
      method: "PATCH", headers: { prefer: "return=minimal" },
      body: JSON.stringify({ password_hash: await hashPassword(next), must_change_password: false, updated_at: new Date().toISOString() }),
    });
    await revokeUserSessions(s.userId, s.tokenHash);
    await logAudit(s, "password.changed", "admin_user", s.userId, null, request);
    return NextResponse.json({ ok: true });
  } catch {
    return fail("Could not change the password. Please try again.", 503);
  }
}
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { passwordProblem } from "@/lib/admin/access";
import { rateLimited } from "@/lib/server/ai";
import { isAllowedOrigin } from "@/lib/server/auth";
import { db } from "@/src/db/client";
import { localAdminUsers } from "@/src/modules/local-workflow/schema";
import { getAdminSession, hashPassword, logAudit, revokeUserSessions, verifyPassword } from "@/lib/server/admin-auth";

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
    const [user] = await db.select({ passwordHash: localAdminUsers.passwordHash }).from(localAdminUsers).where(eq(localAdminUsers.id, s.userId)).limit(1);
    if (!user || !(await verifyPassword(current, user.passwordHash))) return fail("Current password is incorrect.", 401);
    await db.update(localAdminUsers).set({ passwordHash: await hashPassword(next), mustChangePassword: false, failedAttempts: 0, lockedUntil: null, updatedAt: new Date() }).where(eq(localAdminUsers.id, s.userId));
    await revokeUserSessions(s.userId, s.tokenHash);
    await logAudit(s, "password.changed", "admin_user", s.userId, null, request);
    return NextResponse.json({ ok: true });
  } catch { return fail("Could not change the password. Please try again.", 503); }
}
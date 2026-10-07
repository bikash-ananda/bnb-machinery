import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { rateLimited } from "@/lib/server/ai";
import { isAllowedOrigin } from "@/lib/server/auth";
import { createAdminSession, logAudit, setSessionCookie } from "@/lib/server/admin-auth";
import { checkOtp, clearPending, otpConfigured, PENDING_COOKIE, readPending } from "@/lib/server/admin-otp";
import { dbRequest } from "@/lib/server/supabase";

export const runtime = "nodejs";

type User = { id: string; email: string; role: string; active: boolean; must_change_password: boolean };
const stop = (error: string, status: number, restart = false) => {
  const res = NextResponse.json({ error, restart }, { status });
  if (restart) clearPending(res);
  return res;
};

/** Step 2 of 2: check the emailed code, then create the session. */
export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return stop("Request blocked.", 403);
  if (rateLimited(request, "admin-otp", 10)) return stop("Too many attempts. Wait a minute.", 429);
  if (!otpConfigured()) return stop("Two-step verification is not configured.", 503);

  let body: { code?: unknown };
  try { body = await request.json(); } catch { return stop("Enter the 6-digit code.", 400); }
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) return stop("Enter the 6-digit code.", 400);

  const userId = readPending((await cookies()).get(PENDING_COOKIE)?.value);
  if (!userId) return stop("Your sign-in expired. Please start again.", 401, true);

  try {
    const rows = await dbRequest<User[]>("admin_users?select=id,email,role,active,must_change_password&id=eq." + userId + "&limit=1");
    const u = rows[0];
    if (!u || !u.active) return stop("Your sign-in expired. Please start again.", 401, true);

    const status = await checkOtp(u.email, code);
    if (status === "expired") return stop("That code expired. Please sign in again.", 401, true);
    if (status === "blocked") {
      await logAudit({ email: u.email, role: u.role }, "login.otp_blocked", "admin_user", u.id, null, request);
      return stop("Too many wrong codes. Please sign in again later.", 429, true);
    }
    if (status !== "valid") {
      await logAudit({ email: u.email, role: u.role }, "login.otp_failed", "admin_user", u.id, null, request);
      return stop("That code is not correct.", 401);
    }

    const token = await createAdminSession(u.id, request);
    await dbRequest("admin_users?id=eq." + u.id, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ last_login_at: new Date().toISOString() }) });
    await logAudit({ email: u.email, role: u.role }, "login.success", "admin_user", u.id, null, request);
    const res = NextResponse.json({ ok: true, mustChange: u.must_change_password });
    setSessionCookie(res, token);
    clearPending(res);
    return res;
  } catch {
    return stop("Could not verify the code. Please try again.", 503);
  }
}
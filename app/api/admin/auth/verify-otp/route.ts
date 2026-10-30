import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { rateLimited } from "@/lib/server/ai";
import { isAllowedOrigin } from "@/lib/server/auth";
import { db } from "@/src/db/client";
import { localAdminUsers } from "@/src/modules/local-workflow/schema";
import { createAdminSession, logAudit, setSessionCookie } from "@/lib/server/admin-auth";
import { checkOtp, clearPending, otpConfigured, PENDING_COOKIE, readPending } from "@/lib/server/admin-otp";

export const runtime = "nodejs";
const stop = (error: string, status: number, restart = false) => {
  const response = NextResponse.json({ error, restart }, { status });
  if (restart) clearPending(response);
  return response;
};

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return stop("Request blocked.", 403);
  if (rateLimited(request, "admin-otp", 10)) return stop("Too many attempts. Wait a minute.", 429);
  if (!otpConfigured()) return stop("Two-step verification is not configured.", 503);
  let body: { code?: unknown };
  try { body = await request.json(); } catch { return stop("Enter the 6-digit code.", 400); }
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^\\d{6}$/.test(code)) return stop("Enter the 6-digit code.", 400);
  const userId = readPending((await cookies()).get(PENDING_COOKIE)?.value);
  if (!userId) return stop("Your sign-in expired. Please start again.", 401, true);

  try {
    const [user] = await db.select().from(localAdminUsers).where(eq(localAdminUsers.id, userId)).limit(1);
    if (!user || !user.active) return stop("Your sign-in expired. Please start again.", 401, true);
    const status = await checkOtp(user.email, code);
    if (status === "expired") return stop("That code expired. Please sign in again.", 401, true);
    if (status === "blocked") {
      await logAudit({ email: user.email, role: user.role }, "login.otp_blocked", "admin_user", user.id, null, request);
      return stop("Too many wrong codes. Please sign in again later.", 429, true);
    }
    if (status !== "valid") {
      await logAudit({ email: user.email, role: user.role }, "login.otp_failed", "admin_user", user.id, null, request);
      return stop("That code is not correct.", 401);
    }
    const token = await createAdminSession(user.id, request);
    await db.update(localAdminUsers).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(localAdminUsers.id, user.id));
    await logAudit({ email: user.email, role: user.role }, "login.success", "admin_user", user.id, null, request);
    const response = NextResponse.json({ ok: true, mustChange: user.mustChangePassword });
    setSessionCookie(response, token);
    clearPending(response);
    return response;
  } catch {
    return stop("Could not verify the code. Please try again.", 503);
  }
}
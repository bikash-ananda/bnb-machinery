import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { rateLimited } from "@/lib/server/ai";
import { isAllowedOrigin } from "@/lib/server/auth";
import { db } from "@/src/db/client";
import { localAdminUsers } from "@/src/modules/local-workflow/schema";
import { burnTime, logAudit, normalizeEmail, verifyPassword } from "@/lib/server/admin-auth";
import { deliverOtp, issueOtp, maskEmail, otpConfigured, setPending } from "@/lib/server/admin-otp";

export const runtime = "nodejs";
const BAD = { error: "Invalid email or password." };
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

/** Password verification is the first step; no authenticated session is created until OTP succeeds. */
export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: "Request blocked." }, { status: 403 });
  if (rateLimited(request, "admin-login", 10)) return NextResponse.json({ error: "Too many attempts. Wait a minute." }, { status: 429 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  if (!otpConfigured()) return NextResponse.json({ error: "Two-step verification is not configured (OTP_HASH_SECRET missing)." }, { status: 503 });

  let body: { email?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json(BAD, { status: 400 }); }
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
  if (!email || !password) return NextResponse.json(BAD, { status: 401 });

  try {
    const [user] = await db.select().from(localAdminUsers).where(eq(localAdminUsers.email, email)).limit(1);
    const locked = !!user?.lockedUntil && user.lockedUntil.getTime() > Date.now();
    const valid = user && !locked ? await verifyPassword(password, user.passwordHash) : (await burnTime(password), false);
    if (!user || !user.active || locked || !valid) {
      if (user && !locked) {
        const attempts = user.failedAttempts + 1;
        const lock = attempts >= MAX_ATTEMPTS;
        await db.update(localAdminUsers).set({
          failedAttempts: lock ? 0 : attempts,
          lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
          updatedAt: new Date(),
        }).where(eq(localAdminUsers.id, user.id));
      }
      await logAudit(null, locked ? "login.blocked_locked" : "login.failed", "admin_user", email, null, request);
      return NextResponse.json(BAD, { status: 401 });
    }

    const issued = await issueOtp(user.email);
    if (!issued.ok) return NextResponse.json({ error: "Too many codes requested. Try again in 15 minutes." }, { status: 429 });
    await deliverOtp(user.email, issued.code);
    await db.update(localAdminUsers).set({ failedAttempts: 0, lockedUntil: null, updatedAt: new Date() }).where(eq(localAdminUsers.id, user.id));
    await logAudit({ email: user.email, role: user.role }, "login.otp_sent", "admin_user", user.id, null, request);
    const response = NextResponse.json({ step: "otp", email: maskEmail(user.email) });
    setPending(response, user.id);
    return response;
  } catch {
    return NextResponse.json({ error: "Could not send the verification code. Check email settings and PostgreSQL connectivity." }, { status: 503 });
  }
}
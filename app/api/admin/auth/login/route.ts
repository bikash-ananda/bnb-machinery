import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/server/ai";
import { isAllowedOrigin } from "@/lib/server/auth";
import { burnTime, logAudit, normalizeEmail, verifyPassword } from "@/lib/server/admin-auth";
import { deliverOtp, issueOtp, maskEmail, otpConfigured, setPending } from "@/lib/server/admin-otp";
import { dbRequest, hasSupabaseConfig } from "@/lib/server/supabase";

export const runtime = "nodejs";
const BAD = { error: "Invalid email or password." };
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

type User = { id: string; email: string; role: string; password_hash: string; active: boolean; failed_attempts: number; locked_until: string | null };

/** Step 1 of 2: check the password, then email a one-time code. No session is created here. */
export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: "Request blocked." }, { status: 403 });
  if (rateLimited(request, "admin-login", 10)) return NextResponse.json({ error: "Too many attempts. Wait a minute." }, { status: 429 });
  if (!hasSupabaseConfig()) return NextResponse.json({ error: "Sign-in is not configured." }, { status: 503 });
  if (!otpConfigured()) return NextResponse.json({ error: "Two-step verification is not configured (OTP_HASH_SECRET missing)." }, { status: 503 });

  let body: { email?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json(BAD, { status: 400 }); }
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
  if (!email || !password) return NextResponse.json(BAD, { status: 401 });

  try {
    const rows = await dbRequest<User[]>(
      "admin_users?select=id,email,role,password_hash,active,failed_attempts,locked_until&email=eq." + encodeURIComponent(email) + "&limit=1",
    );
    const u = rows[0];
    const locked = !!u?.locked_until && Date.parse(u.locked_until) > Date.now();

    let ok = false;
    if (u && !locked) ok = await verifyPassword(password, u.password_hash);
    else await burnTime(password);

    if (!u || !u.active || locked || !ok) {
      if (u && !locked) {
        const attempts = u.failed_attempts + 1;
        const lock = attempts >= MAX_ATTEMPTS;
        await dbRequest("admin_users?id=eq." + u.id, {
          method: "PATCH", headers: { prefer: "return=minimal" },
          body: JSON.stringify({ failed_attempts: lock ? 0 : attempts, locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null }),
        });
      }
      await logAudit(null, locked ? "login.blocked_locked" : "login.failed", "admin_user", email, null, request);
      return NextResponse.json(BAD, { status: 401 });
    }

    const issued = await issueOtp(u.email);
    if (!issued.ok) return NextResponse.json({ error: "Too many codes requested. Try again in 15 minutes." }, { status: 429 });
    await deliverOtp(u.email, issued.code);

    await dbRequest("admin_users?id=eq." + u.id, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ failed_attempts: 0, locked_until: null }) });
    await logAudit({ email: u.email, role: u.role }, "login.otp_sent", "admin_user", u.id, null, request);
    const res = NextResponse.json({ step: "otp", email: maskEmail(u.email) });
    setPending(res, u.id);
    return res;
  } catch {
    return NextResponse.json({ error: "Could not send the verification code. Check email settings and that the database migration has been run." }, { status: 503 });
  }
}
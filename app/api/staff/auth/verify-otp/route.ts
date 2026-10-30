import { NextResponse } from "next/server";
import {
  createSession,
  isAllowedOrigin,
  normalizeEmail,
  resolveAllowedRole,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  verifyLoginOtp,
} from "@/lib/server/auth";
import { BackendNotConfiguredError } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
  }

  if (Number(request.headers.get("content-length") ?? 0) > 4096) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter the verification code." }, { status: 400 });
  }

  const row =
    payload && typeof payload === "object"
      ? (payload as { email?: unknown; code?: unknown })
      : {};
  const email = normalizeEmail(row.email);
  const code = typeof row.code === "string" ? row.code.trim() : "";
  const role = resolveAllowedRole(email);
  if (!role) {
    return NextResponse.json(
      { error: "This email is not authorized to access the Machinery Tools Nepal staff system." },
      { status: 403 },
    );
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit verification code." }, { status: 400 });
  }

  try {
    const status = await verifyLoginOtp(email, code);
    if (status === "expired") {
      return NextResponse.json({ error: "This OTP has expired. Please request a new OTP." }, { status: 400 });
    }
    if (status === "blocked") {
      return NextResponse.json(
        { error: "Too many incorrect attempts. Request a new verification code." },
        { status: 429 },
      );
    }
    if (status !== "valid") {
      return NextResponse.json({ error: "The OTP is incorrect. Please try again." }, { status: 400 });
    }

    const session = await createSession(email, role);
    const response = NextResponse.json({ ok: true, role });
    response.cookies.set({
      name: SESSION_COOKIE,
      value: session.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
      maxAge: SESSION_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    if (error instanceof BackendNotConfiguredError) {
      return NextResponse.json(
        { error: "Staff login is not configured yet. Contact the site administrator." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "We could not verify this code. Please try again." },
      { status: 503 },
    );
  }
}

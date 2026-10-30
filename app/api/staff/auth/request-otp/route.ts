import { NextResponse } from "next/server";
import {
  isAllowedOrigin,
  hasEmailDeliveryConfig,
  normalizeEmail,
  requestLoginOtp,
  resolveAllowedRole,
  sendLoginOtp,
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
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const email = normalizeEmail(
    payload && typeof payload === "object" && "email" in payload
      ? (payload as { email?: unknown }).email
      : null,
  );
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!resolveAllowedRole(email)) {
    return NextResponse.json(
      { error: "This email is not authorized to access the Machinery Tools Nepal staff system." },
      { status: 403 },
    );
  }
  if (!hasEmailDeliveryConfig()) {
    return NextResponse.json(
      { error: "Staff login is not configured yet. Contact the site administrator." },
      { status: 503 },
    );
  }

  try {
    const result = await requestLoginOtp(email);
    if (result.status === "rate_limited") {
      return NextResponse.json(
        { error: "Too many code requests. Please wait 15 minutes before trying again." },
        { status: 429 },
      );
    }
    if (!result.code) {
      return NextResponse.json({ error: "Could not request a code. Please try again." }, { status: 503 });
    }
    await sendLoginOtp(email, result.code);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof BackendNotConfiguredError) {
      return NextResponse.json(
        { error: "Staff login is not configured yet. Contact the site administrator." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "We could not send a verification code. Please try again later." },
      { status: 503 },
    );
  }
}

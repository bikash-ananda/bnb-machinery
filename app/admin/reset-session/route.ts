import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/server/admin-auth";
import { clearPending } from "@/lib/server/admin-otp";

/**
 * Recovery endpoint for stale Admin browser cookies.
 * Clears only the Admin session and pending-OTP cookies, then returns to login.
 * It does not change the account, password, or stored business data.
 */
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const response = NextResponse.redirect(
    new URL("/admin/login?session_reset=1", request.url),
    303,
  );
  clearSessionCookie(response);
  clearPending(response);
  return response;
}

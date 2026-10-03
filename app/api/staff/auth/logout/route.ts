import { NextResponse } from "next/server";
import { isAllowedOrigin, revokeSession, SESSION_COOKIE } from "@/lib/server/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
  }

  try {
    const cookieStore = await cookies();
    await revokeSession(cookieStore.get(SESSION_COOKIE)?.value);
  } catch {
    // Clearing the browser cookie still closes this device's session.
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

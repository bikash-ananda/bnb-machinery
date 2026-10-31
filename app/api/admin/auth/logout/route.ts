import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/src/db/client";
import { localAdminSessions } from "@/src/modules/local-workflow/schema";
import { clearSessionCookie, getAdminSession, logAudit, sha, ADMIN_COOKIE } from "@/lib/server/admin-auth";
import { isAllowedOrigin } from "@/lib/server/auth";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: "Request blocked." }, { status: 403 });
  const session = await getAdminSession();
  if (session) {
    await db.update(localAdminSessions).set({ revokedAt: new Date() }).where(and(eq(localAdminSessions.tokenHash, session.tokenHash), isNull(localAdminSessions.revokedAt)));
    await logAudit(session, "logout", "admin_user", session.userId, null, request);
  } else {
    const token = (await cookies()).get(ADMIN_COOKIE)?.value;
    if (token) await db.update(localAdminSessions).set({ revokedAt: new Date() }).where(and(eq(localAdminSessions.tokenHash, sha(token)), isNull(localAdminSessions.revokedAt)));
  }
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
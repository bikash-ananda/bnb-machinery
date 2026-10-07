import { NextResponse } from "next/server";
import { clearSessionCookie, getAdminSession, logAudit } from "@/lib/server/admin-auth";
import { isAllowedOrigin } from "@/lib/server/auth";
import { dbRequest } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: "Request blocked." }, { status: 403 });
  const s = await getAdminSession();
  if (s) {
    try {
      await dbRequest("admin_sessions?token_hash=eq." + s.tokenHash, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ revoked_at: new Date().toISOString() }) });
    } catch { /* cookie is cleared below regardless */ }
    await logAudit(s, "logout", "admin_user", s.userId, null, request);
  }
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
import "server-only";

import { createHash, randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { canAccess, isRole, passwordProblem, type AdminRole, type ModuleId } from "@/lib/admin/access";
import { dbRequest, hasSupabaseConfig } from "@/lib/server/supabase";

export const ADMIN_COOKIE = "bnb_admin_session";
export const ADMIN_TTL = 8 * 60 * 60;

const N = 32768, R = 8, P = 1, MAXMEM = 128 * N * R * 2;
type Opts = { N: number; r: number; p: number; maxmem: number };
const scrypt = promisify(scryptCb) as unknown as (pw: string, salt: Buffer, len: number, o: Opts) => Promise<Buffer>;
export const sha = (t: string) => createHash("sha256").update(t).digest("hex");

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const h = await scrypt(pw, salt, 64, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${h.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string) {
  const [id, n, r, p, s, h] = stored.split("$");
  if (id !== "scrypt" || !s || !h) return false;
  const expected = Buffer.from(h, "base64");
  const got = await scrypt(pw, Buffer.from(s, "base64"), expected.length, { N: +n, r: +r, p: +p, maxmem: MAXMEM });
  return got.length === expected.length && timingSafeEqual(got, expected);
}

let dummy: Promise<string> | null = null;
/** Verifies against a throwaway hash so unknown emails take as long as real ones. */
export const burnTime = async (pw: string) => { await verifyPassword(pw, await (dummy ??= hashPassword("not-a-real-password"))); };

export function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  for (;;) {
    let pw = "";
    for (let i = 0; i < 12; i++) pw += chars[randomInt(chars.length)];
    if (!passwordProblem(pw)) return pw;
  }
}

export const normalizeEmail = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");
export const clientIp = (request: Request) => (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "").slice(0, 64);

export type AdminSession = { userId: string; email: string; name: string; role: AdminRole; mustChange: boolean; tokenHash: string };

type SessionRow = {
  user_id: string;
  admin_users: { email: string; name: string; role: string; active: boolean; must_change_password: boolean } | null;
};

export async function createAdminSession(userId: string, request: Request) {
  const token = randomBytes(32).toString("base64url");
  await dbRequest("admin_sessions", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      token_hash: sha(token), user_id: userId, ip: clientIp(request),
      user_agent: (request.headers.get("user-agent") || "").slice(0, 200),
      expires_at: new Date(Date.now() + ADMIN_TTL * 1000).toISOString(),
    }),
  });
  return token;
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: ADMIN_TTL });
}
export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  if (!hasSupabaseConfig()) return null;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    const tokenHash = sha(token);
    const rows = await dbRequest<SessionRow[]>(
      "admin_sessions?select=user_id,admin_users(email,name,role,active,must_change_password)&token_hash=eq." + tokenHash +
        "&revoked_at=is.null&expires_at=gt." + encodeURIComponent(new Date().toISOString()) + "&limit=1",
    );
    const u = rows[0]?.admin_users;
    if (!u || !u.active || !isRole(u.role)) return null;
    return { userId: rows[0].user_id, email: u.email, name: u.name, role: u.role, mustChange: u.must_change_password, tokenHash };
  } catch {
    return null;
  }
}

/** For pages: redirects to login / forced password change / dashboard as needed. */
export async function requireAdmin(module?: ModuleId) {
  const s = await getAdminSession();
  if (!s) redirect("/admin/login");
  if (s.mustChange) redirect("/admin/change-password");
  if (module && !canAccess(s.role, module)) redirect("/admin");
  return s;
}

export async function revokeUserSessions(userId: string, exceptHash?: string) {
  await dbRequest("admin_sessions?user_id=eq." + userId + "&revoked_at=is.null" + (exceptHash ? "&token_hash=neq." + exceptHash : ""), {
    method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ revoked_at: new Date().toISOString() }),
  });
}

export async function logAudit(actor: { email: string; role: string } | null, action: string, entity: string, entityId: string, detail: unknown, request?: Request) {
  try {
    await dbRequest("admin_audit_events", {
      method: "POST", headers: { prefer: "return=minimal" },
      body: JSON.stringify({ actor_email: actor?.email ?? null, actor_role: actor?.role ?? null, action, entity, entity_id: entityId, detail: detail ?? null, ip: request ? clientIp(request) : null }),
    });
  } catch { /* auditing must never break the action itself */ }
}
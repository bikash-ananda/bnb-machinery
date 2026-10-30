import "server-only";

import { createHash, randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/src/db/client";
import { localAdminAuditEvents, localAdminSessions, localAdminUsers } from "@/src/modules/local-workflow/schema";
import { canAccess, isRole, passwordProblem, type AdminRole, type ModuleId } from "@/lib/admin/access";

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
  if (!expected.length || !Number.isInteger(+n) || !Number.isInteger(+r) || !Number.isInteger(+p)) return false;
  const got = await scrypt(pw, Buffer.from(s, "base64"), expected.length, { N: +n, r: +r, p: +p, maxmem: MAXMEM });
  return got.length === expected.length && timingSafeEqual(got, expected);
}
let dummy: Promise<string> | null = null;
export const burnTime = async (pw: string) => { await verifyPassword(pw, await (dummy ??= hashPassword("not-a-real-password"))); };
export function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  for (;;) { let pw = ""; for (let i = 0; i < 12; i++) pw += chars[randomInt(chars.length)]; if (!passwordProblem(pw)) return pw; }
}
export const normalizeEmail = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : "");
export const clientIp = (request: Request) => (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "").slice(0, 64);
export type AdminSession = { userId: string; email: string; name: string; role: AdminRole; mustChange: boolean; tokenHash: string };

export async function createAdminSession(userId: string, request: Request) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(localAdminSessions).values({
    tokenHash: sha(token), userId, ip: clientIp(request),
    userAgent: (request.headers.get("user-agent") || "").slice(0, 200),
    expiresAt: new Date(Date.now() + ADMIN_TTL * 1000),
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
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    const rows = await db.select({
      userId: localAdminSessions.userId, email: localAdminUsers.email, name: localAdminUsers.name,
      role: localAdminUsers.role, active: localAdminUsers.active, mustChange: localAdminUsers.mustChangePassword,
    }).from(localAdminSessions)
      .innerJoin(localAdminUsers, eq(localAdminSessions.userId, localAdminUsers.id))
      .where(and(eq(localAdminSessions.tokenHash, sha(token)), isNull(localAdminSessions.revokedAt), gt(localAdminSessions.expiresAt, new Date())))
      .limit(1);
    const u = rows[0];
    if (!u || !u.active || !isRole(u.role)) return null;
    return { userId: u.userId, email: u.email, name: u.name, role: u.role, mustChange: u.mustChange, tokenHash: sha(token) };
  } catch { return null; }
}
export async function requireAdmin(module?: ModuleId) {
  const s = await getAdminSession();
  if (!s) redirect("/admin/login");
  if (s.mustChange) redirect("/admin/change-password");
  if (module && !canAccess(s.role, module)) redirect("/admin");
  return s;
}
export async function revokeUserSessions(userId: string, exceptHash?: string) {
  const conditions = [eq(localAdminSessions.userId, userId), isNull(localAdminSessions.revokedAt)];
  if (exceptHash) conditions.push(eq(localAdminSessions.tokenHash, exceptHash) as never);
  await db.update(localAdminSessions).set({ revokedAt: new Date() }).where(and(...conditions));
}
export async function logAudit(actor: { email: string; role: string } | null, action: string, entity: string, entityId: string, detail: unknown, request?: Request, mustSucceed = false) {
  try {
    await db.insert(localAdminAuditEvents).values({
      actorEmail: actor?.email ?? null, action, targetType: entity, targetId: entityId,
      details: { actorRole: actor?.role ?? null, detail: detail ?? null, ip: request ? clientIp(request) : null },
    });
  } catch (error) { if (mustSucceed) throw error; }
}

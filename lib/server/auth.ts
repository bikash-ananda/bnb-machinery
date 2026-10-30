import "server-only";

import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { StaffRole, StaffSession } from "@/lib/inventory/types";
import { db } from "@/src/db/client";
import { inventoryLoginOtps, inventoryStaffSessions } from "@/src/modules/local-workflow/schema";

export class BackendNotConfiguredError extends Error {
  constructor() { super("The PostgreSQL backend is not configured."); this.name = "BackendNotConfiguredError"; }
}
export const AUTHORIZED_STAFF_EMAIL = "bhattaraibikash38@gmail.com";
export const SESSION_COOKIE = "bnb_inventory_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;
export function normalizeEmail(value: unknown) { return typeof value === "string" ? value.trim().toLowerCase() : ""; }
export function resolveAllowedRole(email: string): StaffRole | null {
  if (email === AUTHORIZED_STAFF_EMAIL) return "INVENTORY_EDITOR";
  const ownerEmail = normalizeEmail(process.env.OWNER_EMAIL);
  return ownerEmail && email === ownerEmail && email !== AUTHORIZED_STAFF_EMAIL ? "OWNER" : null;
}
export function hasEmailDeliveryConfig() { return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.OTP_FROM_EMAIL?.trim()); }
function allowedOrigins() {
  const out = new Set<string>();
  const add = (v?: string) => { if (!v) return; try { out.add(new URL(v.startsWith("http") ? v : "https://" + v).origin); } catch {} };
  add(process.env.APP_ORIGIN?.trim());
  if (process.env.NODE_ENV !== "production") add("http://localhost:3000");
  return out;
}
export function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return allowedOrigins().has(new URL(origin).origin); } catch { return false; }
}
function otpHash(email: string, code: string) {
  const secret = process.env.OTP_HASH_SECRET;
  if (!secret || secret.length < 32) throw new Error("OTP_HASH_SECRET is not configured.");
  return createHmac("sha256", secret).update("staff:" + email + ":" + code).digest("hex");
}
export async function requestLoginOtp(email: string): Promise<{ status: string; code?: string }> {
  if (!process.env.DATABASE_URL) throw new BackendNotConfiguredError();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60_000);
  const result = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(inventoryLoginOtps).where(eq(inventoryLoginOtps.email, email)).limit(1);
    const inWindow = row && now.getTime() - row.requestWindowStartedAt.getTime() < 15 * 60_000;
    if (inWindow && row.requestCount >= 5) return false;
    await tx.insert(inventoryLoginOtps).values({
      email, codeHash: otpHash(email, code), expiresAt, attempts: 0, requestCount: 1,
      requestWindowStartedAt: now, consumedAt: null, updatedAt: now,
    }).onConflictDoUpdate({
      target: inventoryLoginOtps.email,
      set: {
        codeHash: otpHash(email, code), expiresAt, attempts: 0, consumedAt: null, updatedAt: now,
        requestCount: inWindow ? row.requestCount + 1 : 1,
        requestWindowStartedAt: inWindow ? row.requestWindowStartedAt : now,
      },
    });
    return true;
  });
  return result ? { status: "issued", code } : { status: "rate_limited" };
}
export async function sendLoginOtp(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim(), from = process.env.OTP_FROM_EMAIL?.trim();
  if (!apiKey || !from) throw new Error("Email delivery is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { authorization: "Bearer " + apiKey, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject: "Your Machinery Tools Nepal staff verification code", text: "Your one-time verification code is " + code + ". It expires in 5 minutes. If you did not request this code, ignore this email." }),
    cache: "no-store", signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("Email delivery failed.");
}
export async function verifyLoginOtp(email: string, code: string) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(inventoryLoginOtps).where(and(eq(inventoryLoginOtps.email, email), isNull(inventoryLoginOtps.consumedAt))).limit(1);
    if (!row) return "invalid";
    if (row.expiresAt <= now) return "expired";
    if (row.attempts >= 5) return "blocked";
    const expected = Buffer.from(row.codeHash, "hex"), actual = Buffer.from(otpHash(email, code), "hex");
    const valid = expected.length === actual.length && timingSafeEqual(expected, actual);
    if (!valid) {
      const attempts = row.attempts + 1;
      await tx.update(inventoryLoginOtps).set({ attempts, consumedAt: attempts >= 5 ? now : null, updatedAt: now })
        .where(and(eq(inventoryLoginOtps.email, email), eq(inventoryLoginOtps.codeHash, row.codeHash), isNull(inventoryLoginOtps.consumedAt)));
      return attempts >= 5 ? "blocked" : "invalid";
    }
    await tx.update(inventoryLoginOtps).set({ consumedAt: now, updatedAt: now })
      .where(and(eq(inventoryLoginOtps.email, email), eq(inventoryLoginOtps.codeHash, row.codeHash), isNull(inventoryLoginOtps.consumedAt)));
    return "valid";
  });
}
export async function createSession(email: string, role: StaffRole) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await db.insert(inventoryStaffSessions).values({ tokenHash: createHash("sha256").update(token).digest("hex"), email, role, expiresAt });
  return { token, expiresAt };
}
export async function sessionFromToken(token: string | undefined) {
  if (!token) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [row] = await db.select().from(inventoryStaffSessions).where(and(
    eq(inventoryStaffSessions.tokenHash, tokenHash), isNull(inventoryStaffSessions.revokedAt), gt(inventoryStaffSessions.expiresAt, new Date()),
  )).limit(1);
  if (!row || resolveAllowedRole(row.email) !== row.role) return null;
  return { email: row.email, name: row.role === "OWNER" ? "Owner" : "Bikash Bhattarai", role: row.role as StaffRole, expiresAt: row.expiresAt.getTime(), tokenHash } satisfies StaffSession;
}
export async function getStaffSession() {
  return sessionFromToken((await cookies()).get(SESSION_COOKIE)?.value);
}
export async function revokeSession(token: string | undefined) {
  if (!token) return;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await db.update(inventoryStaffSessions).set({ revokedAt: new Date() }).where(and(eq(inventoryStaffSessions.tokenHash, tokenHash), isNull(inventoryStaffSessions.revokedAt)));
}

import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/src/db/client";
import { localAdminLoginOtps } from "@/src/modules/local-workflow/schema";

export const PENDING_COOKIE = "bnb_admin_pending";
const PENDING_TTL = 10 * 60;
export const otpConfigured = () => (process.env.OTP_HASH_SECRET?.length ?? 0) >= 32;
function secret() {
  const s = process.env.OTP_HASH_SECRET;
  if (!s || s.length < 32) throw new Error("OTP_HASH_SECRET is not configured.");
  return s;
}
const key = (email: string) => "admin:" + email;
const hash = (email: string, code: string) => createHmac("sha256", secret()).update(key(email) + ":" + code).digest("hex");
const sign = (p: string) => createHmac("sha256", secret()).update("admin-pending:" + p).digest("base64url");
export const maskEmail = (e: string) => e.replace(/^(.).*(@.*)$/, "$1***$2");

export async function issueOtp(email: string): Promise<{ ok: true; code: string } | { ok: false }> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60_000);
  const emailKey = key(email);
  const result = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(localAdminLoginOtps).where(eq(localAdminLoginOtps.email, emailKey)).limit(1);
    if (existing && now.getTime() - existing.requestWindowStartedAt.getTime() < 15 * 60_000 && existing.requestCount >= 5) return false;
    await tx.insert(localAdminLoginOtps).values({
      email: emailKey, codeHash: hash(email, code), expiresAt, attempts: 0, requestCount: 1,
      requestWindowStartedAt: now, consumedAt: null, updatedAt: now,
    }).onConflictDoUpdate({
      target: localAdminLoginOtps.email,
      set: {
        codeHash: hash(email, code), expiresAt, attempts: 0, consumedAt: null, updatedAt: now,
        requestCount: existing && now.getTime() - existing.requestWindowStartedAt.getTime() < 15 * 60_000 ? existing.requestCount + 1 : 1,
        requestWindowStartedAt: existing && now.getTime() - existing.requestWindowStartedAt.getTime() < 15 * 60_000 ? existing.requestWindowStartedAt : now,
      },
    });
    return true;
  });
  return result ? { ok: true, code } : { ok: false };
}

/** One-time code validation with bounded attempts and atomic consumption. */
export async function checkOtp(email: string, code: string): Promise<"valid" | "invalid" | "expired" | "blocked"> {
  const emailKey = key(email);
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(localAdminLoginOtps)
      .where(and(eq(localAdminLoginOtps.email, emailKey), isNull(localAdminLoginOtps.consumedAt))).limit(1);
    if (!row) return "invalid";
    const now = new Date();
    if (row.expiresAt <= now) return "expired";
    if (row.attempts >= 5) return "blocked";
    const expected = Buffer.from(row.codeHash, "hex");
    const actual = Buffer.from(hash(email, code), "hex");
    const valid = expected.length === actual.length && timingSafeEqual(expected, actual);
    if (!valid) {
      const attempts = row.attempts + 1;
      await tx.update(localAdminLoginOtps).set({ attempts, consumedAt: attempts >= 5 ? now : null, updatedAt: now })
        .where(and(eq(localAdminLoginOtps.email, emailKey), eq(localAdminLoginOtps.codeHash, row.codeHash), isNull(localAdminLoginOtps.consumedAt)));
      return attempts >= 5 ? "blocked" : "invalid";
    }
    await tx.update(localAdminLoginOtps).set({ consumedAt: now, updatedAt: now })
      .where(and(eq(localAdminLoginOtps.email, emailKey), eq(localAdminLoginOtps.codeHash, row.codeHash), isNull(localAdminLoginOtps.consumedAt)));
    return "valid";
  });
}

export async function deliverOtp(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.OTP_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") { console.log(`\\n[DEV ONLY] Admin sign-in code for ${email}: ${code}\\n`); return; }
    throw new Error("Email delivery is not configured.");
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { authorization: "Bearer " + apiKey, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject: "Your Machinery Tools Nepal admin sign-in code", text: `Your one-time sign-in code is ${code}. It expires in 5 minutes. If you did not try to sign in, change your password.` }),
    cache: "no-store", signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error("Email delivery failed.");
}
export function makePending(userId: string) {
  const p = `${userId}.${Date.now() + PENDING_TTL * 1000}`;
  return `${p}.${sign(p)}`;
}
export function readPending(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  const a = Buffer.from(sig), b = Buffer.from(sign(`${userId}.${exp}`));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return Number(exp) > Date.now() ? userId : null;
}
const base = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
export const setPending = (res: NextResponse, userId: string) => res.cookies.set(PENDING_COOKIE, makePending(userId), { ...base, maxAge: PENDING_TTL });
export const clearPending = (res: NextResponse) => res.cookies.set(PENDING_COOKIE, "", { ...base, maxAge: 0 });

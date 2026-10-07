import "server-only";

import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import { cookies } from "next/headers";
import type { StaffRole, StaffSession } from "@/lib/inventory/types";
import { callRpc, dbRequest, hasSupabaseConfig } from "@/lib/server/supabase";

export const AUTHORIZED_STAFF_EMAIL = "bhattaraibikash38@gmail.com";
export const SESSION_COOKIE = "bnb_inventory_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

type SessionRow = {
  id: string;
  email: string;
  role: StaffRole;
  expires_at: string;
  revoked_at: string | null;
};

export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function resolveAllowedRole(email: string): StaffRole | null {
  if (email === AUTHORIZED_STAFF_EMAIL) return "INVENTORY_EDITOR";

  const ownerEmail = normalizeEmail(process.env.OWNER_EMAIL);
  if (ownerEmail && email === ownerEmail && email !== AUTHORIZED_STAFF_EMAIL) {
    return "OWNER";
  }

  return null;
}

export function hasEmailDeliveryConfig() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.OTP_FROM_EMAIL?.trim());
}

function allowedOrigins() {
  const out = new Set<string>();
  const add = (v: string | undefined) => {
    if (!v) return;
    try { out.add(new URL(v.startsWith("http") ? v : "https://" + v).origin); } catch {}
  };
  add(process.env.APP_ORIGIN?.trim());
  // Vercel provides these automatically: this deployment's own addresses.
  add(process.env.VERCEL_URL);
  add(process.env.VERCEL_BRANCH_URL);
  add(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  return out;
}

export function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = allowedOrigins();
  if (process.env.NODE_ENV !== "production") {
    try { allowed.add(new URL(request.url).origin); } catch {}
  }
  try {
    return allowed.has(new URL(origin).origin);
  } catch {
    return false;
  }
}
function otpHash(email: string, code: string) {
  const secret = process.env.OTP_HASH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("OTP_HASH_SECRET is not configured.");
  }
  return createHmac("sha256", secret).update(email + ":" + code).digest("hex");
}

export async function requestLoginOtp(email: string) {
  if (!hasSupabaseConfig()) throw new Error("Authentication is not configured.");

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const status = await callRpc<string>("issue_login_otp", {
    p_email: email,
    p_code_hash: otpHash(email, code),
    p_expires_at: expiresAt,
  });

  if (status !== "issued") {
    return { status };
  }

  return { status, code };
}

export async function sendLoginOtp(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.OTP_FROM_EMAIL?.trim();
  if (!apiKey || !from) throw new Error("Email delivery is not configured.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: "Bearer " + apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your B & B Machinery staff verification code",
      text:
        "Your one-time verification code is " +
        code +
        ". It expires in 5 minutes. If you did not request this code, ignore this email.",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error("Email delivery failed.");
  }
}

export async function verifyLoginOtp(email: string, code: string) {
  const status = await callRpc<string>("verify_login_otp", {
    p_email: email,
    p_code_hash: otpHash(email, code),
  });
  return status;
}

export async function createSession(email: string, role: StaffRole) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await dbRequest<unknown>("staff_sessions", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({
      token_hash: createHash("sha256").update(token).digest("hex"),
      email,
      role,
      expires_at: expiresAt.toISOString(),
    }),
  });
  return { token, expiresAt };
}

export async function sessionFromToken(token: string | undefined) {
  if (!token || !hasSupabaseConfig()) return null;

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const rows = await dbRequest<SessionRow[]>(
    "staff_sessions?select=id,email,role,expires_at,revoked_at&token_hash=eq." +
      encodeURIComponent(tokenHash) +
      "&revoked_at=is.null&expires_at=gt." +
      encodeURIComponent(new Date().toISOString()) +
      "&limit=1",
  );

  const row = rows[0];
  if (!row || resolveAllowedRole(row.email) !== row.role) return null;

  return {
    email: row.email,
    name:
      row.role === "OWNER"
        ? "Owner"
        : "Bikash Bhattarai",
    role: row.role,
    expiresAt: Date.parse(row.expires_at),
    tokenHash,
  } satisfies StaffSession;
}

export async function getStaffSession() {
  const cookieStore = await cookies();
  return sessionFromToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function revokeSession(token: string | undefined) {
  if (!token || !hasSupabaseConfig()) return;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await dbRequest<unknown>(
    "staff_sessions?token_hash=eq." + encodeURIComponent(tokenHash),
    {
      method: "PATCH",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({ revoked_at: new Date().toISOString() }),
    },
  );
}

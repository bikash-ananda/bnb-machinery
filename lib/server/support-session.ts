import "server-only";

import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createOrResumeWebConversation } from "@/src/modules/support/service";

export const SUPPORT_COOKIE = "bnb_support_session";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const SUPPORT_TTL_SECONDS = 180 * 24 * 60 * 60;

function cookieValue(request: Request, name: string) {
  const pair = (request.headers.get("cookie") ?? "").split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return pair?.slice(name.length + 1) ?? "";
}

export async function ensureSupportSession(request: Request, language: "en" | "ne" | "hi") {
  const incoming = cookieValue(request, SUPPORT_COOKIE);
  const hasValidCookie = TOKEN_PATTERN.test(incoming);
  const token = hasValidCookie ? incoming : randomBytes(32).toString("base64url");
  const conversation = await createOrResumeWebConversation(token, language);
  return { ...conversation, shouldSetCookie: !hasValidCookie || conversation.created };
}

export function setSupportCookie(response: NextResponse, token: string) {
  response.cookies.set(SUPPORT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SUPPORT_TTL_SECONDS,
  });
}

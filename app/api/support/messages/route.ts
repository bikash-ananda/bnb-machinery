import { NextResponse } from "next/server";
import { z } from "zod";
import { isAllowedOrigin } from "@/lib/server/auth";
import { rateLimited } from "@/lib/server/ai";
import { ensureSupportSession, setSupportCookie } from "@/lib/server/support-session";
import { getWebConversationHistory, saveLocalConversationTurn } from "@/src/modules/support/service";

export const runtime = "nodejs";

const TurnSchema = z.object({
  language: z.enum(["en", "ne", "hi"]),
  requestId: z.string().uuid(),
  user: z.string().trim().min(1).max(500),
  assistant: z.string().trim().min(1).max(2000),
  handoff: z.boolean().optional().default(false),
}).strict();

export async function GET(request: Request) {
  if (rateLimited(request, "support-history", 30)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const language = new URL(request.url).searchParams.get("lang");
  const lang = language === "ne" ? "ne" : language === "hi" ? "hi" : "en";
  try {
    const session = await ensureSupportSession(request, lang);
    const history = await getWebConversationHistory(session.token);
    const response = NextResponse.json(history, { headers: { "Cache-Control": "private, no-store" } });
    if (session.shouldSetCookie) setSupportCookie(response, session.token);
    return response;
  } catch {
    return NextResponse.json({ error: "support_service_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (rateLimited(request, "support-message", 30)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 5_000) return NextResponse.json({ error: "request_too_large" }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = TurnSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  try {
    const session = await ensureSupportSession(request, parsed.data.language);
    await saveLocalConversationTurn(session.id, parsed.data);
    const response = NextResponse.json({ saved: true });
    if (session.shouldSetCookie) setSupportCookie(response, session.token);
    return response;
  } catch {
    return NextResponse.json({ error: "support_service_unavailable" }, { status: 503 });
  }
}

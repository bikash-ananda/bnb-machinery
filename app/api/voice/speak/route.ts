import { NextResponse } from "next/server";
import { isAllowedOrigin } from "@/lib/server/auth";
import { aiKey, rateLimited } from "@/lib/server/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (rateLimited(request, "tts", 30)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const key = aiKey();
  if (!key) return NextResponse.json({ error: "ai_disabled" }, { status: 503 });

  let body: { text?: unknown; lang?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 700) : "";
  if (!text) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const lang = body.lang === "ne" ? "Nepali" : body.lang === "hi" ? "Hindi" : "English";

  const model = process.env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts";
  const payload: Record<string, unknown> = {
    model,
    voice: process.env.OPENAI_TTS_VOICE?.trim() || "coral",
    input: text,
    response_format: "mp3",
  };
  if (model.startsWith("gpt-4o")) {
    payload.instructions = `Speak ${lang} clearly, in a warm, calm and helpful tone, at a steady, easy-to-follow pace.`;
  }

  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok || !res.body) return NextResponse.json({ error: "tts_failed" }, { status: 502 });
    return new Response(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "tts_failed" }, { status: 502 });
  }
}

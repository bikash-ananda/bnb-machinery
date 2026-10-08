import { NextResponse } from "next/server";
import { isAllowedOrigin } from "@/lib/server/auth";
import { aiKey, rateLimited, systemPrompt } from "@/lib/server/ai";
import { logUnanswered } from "@/lib/bot/gaps";
import { retrieve } from "@/lib/bot/knowledge";
import { knowledgeBlock, splitHandoff } from "@/src/lib/bot/reply";

export const runtime = "nodejs";

type Msg = { role: "user" | "assistant"; content: string };
type OutputItem = { type?: string; content?: { type?: string; text?: string }[] };

function extractText(data: { output?: OutputItem[]; output_text?: string }) {
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  return (data.output ?? [])
    .filter((o) => o.type === "message")
    .flatMap((o) => o.content ?? [])
    .filter((c) => c.type === "output_text" && typeof c.text === "string")
    .map((c) => c.text as string)
    .join("")
    .trim();
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (rateLimited(request, "chat", 20)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const key = aiKey();
  const model = process.env.OPENAI_MODEL?.trim();
  if (!key || !model) return NextResponse.json({ error: "ai_disabled" }, { status: 503 });

  let body: { lang?: string; messages?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }

  const lang = body.lang === "ne" ? "ne" : "en";
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages: Msg[] = raw
    .filter((m): m is Msg => !!m && typeof m === "object" && ((m as Msg).role === "user" || (m as Msg).role === "assistant") && typeof (m as Msg).content === "string")
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 500) }));
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Search with the last two customer messages so follow-ups like "and the price?" still work.
  const question = messages[messages.length - 1].content;
  const query = messages.filter((m) => m.role === "user").slice(-2).map((m) => m.content).join(" ");
  const { hits, confident } = await retrieve(query);

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, store: false, instructions: systemPrompt(lang) + knowledgeBlock(hits, confident), input: messages, max_output_tokens: 600 }),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return NextResponse.json({ error: "ai_failed" }, { status: 502 });
    const { text, handoff } = splitHandoff(extractText(await res.json()));
    if (!text) return NextResponse.json({ error: "ai_empty" }, { status: 502 });
    if (handoff || !confident) void logUnanswered(question, lang, handoff);
    return NextResponse.json({ text: text.slice(0, 900), handoff });
  } catch {
    return NextResponse.json({ error: "ai_failed" }, { status: 502 });
  }
}
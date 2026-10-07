import { NextResponse } from "next/server";
import { isAllowedOrigin } from "@/lib/server/auth";
import { aiKey, rateLimited } from "@/lib/server/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (rateLimited(request, "stt", 30)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const key = aiKey();
  if (!key) return NextResponse.json({ error: "ai_disabled" }, { status: 503 });

  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 5_000_000) {
    return NextResponse.json({ error: "bad_audio" }, { status: 400 });
  }
  const lang = form.get("lang") === "ne" ? "ne" : "en";

  const fd = new FormData();
  fd.append("file", file, file.name || "voice.webm");
  fd.append("model", process.env.OPENAI_STT_MODEL?.trim() || "gpt-4o-transcribe");
  fd.append("language", lang);
  fd.append(
    "prompt",
    lang === "ne"
      ? "B & B Machinery, पावर टिलर, रिपर, कर्न सेलर, चेनसो, इन्जिन, स्पेयर पार्ट्स, पोखरा, बाग्लुङ"
      : "B & B Machinery, power tiller, reaper, corn sheller, chainsaw, engine, spare parts, Pokhara, Baglung",
  );

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return NextResponse.json({ error: "stt_failed" }, { status: 502 });
    const data = (await res.json()) as { text?: string };
    return NextResponse.json({ text: String(data.text ?? "").slice(0, 400) });
  } catch {
    return NextResponse.json({ error: "stt_failed" }, { status: 502 });
  }
}
import { NextResponse } from "next/server";
import { isAllowedOrigin } from "@/lib/server/auth";
import { rateLimited } from "@/lib/server/ai";
import { createQuoteRequest } from "@/src/modules/support/service";
import { QuoteRequestSchema } from "@/src/modules/support/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (rateLimited(request, "quote-request", 6)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let raw: string;
  try {
    raw = await request.text();
    if (raw.length > 12_000) return NextResponse.json({ error: "request_too_large" }, { status: 413 });
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "bad_request" }, { status: 400 }); }
  const parsed = QuoteRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  try {
    const result = await createQuoteRequest(parsed.data);
    return NextResponse.json({ reference: result.reference, duplicate: result.duplicate }, { status: result.duplicate ? 200 : 201 });
  } catch {
    return NextResponse.json({ error: "quote_service_unavailable" }, { status: 503 });
  }
}

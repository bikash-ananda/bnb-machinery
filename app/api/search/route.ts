import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/server/ai";
import { getShopProducts } from "@/lib/server/catalog";
import { searchProducts } from "@/src/lib/search/engine";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (rateLimited(request, "search", 90)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 80);
  if (q.trim().length < 2) return NextResponse.json({ results: [] });
  const results = searchProducts(await getShopProducts(), q, 8);
  return NextResponse.json({ results });
}
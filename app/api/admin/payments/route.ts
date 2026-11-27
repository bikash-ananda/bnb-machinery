import { NextResponse } from "next/server";
import { adminApi } from "@/lib/server/admin-api";
import { listPendingSubmissions } from "@/src/modules/payments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Staff queue: amounts are serialized as decimal paisa strings, never JS floating-point values. */
export async function GET(request: Request) {
  const g = await adminApi(request, "billing");
  if ("error" in g) return g.error;
  try {
    const rows = await listPendingSubmissions();
    return NextResponse.json({ submissions: rows.map((row) => ({
      ...row,
      totalPaisa: row.totalPaisa.toString(),
      paidPaisa: row.paidPaisa.toString(),
      duePaisa: row.duePaisa.toString(),
    })) }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("payment verification queue failed", error);
    return NextResponse.json({ error: "Could not load payment submissions." }, { status: 503 });
  }
}

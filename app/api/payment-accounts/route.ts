import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/server/ai";
import { listPublicAccounts } from "@/src/modules/payments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // owner changes must show up immediately

/** Public list for the checkout: bank/wallet names, account numbers and QR image links. */
export async function GET(request: Request) {
  if (rateLimited(request, "pay-accounts", 60)) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ accounts: [] });
  try {
    const rows = await listPublicAccounts();
    return NextResponse.json({
      accounts: rows.map((a) => ({
        id: a.id, label: a.label, method: a.method, payeeName: a.payeeName, accountNo: a.accountNo, instructions: a.instructions,
        qrUrl: a.hasQr ? `/api/payment-accounts/${a.id}/qr` : null,
      })),
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Payment accounts failed:", error);
    return NextResponse.json({ accounts: [] }, { status: 503 });
  }
}

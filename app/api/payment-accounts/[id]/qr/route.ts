import { getAccountQr } from "@/src/modules/payments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Serves the QR image the owner uploaded (PNG/JPEG/WebP only; checked when it was saved). */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const qr = await getAccountQr(id).catch(() => null);
  if (!qr) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(qr.bytes), {
    headers: { "content-type": qr.mime, "cache-control": "public, max-age=60", "x-content-type-options": "nosniff", "content-disposition": "inline" },
  });
}

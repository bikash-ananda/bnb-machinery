import { NextResponse } from "next/server";
import { isAllowedOrigin } from "@/lib/server/auth";
import { rateLimited } from "@/lib/server/ai";
import { getShopProducts } from "@/lib/server/catalog";
import { createOrder, OrderError } from "@/src/modules/sales/orders";
import { InsufficientStockError } from "@/src/modules/inventory/service";
import { isPaymentProvider, paymentProviderName } from "@/lib/server/payment-qr";

export const runtime = "nodejs";

const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return fail("Request blocked.", 403);
  if (rateLimited(request, "order", 8)) return fail("Too many orders. Please wait a minute.", 429);
  if (!process.env.DATABASE_URL) return fail("Order service is temporarily unavailable.", 503);

  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return fail("Invalid request."); }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length === 0 || rawItems.length > 30) return fail("Your cart is empty.");

  const c = (body.customer ?? {}) as Record<string, unknown>;
  const name = str(c.name, 80);
  const phone = str(c.phone, 20);
  const email = str(c.email, 120);
  const address = str(c.address, 200);
  const district = str(c.district, 60);
  const customerNote = str(body.note, 300);
  const delivery = body.delivery === "pickup" ? "pickup" : "delivery";
  const payment = body.payment === "shop" || body.payment === "digital" ? body.payment : "cod";
  const paymentProvider = payment === "digital" && isPaymentProvider(body.paymentProvider) ? body.paymentProvider : null;
  if (payment === "digital" && !paymentProvider) return fail("Choose a bank or wallet for your payment QR.");
  const note = [customerNote, paymentProvider ? `Payment preference: ${paymentProviderName(paymentProvider)}` : ""].filter(Boolean).join("\n").slice(0, 500);

  if (name.length < 2) return fail("Please enter your name.");
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return fail("Please enter a valid phone number.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Please enter a valid email or leave it empty.");
  if (delivery === "delivery" && address.length < 5) return fail("Please enter your delivery address.");

  // The browser never supplies trusted prices or product details.
  const catalog = new Map((await getShopProducts()).map((product) => [product.id, product]));
  const lines: { id: string; slug: string; name: string; qty: number; price: number | null }[] = [];
  for (const item of rawItems) {
    const id = str((item as { id?: unknown }).id, 120);
    const qty = Number((item as { qty?: unknown }).qty);
    const product = catalog.get(id);
    if (!product || !Number.isInteger(qty) || qty < 1 || qty > 99) return fail("An item in your cart is no longer available. Please refresh and try again.");
    if (product.availability === "out") return fail(`“${product.name}” is out of stock.`);
    lines.push({ id, slug: product.slug, name: product.name, qty, price: product.price });
  }

  try {
    const order = await createOrder({
      channel: "WEB",
      customer: { name, phone, email, address, district },
      delivery, payment, note,
      items: lines.map((line) => ({ slug: line.slug, qty: line.qty })),
    });
    const subtotal = lines.reduce((sum, line) => sum + (line.price ?? 0) * line.qty, 0);
    return NextResponse.json({
      orderNo: order.orderNo,
      subtotal,
      total: Number(order.totalPaisa) / 100,
      unpriced: order.unpriced,
      lines,
      saved: true,
      paymentProvider,
      emailNotified: false,
    });
  } catch (error) {
    if (error instanceof InsufficientStockError) return fail(error.message, 409);
    if (error instanceof OrderError) return fail(error.message, 409);
    console.error("PostgreSQL order creation failed:", error);
    return fail("We could not save your order. Please try again or contact the shop.", 503);
  }
}

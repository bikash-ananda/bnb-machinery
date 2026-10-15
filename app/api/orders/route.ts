import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { isAllowedOrigin } from "@/lib/server/auth";
import { rateLimited } from "@/lib/server/ai";
import { getShopProducts } from "@/lib/server/catalog";
import { notifyNewOrder } from "@/lib/server/notify";
import { dbRequest, hasSupabaseConfig } from "@/lib/server/supabase";
import { createOrder } from "@/src/modules/sales/orders";
import { InsufficientStockError } from "@/src/modules/inventory/service";
import { isPaymentProvider, paymentProviderName } from "@/lib/server/payment-qr";

export const runtime = "nodejs";

const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return fail("Request blocked.", 403);
  if (rateLimited(request, "order", 8)) return fail("Too many orders. Please wait a minute.", 429);

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

  // Prices always come from the server catalogue, never from the browser.
  const catalog = new Map((await getShopProducts()).map((p) => [p.id, p]));
  const lines: { id: string; name: string; qty: number; price: number | null }[] = [];
  for (const it of rawItems) {
    const id = str((it as { id?: unknown }).id, 120);
    const qty = Number((it as { qty?: unknown }).qty);
    const p = catalog.get(id);
    if (!p || !Number.isInteger(qty) || qty < 1 || qty > 99) return fail("An item in your cart is no longer available. Please refresh and try again.");
    if (p.availability === "out") return fail(`“${p.name}” is out of stock.`);
    lines.push({ id, name: p.name, qty, price: p.price });
  }

  const subtotal = lines.reduce((n, l) => n + (l.price ?? 0) * l.qty, 0);
  let total = subtotal;
  let unpriced = lines.filter((l) => l.price === null).length;
  const d = new Date();
  const yymmdd = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
  let orderNo = `MTN-${yymmdd}-${randomInt(1000, 10000)}`;

  let saved = false;
  if (!process.env.DATABASE_URL && hasSupabaseConfig()) {
    try {
      await dbRequest("orders", {
        method: "POST",
        headers: { prefer: "return=minimal" },
        body: JSON.stringify({
          order_no: orderNo, customer_name: name, phone, email: email || null,
          address: address || null, district: district || null, delivery_method: delivery,
          payment_method: payment, note: note || null, items: lines, subtotal, unpriced_items: unpriced,
        }),
      });
      saved = true;
    } catch { saved = false; }
  }

  if (process.env.DATABASE_URL) {
    try {
      const o = await createOrder({
        channel: "WEB",
        customer: { name, phone, email, address, district },
        delivery, payment, note,
        items: lines.map((l) => ({ slug: l.id, qty: l.qty })),
      });
      orderNo = o.orderNo;
      total = Number(o.totalPaisa) / 100;
      unpriced = o.unpriced;
      saved = true;
    } catch (e) {
      if (e instanceof InsufficientStockError) return fail(e.message, 409);
      console.error("order save failed", e);
    }
  }

  const summary = lines.map((l, i) => `${i + 1}. ${l.name} x ${l.qty}${l.price !== null ? " - Rs " + (l.price * l.qty).toLocaleString("en-IN") : " - price on request"}`).join("\n");
  const paymentLabel = paymentProvider ? `${payment} (${paymentProviderName(paymentProvider)})` : payment;
  let emailNotified = false;
  if (!saved) emailNotified = await notifyNewOrder(
    `New order ${orderNo} - ${name}`,
    `Order ${orderNo}\nName: ${name}\nPhone: ${phone}\n${email ? "Email: " + email + "\n" : ""}${delivery === "pickup" ? "Pickup from shop" : "Deliver to: " + address + ", " + district}\nPayment: ${paymentLabel}\n\n${summary}\n\nSubtotal: Rs ${subtotal.toLocaleString("en-IN")}\nOrder total: Rs ${total.toLocaleString("en-IN")}${unpriced ? " (+" + unpriced + " item(s) price on request)" : ""}${note ? "\nNote: " + note : ""}`,
  );

  saved ||= emailNotified;

  return NextResponse.json({ orderNo, subtotal, total, unpriced, lines, saved, paymentProvider, emailNotified });
}

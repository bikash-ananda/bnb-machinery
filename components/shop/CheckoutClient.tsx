"use client";

import Link from "next/link";
import { useState } from "react";
import SafeImage from "@/components/ui/SafeImage";
import { company } from "@/data/company";
import { cartTotal, clearCart, unpricedCount, useShop } from "@/lib/shop/store";
import { useTr } from "@/lib/shop/tr";
import { npr } from "@/lib/shop/types";

type Done = { orderNo: string; subtotal: number; total: number; unpriced: number; lines: { name: string; qty: number; price: number | null }[]; saved: boolean; paymentProvider?: PaymentProvider | null; paymentQr?: { svg: string; provider: PaymentProvider; amount: number; payee: string } | null };
type Pay = "cod" | "shop" | "digital";
type PaymentProvider = "adbl" | "nabil" | "esewa";
const PAY_EN: Record<Pay, string> = { cod: "Cash on delivery", shop: "Pay at the shop", digital: "Bank or eSewa QR" };
const PAY_NE: Record<Pay, string> = { cod: "डेलिभरीमा नगद", shop: "पसलमा तिर्ने", digital: "बैंक वा eSewa QR" };
const QR_METHODS: Record<PaymentProvider, { label: string; payee: string; detail: string }> = {
  adbl: { label: "ADBL Bank", payee: "B AND B MACHINARY SUPPLIERS", detail: "Business account ····0016" },
  nabil: { label: "Nabil Bank", payee: "Bikash Bhattarai", detail: "Savings account ····1460" },
  esewa: { label: "eSewa", payee: "Bikash Bhattarai", detail: "eSewa ID ····8600" },
};

export default function CheckoutClient() {
  const tr = useTr();
  const s = useShop();
  const [f, setF] = useState({ name: "", phone: "", email: "", address: "", district: company.serviceAreas[0] ?? "", note: "" });
  const [delivery, setDelivery] = useState<"delivery" | "pickup">("delivery");
  const [payment, setPayment] = useState<Pay>("cod");
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>("adbl");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [custom, setCustom] = useState<{ name: string; phone: string; delivery: string; address: string; district: string; payment: string; paymentProvider: PaymentProvider | null; note: string } | null>(null);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const input = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr(""); setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: s.cart.map((c) => ({ id: c.id, qty: c.qty })), customer: f, delivery, payment, paymentProvider: payment === "digital" ? paymentProvider : undefined, note: f.note }),
      });
      const data = (await res.json()) as Done & { error?: string };
      if (!res.ok) { setErr(data.error || tr("Something went wrong. Please try again or call us.", "केही गडबड भयो। फेरि प्रयास गर्नुहोस् वा फोन गर्नुहोस्।")); return; }
      setCustom({ name: f.name, phone: f.phone, delivery, address: f.address, district: f.district, payment: PAY_EN[payment], paymentProvider: payment === "digital" ? paymentProvider : null, note: f.note });
      setDone(data);
      clearCart();
    } catch {
      setErr(tr("Network problem. Please try again or call us.", "नेटवर्क समस्या। फेरि प्रयास गर्नुहोस् वा फोन गर्नुहोस्।"));
    } finally {
      setBusy(false);
    }
  }

  if (done && custom) {
    const lines = done.lines.map((l, i) => `${i + 1}. ${l.name} x ${l.qty}${l.price !== null ? " - " + npr(l.price * l.qty) : " - price on request"}`).join("\n");
    const qr = done.paymentQr;
    const payable = done.total ?? done.subtotal;
    const text = `New order ${done.orderNo}\nName: ${custom.name}\nPhone: ${custom.phone}\n${custom.delivery === "pickup" ? "Pickup from shop" : `Deliver to: ${custom.address}, ${custom.district}`}\nPayment: ${custom.payment}${custom.paymentProvider ? ` (${QR_METHODS[custom.paymentProvider].label})` : ""}\n\nItems:\n${lines}\n\nTotal: ${payable > 0 ? npr(payable) : "-"}${done.unpriced ? ` (+${done.unpriced} item(s) price on request)` : ""}${custom.note ? "\nNote: " + custom.note : ""}`;
    const qrUrl = qr ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.svg)}` : "";
    return (
      <div className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-lg">
        <p className="text-5xl">✅</p>
        <h2 className="mt-3 text-3xl font-black">{tr("Order received", "अर्डर प्राप्त भयो")}</h2>
        <p className="mt-2 text-slate-600">{tr("Your order number is", "तपाईंको अर्डर नम्बर")}</p>
        <p className="mt-1 text-2xl font-black tracking-wider text-amber-600">{done.orderNo}</p>
        {qr ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left">
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">{tr(`Scan with ${QR_METHODS[qr.provider].label}`, `${QR_METHODS[qr.provider].label} बाट स्क्यान गर्नुहोस्`)}</p>
              <p className="mt-1 text-3xl font-black text-slate-950">{npr(qr.amount)}</p>
              <p className="text-sm text-slate-600">{qr.payee} · {QR_METHODS[qr.provider].detail}</p>
              <img src={qrUrl} alt={`${QR_METHODS[qr.provider].label} payment QR for ${npr(qr.amount)}`} width={256} height={256} className="mx-auto mt-4 rounded-xl border border-slate-200 bg-white p-2" />
              <a href={qrUrl} download={`bnb-${done.orderNo}-${qr.provider}-qr.svg`} className="mt-3 inline-block rounded-lg border border-emerald-700 px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-white">{tr("Download QR", "QR डाउनलोड गर्नुहोस्")}</a>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-700">{tr("This QR contains the payee details, exact NPR order amount and order number. Check the payee and amount in your payment app before confirming. If the app does not read the amount, enter the amount shown above. Delivery charges, if any, are confirmed separately. Your order stays unpaid until our team verifies the transfer.", "यो QR मा भुक्तानी पाउने विवरण, ठ्याक्कै NPR रकम र अर्डर नम्बर छ। भुक्तानी पुष्टि गर्नुअघि एपमा पाउने व्यक्ति र रकम जाँच्नुहोस्। एपले रकम नपढे माथि देखिएको रकम आफैँ राख्नुहोस्। डेलिभरी शुल्क भए छुट्टै पुष्टि हुन्छ। टोलीले कारोबार जाँच नगरेसम्म अर्डर भुक्तानी नभएको अवस्थामा रहन्छ।")}</p>
          </section>
        ) : custom.paymentProvider && done.unpriced > 0 ? (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{tr("Some items need a price confirmation. Our team will confirm your total and send a payment QR on WhatsApp.", "केही वस्तुको मूल्य पुष्टि हुन बाँकी छ। हाम्रो टोलीले जम्मा रकम पुष्टि गरी WhatsApp मा भुक्तानी QR पठाउनेछ।")}</p>
        ) : (
          <p className="mt-4 text-sm text-slate-600">{tr("Send this order on WhatsApp so our team can confirm the final price, delivery and payment with you.", "अन्तिम मूल्य, डेलिभरी र भुक्तानी पुष्टि गर्न यो अर्डर WhatsApp मा पठाउनुहोस्।")}</p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a href={`https://wa.me/977${company.contact.whatsapp}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
            className="rounded-xl bg-emerald-600 px-6 py-4 font-extrabold text-white hover:bg-emerald-700">{tr("Send order on WhatsApp →", "WhatsApp मा अर्डर पठाउनुहोस् →")}</a>
          <a href={`tel:${company.contact.phoneRaw}`} className="rounded-xl border border-slate-300 px-6 py-4 font-bold hover:bg-slate-50">☎ {tr("Call us", "फोन गर्नुहोस्")}</a>
        </div>
        <p className="mt-5 text-xs text-slate-500">{tr("Please save your order number for any follow-up.", "अर्डर सम्बन्धी सोधपुछका लागि अर्डर नम्बर सुरक्षित राख्नुहोस्।")}</p>
        <Link href="/products" className="mt-4 inline-block text-sm font-bold text-amber-600">{tr("Continue shopping", "किनमेल जारी राख्नुहोस्")}</Link>
      </div>
    );
  }

  if (s.cart.length === 0)
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center">
        <p className="text-5xl">{"\u{1F6D2}"}</p>
        <p className="mt-3 text-lg font-bold">{tr("Your cart is empty", "कार्ट खाली छ")}</p>
        <Link href="/products" className="mt-4 inline-block rounded-xl bg-amber-400 px-6 py-3 font-bold">{tr("Browse products", "उत्पादन हेर्नुहोस्")}</Link>
      </div>
    );

  const total = cartTotal(s);
  const unpriced = unpricedCount(s);
  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1.4fr_1fr]" noValidate>
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <fieldset>
          <legend className="text-lg font-black">{tr("How do you want to get it?", "तपाईं कसरी लिनुहुन्छ?")}</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {([["delivery", tr("Delivery to me", "मलाई डेलिभरी")], ["pickup", tr("Pick up at the shop", "पसलबाट लैजाने")]] as const).map(([v, label]) => (
              <label key={v} className={`cursor-pointer rounded-xl border-2 p-4 font-bold ${delivery === v ? "border-amber-400 bg-amber-50" : "border-slate-200"}`}>
                <input type="radio" name="delivery" className="mr-2" checked={delivery === v} onChange={() => setDelivery(v)} />{label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">{tr("Full name *", "पूरा नाम *")}<input className={input} value={f.name} onChange={set("name")} autoComplete="name" required /></label>
          <label className="text-sm font-semibold text-slate-700">{tr("Phone / WhatsApp *", "फोन / WhatsApp *")}<input className={input} value={f.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" required /></label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">{tr("Email (optional)", "इमेल (ऐच्छिक)")}<input className={input} value={f.email} onChange={set("email")} type="email" autoComplete="email" /></label>
          {delivery === "delivery" && (
            <>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">{tr("Delivery address *", "डेलिभरी ठेगाना *")}<input className={input} value={f.address} onChange={set("address")} autoComplete="street-address" placeholder={tr("Town, ward, landmark", "ठाउँ, वडा, चिनारी")} /></label>
              <label className="text-sm font-semibold text-slate-700">{tr("District", "जिल्ला")}
                <select className={input} value={f.district} onChange={set("district")}>
                  {company.serviceAreas.map((a) => <option key={a}>{a}</option>)}<option>Other (we will confirm)</option>
                </select>
              </label>
            </>
          )}
        </div>

        <fieldset>
          <legend className="text-lg font-black">{tr("Payment", "भुक्तानी")}</legend>
          <div className="mt-3 space-y-2">
            {(Object.keys(PAY_EN) as Pay[]).map((k) => (
              <label key={k} className={`flex cursor-pointer items-center rounded-xl border-2 p-4 text-sm font-bold ${payment === k ? "border-amber-400 bg-amber-50" : "border-slate-200"}`}>
                <input type="radio" name="payment" className="mr-3" checked={payment === k} onChange={() => setPayment(k)} />{tr(PAY_EN[k], PAY_NE[k])}
              </label>
            ))}
          </div>
          {payment === "digital" ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold">{tr("Choose where to pay", "कहाँ भुक्तानी गर्ने छान्नुहोस्")}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {(Object.keys(QR_METHODS) as PaymentProvider[]).map((provider) => (
                  <label key={provider} className={`cursor-pointer rounded-xl border-2 bg-white p-3 text-left ${paymentProvider === provider ? "border-emerald-500" : "border-slate-200"}`}>
                    <input type="radio" name="paymentProvider" className="mr-2" checked={paymentProvider === provider} onChange={() => setPaymentProvider(provider)} />
                    <span className="font-bold">{QR_METHODS[provider].label}</span>
                    <span className="mt-1 block text-xs text-slate-600">{QR_METHODS[provider].payee}<br />{QR_METHODS[provider].detail}</span>
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-600">{tr("The QR is created after your order using the server-priced amount. Delivery charges are confirmed separately.", "अर्डरपछि सर्भरले निर्धारण गरेको रकमबाट QR बन्छ। डेलिभरी शुल्क छुट्टै पुष्टि हुन्छ।")}</p>
            </div>
          ) : <p className="mt-2 text-xs text-slate-500">{tr("Payment is collected by our team after the order is confirmed.", "अर्डर पुष्टि भएपछि हाम्रो टोलीले भुक्तानी लिन्छ।")}</p>}
        </fieldset>

        <label className="block text-sm font-semibold text-slate-700">{tr("Note (optional)", "टिप्पणी (ऐच्छिक)")}<textarea className={input} rows={3} maxLength={300} value={f.note} onChange={set("note")} /></label>
        {err && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{err}</p>}
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-28">
        <h2 className="text-lg font-black">{tr("Order summary", "अर्डर सारांश")}</h2>
        <ul className="divide-y divide-slate-100">
          {s.cart.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-3">
              <SafeImage src={c.image} alt={c.name} contain className="h-14 w-14 shrink-0 rounded-lg bg-slate-100 p-1" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{c.name}</p><p className="text-xs text-slate-500">{tr("Qty", "संख्या")} {c.qty}</p></div>
              <p className="text-sm font-bold">{c.price === null ? tr("On request", "सोधपुछमा") : npr(c.price * c.qty)}</p>
            </li>
          ))}
        </ul>
        <div className="flex justify-between text-lg font-black"><span>{tr("Subtotal", "जम्मा")}</span><span>{total > 0 ? npr(total) : "—"}</span></div>
        {unpriced > 0 && <p className="text-xs text-slate-600">{tr(`${unpriced} item(s) are price-on-request. We will send you the final price.`, `${unpriced} वस्तुको मूल्य सोधपुछमा छ। हामी अन्तिम मूल्य पठाउँछौँ।`)}</p>}
        <p className="text-xs text-slate-500">{tr("Delivery charge (if any) is confirmed separately by our team and is not included in the QR amount.", "डेलिभरी शुल्क (भए) टोलीले छुट्टै पुष्टि गर्छ, र QR रकममा समावेश हुँदैन।")}</p>
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-emerald-600 px-6 py-4 font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-60">
          {busy ? tr("Placing order…", "अर्डर गर्दै…") : unpriced > 0 ? tr("Request quote & place order", "कोटेसन माग्नुहोस् र अर्डर गर्नुहोस्") : tr("Place order", "अर्डर गर्नुहोस्")}
        </button>
      </aside>
    </form>
  );
}

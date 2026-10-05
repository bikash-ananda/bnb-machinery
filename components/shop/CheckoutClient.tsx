"use client";

import Link from "next/link";
import { useState } from "react";
import SafeImage from "@/components/ui/SafeImage";
import { company } from "@/data/company";
import { cartTotal, clearCart, unpricedCount, useShop } from "@/lib/shop/store";
import { useTr } from "@/lib/shop/tr";
import { npr } from "@/lib/shop/types";

type Done = { orderNo: string; subtotal: number; unpriced: number; lines: { name: string; qty: number; price: number | null }[]; saved: boolean };
type Pay = "cod" | "shop" | "digital";
const PAY_EN: Record<Pay, string> = { cod: "Cash on delivery", shop: "Pay at the shop", digital: "eSewa / Khalti / bank transfer (we send details)" };
const PAY_NE: Record<Pay, string> = { cod: "डेलिभरीमा नगद", shop: "पसलमा तिर्ने", digital: "eSewa / Khalti / बैंक ट्रान्सफर (हामी विवरण पठाउँछौँ)" };

export default function CheckoutClient() {
  const tr = useTr();
  const s = useShop();
  const [f, setF] = useState({ name: "", phone: "", email: "", address: "", district: company.serviceAreas[0] ?? "", note: "" });
  const [delivery, setDelivery] = useState<"delivery" | "pickup">("delivery");
  const [payment, setPayment] = useState<Pay>("cod");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [custom, setCustom] = useState<{ name: string; phone: string; delivery: string; address: string; district: string; payment: string; note: string } | null>(null);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const input = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErr(""); setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: s.cart.map((c) => ({ id: c.id, qty: c.qty })), customer: f, delivery, payment, note: f.note }),
      });
      const data = (await res.json()) as Done & { error?: string };
      if (!res.ok) { setErr(data.error || tr("Something went wrong. Please try again or call us.", "केही गडबड भयो। फेरि प्रयास गर्नुहोस् वा फोन गर्नुहोस्।")); return; }
      setCustom({ name: f.name, phone: f.phone, delivery, address: f.address, district: f.district, payment: PAY_EN[payment], note: f.note });
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
    const text = `New order ${done.orderNo}\nName: ${custom.name}\nPhone: ${custom.phone}\n${custom.delivery === "pickup" ? "Pickup from shop" : `Deliver to: ${custom.address}, ${custom.district}`}\nPayment: ${custom.payment}\n\nItems:\n${lines}\n\nSubtotal: ${done.subtotal > 0 ? npr(done.subtotal) : "-"}${done.unpriced ? ` (+${done.unpriced} item(s) price on request)` : ""}${custom.note ? "\nNote: " + custom.note : ""}`;
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-lg">
        <p className="text-5xl">✅</p>
        <h2 className="mt-3 text-3xl font-black">{tr("Order received", "अर्डर प्राप्त भयो")}</h2>
        <p className="mt-2 text-slate-600">{tr("Your order number is", "तपाईंको अर्डर नम्बर")}</p>
        <p className="mt-1 text-2xl font-black tracking-wider text-amber-600">{done.orderNo}</p>
        <p className="mt-4 text-sm text-slate-600">{tr("Send this order on WhatsApp so our team can confirm the final price, delivery and payment with you.", "अन्तिम मूल्य, डेलिभरी र भुक्तानी पुष्टि गर्न यो अर्डर WhatsApp मा पठाउनुहोस्।")}</p>
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
          <p className="mt-2 text-xs text-slate-500">{tr("You pay only after our team confirms the price. No online payment is taken on this website.", "हाम्रो टोलीले मूल्य पुष्टि गरेपछि मात्र तिर्नुहोस्। यो वेबसाइटमा अनलाइन भुक्तानी लिइँदैन।")}</p>
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
        <p className="text-xs text-slate-500">{tr("Delivery charge (if any) is confirmed by our team.", "डेलिभरी शुल्क (भए) हाम्रो टोलीले पुष्टि गर्नेछ।")}</p>
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-emerald-600 px-6 py-4 font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-60">
          {busy ? tr("Placing order…", "अर्डर गर्दै…") : unpriced > 0 ? tr("Request quote & place order", "कोटेसन माग्नुहोस् र अर्डर गर्नुहोस्") : tr("Place order", "अर्डर गर्नुहोस्")}
        </button>
      </aside>
    </form>
  );
}

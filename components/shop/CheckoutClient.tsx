"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SafeImage from "@/components/ui/SafeImage";
import { company } from "@/data/company";
import { cartTotal, clearCart, unpricedCount, useShop } from "@/lib/shop/store";
import { useTr } from "@/lib/shop/tr";
import { npr } from "@/lib/shop/types";

type Done = { orderNo: string; subtotal: number; total: number; unpriced: number; lines: { name: string; qty: number; price: number | null }[]; saved: boolean; paymentProvider?: PaymentProvider | null };
type Pay = "cod" | "shop" | "digital";
type PaymentProvider = "adbl" | "nabil" | "esewa";
const PAY_EN: Record<Pay, string> = { cod: "Cash on delivery", shop: "Pay at the shop", digital: "Bank or eSewa QR" };
const PAY_NE: Record<Pay, string> = { cod: "डेलिभरीमा नगद", shop: "पसलमा तिर्ने", digital: "बैंक वा eSewa QR" };
const QR_METHODS: Record<PaymentProvider, { label: string; payee: string; detail: string }> = {
  adbl: { label: "ADBL Bank", payee: "B AND B MACHINARY SUPPLIERS", detail: "Scan the B&B merchant QR" },
  nabil: { label: "Nabil Bank", payee: "Bikash Bhattarai", detail: "Scan the B&B merchant QR" },
  esewa: { label: "eSewa", payee: "Bikash Bhattarai", detail: "Scan the B&B merchant QR" },
};
const QR_IMAGES: Record<PaymentProvider, string> = {
  adbl: "/images/payments/adbl-bank.jpg",
  nabil: "/images/payments/nabil-bank.jpg",
  esewa: "/images/payments/esewa.jpg",
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
  const [qrOpen, setQrOpen] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [custom, setCustom] = useState<{ name: string; phone: string; delivery: string; address: string; district: string; payment: string; paymentProvider: PaymentProvider | null; note: string } | null>(null);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const input = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200";

  useEffect(() => {
    if (!qrOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setQrOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [qrOpen]);

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
      setQrOpen(payment === "digital" && data.saved && data.unpriced === 0 && data.total > 0);
      clearCart();
    } catch {
      setErr(tr("Network problem. Please try again or call us.", "नेटवर्क समस्या। फेरि प्रयास गर्नुहोस् वा फोन गर्नुहोस्।"));
    } finally {
      setBusy(false);
    }
  }

  if (done && custom) {
    const lines = done.lines.map((l, i) => `${i + 1}. ${l.name} x ${l.qty}${l.price !== null ? " - " + npr(l.price * l.qty) : " - price on request"}`).join("\n");
    const provider = done.paymentProvider ?? custom.paymentProvider;
    const payable = done.total ?? done.subtotal;
    const text = `New order ${done.orderNo}\nName: ${custom.name}\nPhone: ${custom.phone}\n${custom.delivery === "pickup" ? "Pickup from shop" : `Deliver to: ${custom.address}, ${custom.district}`}\nPayment: ${custom.payment}${custom.paymentProvider ? ` (${QR_METHODS[custom.paymentProvider].label})` : ""}\n\nItems:\n${lines}\n\nTotal: ${payable > 0 ? npr(payable) : "-"}${done.unpriced ? ` (+${done.unpriced} item(s) price on request)` : ""}${custom.note ? "\nNote: " + custom.note : ""}`;
    const paymentText = `${text}\n\nPayment reference supplied by customer: ${paymentReference.trim()}\nPlease verify the transfer directly in the merchant account before marking this order paid.`;
    return (
      <div className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-lg">
        <p className="text-5xl">✅</p>
        <h2 className="mt-3 text-3xl font-black">{tr(done.saved ? "Order received" : "Order details ready", done.saved ? "अर्डर प्राप्त भयो" : "अर्डर विवरण तयार भयो")}</h2>
        <p className="mt-2 text-slate-600">{tr(done.saved ? "Your order number is" : "Your reference number is", done.saved ? "तपाईंको अर्डर नम्बर" : "तपाईंको सन्दर्भ नम्बर")}</p>
        <p className="mt-1 text-2xl font-black tracking-wider text-amber-600">{done.orderNo}</p>
        {provider && done.unpriced === 0 && done.saved ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left">
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">{tr(`${QR_METHODS[provider].label} payment`, `${QR_METHODS[provider].label} भुक्तानी`)}</p>
                <p className="mt-1 text-2xl font-black text-slate-950">{npr(payable)}</p>
                <p className="text-sm text-slate-600">{QR_METHODS[provider].payee}</p>
              </div>
              <button type="button" onClick={() => setQrOpen(true)} className="rounded-xl bg-emerald-700 px-5 py-3 font-extrabold text-white hover:bg-emerald-800">{tr("Show payment QR", "भुक्तानी QR देखाउनुहोस्")}</button>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-700">{tr("The QR is a static merchant QR and cannot encode this order's amount. Enter the confirmed bill amount shown here in your payment app. Your order stays pending until B&B verifies the transfer.", "यो स्थिर व्यापारी QR हो र यसले अर्डरको रकम समावेश गर्न सक्दैन। भुक्तानी एपमा यहाँ देखाइएको पुष्टि भएको बिल रकम आफैँ राख्नुहोस्। B&B ले कारोबार पुष्टि नगरेसम्म अर्डर बाँकी अवस्थामा रहन्छ।")}</p>
          </section>
        ) : provider && done.unpriced > 0 ? (
          <p className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">{tr("This order contains items awaiting B&B pricing or stock confirmation. Any online market rates shown are references only. Please do not transfer money yet. Our team will confirm your final bill and payment instructions first; the attached merchant QR is static and cannot fill the amount automatically.", "यस अर्डरका वस्तुको B&B मूल्य वा स्टक पुष्टि हुन बाँकी छ। देखाइएका अनलाइन बजारका मूल्य सन्दर्भ मात्र हुन्। अहिले रकम नपठाउनुहोस्। हाम्रो टोलीले पहिले अन्तिम बिल र भुक्तानी निर्देशन पुष्टि गर्नेछ; संलग्न व्यापारी QR स्थिर हो र रकम आफैँ भर्दैन।")}</p>
        ) : provider ? (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">{tr("We could not confirm that the order was saved. Please contact B&B before making a payment.", "अर्डर सुरक्षित भएको पुष्टि गर्न सकेनौँ। भुक्तानी गर्नुअघि B&B मा सम्पर्क गर्नुहोस्।")}</p>
        ) : done.saved ? (
          <p className="mt-4 text-sm text-slate-600">{tr("Send this order on WhatsApp so our team can confirm the final price, delivery and payment with you.", "अन्तिम मूल्य, डेलिभरी र भुक्तानी पुष्टि गर्न यो अर्डर WhatsApp मा पठाउनुहोस्।")}</p>
        ) : (
          <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">{tr("This order has not reached B&B yet. Send it through WhatsApp or call us so we can confirm stock, final price and delivery.", "यो अर्डर अझै B&B सम्म पुगेको छैन। स्टक, अन्तिम मूल्य र डेलिभरी पुष्टि गर्न WhatsApp बाट पठाउनुहोस् वा फोन गर्नुहोस्।")}</p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a href={`https://wa.me/977${company.contact.whatsapp}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
            className="rounded-xl bg-emerald-600 px-6 py-4 font-extrabold text-white hover:bg-emerald-700">{tr("Send order on WhatsApp →", "WhatsApp मा अर्डर पठाउनुहोस् →")}</a>
          <a href={`tel:${company.contact.phoneRaw}`} className="rounded-xl border border-slate-300 px-6 py-4 font-bold hover:bg-slate-50">☎ {tr("Call us", "फोन गर्नुहोस्")}</a>
        </div>
        <p className="mt-5 text-xs text-slate-500">{tr("Please save your order number for any follow-up.", "अर्डर सम्बन्धी सोधपुछका लागि अर्डर नम्बर सुरक्षित राख्नुहोस्।")}</p>
        <Link href="/products" className="mt-4 inline-block text-sm font-bold text-amber-600">{tr("Continue shopping", "किनमेल जारी राख्नुहोस्")}</Link>
        {qrOpen && provider && done.saved && done.unpriced === 0 && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setQrOpen(false); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="payment-qr-title" className="my-auto w-full max-w-xl rounded-3xl bg-white p-5 text-left shadow-2xl sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{tr("Secure payment handoff", "सुरक्षित भुक्तानी प्रक्रिया")}</p><h3 id="payment-qr-title" className="mt-1 text-2xl font-black text-slate-950">{QR_METHODS[provider].label}</h3></div>
                <button type="button" onClick={() => setQrOpen(false)} aria-label={tr("Close payment QR", "भुक्तानी QR बन्द गर्नुहोस्")} className="rounded-full border border-slate-200 px-3 py-1 text-xl font-bold text-slate-600 hover:bg-slate-100">×</button>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr] sm:items-center">
                <div className="rounded-2xl bg-slate-50 p-4 text-center">
                  <img src={QR_IMAGES[provider]} alt={`${QR_METHODS[provider].label} static merchant QR for B&B Machinery`} width={280} height={280} className="mx-auto aspect-square w-full max-w-[260px] rounded-xl border border-slate-200 bg-white object-contain p-2" />
                  <p className="mt-2 text-xs font-bold text-slate-600">{QR_METHODS[provider].payee}</p>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">{tr("Confirmed bill amount", "पुष्टि भएको बिल रकम")}</p><p className="mt-1 text-3xl font-black text-slate-950">{npr(payable)}</p><p className="mt-1 text-xs text-slate-600">{tr("Order", "अर्डर")}: {done.orderNo}</p></div>
                  <p className="text-xs leading-5 text-slate-700">{tr("This uploaded merchant QR is static: the amount and order number are not encoded in the QR. Check the payee name, scan it, and enter the amount shown above yourself. Delivery is confirmed separately.", "अपलोड गरिएको व्यापारी QR स्थिर हो: रकम र अर्डर नम्बर QR मा समावेश छैनन्। पाउने व्यक्तिको नाम जाँचेर QR स्क्यान गर्नुहोस् र माथिको रकम आफैँ राख्नुहोस्। डेलिभरी छुट्टै पुष्टि हुन्छ।")}</p>
                </div>
              </div>
              <label className="mt-5 block text-sm font-bold text-slate-800">{tr("Payment transaction reference", "भुक्तानी कारोबार सन्दर्भ")}<input className={input} value={paymentReference} onChange={(event) => setPaymentReference(event.target.value.slice(0, 80))} placeholder={tr("Enter the reference shown by your payment app", "भुक्तानी एपमा देखिएको सन्दर्भ लेख्नुहोस्")} autoComplete="off" /></label>
              <a href={`https://wa.me/977${company.contact.whatsapp}?text=${encodeURIComponent(paymentText)}`} target="_blank" rel="noopener noreferrer" aria-disabled={paymentReference.trim().length < 3} onClick={(event) => { if (paymentReference.trim().length < 3) event.preventDefault(); }} className={`mt-3 block rounded-xl px-5 py-3 text-center font-extrabold text-white ${paymentReference.trim().length >= 3 ? "bg-emerald-600 hover:bg-emerald-700" : "cursor-not-allowed bg-slate-400"}`}>{tr("Send reference for manual verification →", "म्यानुअल जाँचका लागि सन्दर्भ पठाउनुहोस् →")}</a>
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-950">{tr("Sending a reference does not confirm payment. B&B staff must verify the funds in the bank or wallet account before changing the order to paid. Never share your PIN, password, or OTP.", "सन्दर्भ पठाउँदैमा भुक्तानी पुष्टि हुँदैन। अर्डरलाई भुक्तानी भएको बनाउनुअघि B&B कर्मचारीले बैंक वा वालेट खातामा रकम जाँच गर्नुपर्छ। PIN, पासवर्ड वा OTP कहिल्यै नदिनुहोस्।")}</p>
              <button type="button" onClick={() => setQrOpen(false)} className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 hover:bg-slate-50">{tr("Close", "बन्द गर्नुहोस्")}</button>
            </section>
          </div>
        )}
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
              <p className="mt-3 text-xs leading-5 text-slate-600">{tr("The displayed QR is a static merchant QR. It does not contain the amount; your final amount must be confirmed by B&B and entered manually in the payment app. Orders with reference or unconfirmed prices must wait for our team before payment.", "देखाइएको QR स्थिर व्यापारी QR हो। यसमा रकम हुँदैन; अन्तिम रकम B&B बाट पुष्टि भएपछि भुक्तानी एपमा आफैँ राख्नुहोस्। सन्दर्भ वा अपुष्ट मूल्य भएका अर्डरमा हाम्रो टोलीको पुष्टि पर्खनुहोस्।")}</p>
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
        <div className="flex justify-between text-lg font-black"><span>{tr("Bill total", "बिल जम्मा")}</span><span>{total > 0 ? npr(total) : "—"}</span></div>
        {unpriced > 0 && <p className="text-xs text-slate-600">{tr(`${unpriced} item(s) are price-on-request. We will send you the final price.`, `${unpriced} वस्तुको मूल्य सोधपुछमा छ। हामी अन्तिम मूल्य पठाउँछौँ।`)}</p>}
        <p className="text-xs text-slate-500">{tr("Delivery charge (if any) is confirmed separately by our team and is not included in the QR amount.", "डेलिभरी शुल्क (भए) टोलीले छुट्टै पुष्टि गर्छ, र QR रकममा समावेश हुँदैन।")}</p>
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-emerald-600 px-6 py-4 font-extrabold text-white transition hover:bg-emerald-700 disabled:opacity-60">
          {busy ? tr("Placing order…", "अर्डर गर्दै…") : unpriced > 0 ? tr("Place order · price to confirm", "अर्डर गर्नुहोस् · मूल्य पुष्टि गर्न बाँकी") : payment === "digital" ? tr("Place order & show QR", "अर्डर गरी QR देखाउनुहोस्") : tr("Place order", "अर्डर गर्नुहोस्")}
        </button>
      </aside>
    </form>
  );
}

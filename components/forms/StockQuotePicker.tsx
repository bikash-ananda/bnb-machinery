"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SafeImage from "@/components/ui/SafeImage";
import { company } from "@/data/company";
import { useTr } from "@/lib/shop/tr";
import { npr, type ShopProduct } from "@/lib/shop/types";

type Props = { products: ShopProduct[]; initialItem?: string };

export default function StockQuotePicker({ products, initialItem = "" }: Props) {
  const tr = useTr();
  const initial = products.find((p) => p.id === initialItem || p.slug === initialItem);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [brand, setBrand] = useState("All brands");
  const [selected, setSelected] = useState<Record<string, number>>(() => initial ? { [initial.id]: 1 } : {});
  const [customer, setCustomer] = useState({ name: "", phone: "", note: "" });
  const [error, setError] = useState("");

  const categories = useMemo(() => [...new Set(products.map((p) => p.category))].sort(), [products]);
  const brands = useMemo(() => [...new Set(products.map((p) => p.brand))].sort(), [products]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const text = [p.name, p.brand, p.category, p.model ?? "", p.description].join(" ").toLowerCase();
      return (category === "All categories" || p.category === category) && (brand === "All brands" || p.brand === brand) && (!q || text.includes(q));
    });
  }, [products, search, category, brand]);
  const chosen = products.filter((p) => selected[p.id] > 0);
  const knownTotal = chosen.reduce((sum, p) => sum + (p.price ?? 0) * selected[p.id], 0);
  const unpriced = chosen.filter((p) => p.price === null).length;

  const updateQty = (product: ShopProduct, qty: number) => {
    const max = Math.max(1, product.stockQty ?? 1);
    setSelected((current) => ({ ...current, [product.id]: Math.max(0, Math.min(max, qty)) }));
  };

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (chosen.length === 0) return setError(tr("Choose at least one in-stock item.", "स्टकमा भएको कम्तीमा एउटा वस्तु छान्नुहोस्।"));
    if (customer.name.trim().length < 2 || customer.phone.replace(/\D/g, "").length < 7) return setError(tr("Enter your name and a valid phone number.", "आफ्नो नाम र मान्य फोन नम्बर राख्नुहोस्।"));
    setError("");
    const lines = chosen.map((p) => `• ${p.name}${p.model ? ` (${p.model})` : ""} — Qty ${selected[p.id]}${p.price !== null ? ` — ${npr(p.price * selected[p.id])}` : " — please confirm price"}`).join("\n");
    const message = `Hello Machinery Tools Nepal, please confirm a quotation for these in-stock items:\n\n${lines}\n\nCustomer: ${customer.name.trim()}\nPhone: ${customer.phone.trim()}${customer.note.trim() ? `\nNote: ${customer.note.trim()}` : ""}\n\nKnown item total: ${knownTotal > 0 ? npr(knownTotal) : "price confirmation required"}${unpriced ? ` (${unpriced} line(s) awaiting price)` : ""}. Please confirm the final bill and delivery.`;
    window.open(`https://wa.me/977${company.contact.whatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  const selectClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100";
  const inputClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
      <section className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <label className="block text-sm font-bold text-slate-800">{tr("Search our confirmed stock", "हाम्रो पुष्टि भएको स्टक खोज्नुहोस्")}
            <input className={inputClass} type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr("Machine, tool, part, brand or model…", "मेसिन, औजार, पार्ट्स, ब्रान्ड वा मोडेल…")} aria-label="Search in-stock products" />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">{tr("Category", "श्रेणी")}<select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}><option>All categories</option>{categories.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="text-xs font-bold text-slate-600">{tr("Brand", "ब्रान्ड")}<select className={selectClass} value={brand} onChange={(e) => setBrand(e.target.value)}><option>All brands</option>{brands.map((x) => <option key={x}>{x}</option>)}</select></label>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">{tr("Only products with confirmed positive stock are listed. Quantities are capped at the available stock.", "पुष्टि भएको सकारात्मक स्टक भएका वस्तु मात्र देखाइन्छ। छनोट गर्न मिल्ने संख्या उपलब्ध स्टकसम्म सीमित छ।")}</p>
        </div>

        {visible.length ? <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((p) => {
            const qty = selected[p.id] ?? 0;
            return <article key={p.id} className={`flex gap-3 rounded-2xl border bg-white p-3 shadow-sm transition ${qty ? "border-emerald-400 ring-1 ring-emerald-100" : "border-slate-200 hover:border-amber-300"}`}>
              <Link href={`/products/${p.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100"><SafeImage src={p.image} alt={p.name} contain className="h-full w-full p-2" /></Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{p.brand} · {p.category}</p>
                <Link href={`/products/${p.slug}`} className="mt-1 line-clamp-2 text-sm font-extrabold leading-5 text-slate-950 hover:text-amber-700">{p.name}</Link>
                {p.model && <p className="mt-1 text-[11px] text-slate-500">{tr("Model", "मोडेल")}: {p.model}</p>}
                <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                  <div><p className="text-xs font-black text-slate-900">{p.price !== null ? npr(p.price) : tr("Price on request", "मूल्य सोधपुछमा")}</p><p className="text-[10px] font-bold text-emerald-700">{tr("In stock", "स्टकमा छ")}: {p.stockQty}</p></div>
                  {qty ? <div className="flex items-center rounded-lg border border-slate-300"><button type="button" onClick={() => updateQty(p, qty - 1)} aria-label={`Decrease ${p.name}`} className="h-8 w-8 font-bold">−</button><span className="w-7 text-center text-xs font-bold">{qty}</span><button type="button" onClick={() => updateQty(p, qty + 1)} aria-label={`Increase ${p.name}`} disabled={qty >= (p.stockQty ?? 0)} className="h-8 w-8 font-bold disabled:opacity-40">+</button></div> : <button type="button" onClick={() => updateQty(p, 1)} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">{tr("Choose", "छान्नुहोस्")}</button>}
                </div>
              </div>
            </article>;
          })}
        </div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-3xl">🔎</p><h2 className="mt-3 text-lg font-black text-slate-950">{tr("No matching stock", "मिल्दो स्टक भेटिएन")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{products.length ? tr("Try another search or clear a filter.", "अर्को शब्द खोज्नुहोस् वा फिल्टर हटाउनुहोस्।") : tr("There are no products with a confirmed positive stock quantity right now. Please call us to check current availability.", "अहिले पुष्टि भएको सकारात्मक स्टक संख्या भएका वस्तु छैनन्। हालको उपलब्धता जाँच्न फोन गर्नुहोस्।")}</p>
          {!products.length && <a href={`tel:${company.contact.phoneRaw}`} className="mt-4 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">{tr("Call", "फोन")}: {company.contact.phone}</a>}
        </div>}
      </section>

      <aside className="h-fit space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-28">
        <div><h2 className="text-xl font-black text-slate-950">{tr("Your quote", "तपाईंको कोटेसन")}</h2><p className="mt-1 text-xs text-slate-500">{tr(`${chosen.length} item(s) selected`, `${chosen.length} वस्तु छनोट भयो`)}</p></div>
        {chosen.length ? <ul className="max-h-64 space-y-2 overflow-y-auto">
          {chosen.map((p) => <li key={p.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm"><div className="min-w-0"><p className="font-bold">{p.name}</p><p className="mt-0.5 text-xs text-slate-600">Qty {selected[p.id]} · {p.price !== null ? npr(p.price * selected[p.id]) : tr("price to confirm", "मूल्य पुष्टि गर्न बाँकी")}</p></div><button type="button" onClick={() => updateQty(p, 0)} className="text-xs font-bold text-red-600 hover:underline">{tr("Remove", "हटाउनुहोस्")}</button></li>)}
        </ul> : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">{tr("Choose from products in confirmed stock to build your quotation.", "कोटेसन बनाउन पुष्टि भएको स्टकबाट वस्तु छान्नुहोस्।")}</p>}

        <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-sm font-black"><span>{unpriced ? tr("Known item total", "मूल्य भएका वस्तुको जम्मा") : tr("Estimated bill total", "अनुमानित बिल जम्मा")}</span><span>{knownTotal > 0 || unpriced === 0 ? npr(knownTotal) : tr("To confirm", "पुष्टि गर्नुपर्ने")}</span></div>
        {unpriced > 0 && <p className="-mt-3 text-xs leading-5 text-amber-800">{tr("This total excludes items whose price needs confirmation. B&B will confirm the final bill before payment.", "यो रकममा मूल्य पुष्टि हुन बाँकी वस्तु समावेश छैनन्। भुक्तानीअघि B&B ले अन्तिम बिल पुष्टि गर्नेछ।")}</p>}
        <div className="space-y-3 border-t border-slate-200 pt-4">
          <label className="block text-sm font-semibold text-slate-700">{tr("Your name", "तपाईंको नाम")}<input className={inputClass} autoComplete="name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} required /></label>
          <label className="block text-sm font-semibold text-slate-700">{tr("Phone / WhatsApp", "फोन / WhatsApp")}<input className={inputClass} autoComplete="tel" inputMode="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} required /></label>
          <label className="block text-sm font-semibold text-slate-700">{tr("Note (optional)", "टिप्पणी (ऐच्छिक)")}<textarea className={inputClass} rows={2} maxLength={300} value={customer.note} onChange={(e) => setCustomer({ ...customer, note: e.target.value })} /></label>
        </div>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <button type="submit" disabled={!chosen.length} className="w-full rounded-xl bg-emerald-600 px-5 py-4 font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{tr("Send quote request on WhatsApp →", "WhatsApp मा कोटेसन पठाउनुहोस् →")}</button>
        <p className="text-[11px] leading-5 text-slate-500">{tr("Your request opens in WhatsApp for you to review and send. Never share your payment PIN or OTP.", "तपाईंले समीक्षा गरी पठाउन WhatsApp खुल्छ। भुक्तानी PIN वा OTP कसैलाई नदिनुहोस्।")}</p>
      </aside>
    </form>
  );
}

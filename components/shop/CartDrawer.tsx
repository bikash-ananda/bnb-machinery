"use client";

import Link from "next/link";
import { useEffect } from "react";
import SafeImage from "@/components/ui/SafeImage";
import Draggable from "@/components/ui/Draggable";
import { cartCount, cartTotal, clearCart, clearCompare, removeItem, setDrawer, setQty, unpricedCount, useShop } from "@/lib/shop/store";
import { useTr } from "@/lib/shop/tr";
import { npr } from "@/lib/shop/types";

export default function CartDrawer() {
  const tr = useTr();
  const s = useShop();
  const count = cartCount(s);
  const total = cartTotal(s);
  const unpriced = unpricedCount(s);

  useEffect(() => {
    if (!s.open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s.open]);

  return (
    <>
      {s.compare.length > 0 && (
        <div className="fixed bottom-32 left-1/2 z-[54] flex -translate-x-1/2 items-center gap-3 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-xl sm:bottom-6">
          <Link href="/compare" className="hover:text-amber-300">⇄ {tr("Compare", "तुलना")} ({s.compare.length}) →</Link>
          <button type="button" onClick={clearCompare} aria-label="Clear compare list" className="text-slate-400 hover:text-white">×</button>
        </div>
      )}

      <Draggable id="cart" className="fixed bottom-16 left-4 z-[55] sm:bottom-20 sm:left-5">
      <button type="button" onClick={() => setDrawer(true)} aria-label={`Open cart, ${count} items`}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-amber-400 text-2xl text-slate-950 shadow-lg transition hover:scale-105">
        {"\u{1F6D2}"}
        {count > 0 && <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-black text-white">{count}</span>}
      </button>
      </Draggable>

      {s.open && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Shopping cart">
          <button type="button" aria-label="Close cart" className="absolute inset-0 bg-slate-950/60" onClick={() => setDrawer(false)} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-black">{tr("Your cart", "तपाईंको कार्ट")} ({count})</h2>
              <button type="button" onClick={() => setDrawer(false)} aria-label="Close" className="text-2xl leading-none">×</button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {s.cart.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-5xl">{"\u{1F6D2}"}</p>
                  <p className="mt-3 font-bold">{tr("Your cart is empty", "कार्ट खाली छ")}</p>
                  <Link href="/products" onClick={() => setDrawer(false)} className="mt-4 inline-block rounded-xl bg-amber-400 px-5 py-3 font-bold">{tr("Browse products", "उत्पादन हेर्नुहोस्")}</Link>
                </div>
              ) : (
                s.cart.map((c) => (
                  <div key={c.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                    <SafeImage src={c.image} alt={c.name} contain className="h-20 w-20 shrink-0 rounded-lg bg-slate-100 p-1" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/products/${c.slug}`} onClick={() => setDrawer(false)} className="line-clamp-2 text-sm font-bold hover:text-amber-600">{c.name}</Link>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{c.price === null ? tr("Price on request", "मूल्य सोधपुछमा") : npr(c.price * c.qty)}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center overflow-hidden rounded-lg border border-slate-300">
                          <button type="button" aria-label="Decrease" onClick={() => setQty(c.id, c.qty - 1)} className="h-8 w-8 font-bold hover:bg-slate-100">−</button>
                          <span className="w-8 text-center text-sm font-bold">{c.qty}</span>
                          <button type="button" aria-label="Increase" onClick={() => setQty(c.id, c.qty + 1)} className="h-8 w-8 font-bold hover:bg-slate-100">+</button>
                        </div>
                        <button type="button" onClick={() => removeItem(c.id)} className="text-xs font-bold text-red-600 hover:underline">{tr("Remove", "हटाउनुहोस्")}</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {s.cart.length > 0 && (
              <div className="space-y-3 border-t border-slate-200 p-5">
                <div className="flex items-center justify-between text-lg font-black">
                  <span>{tr("Subtotal", "जम्मा")}</span><span>{total > 0 ? npr(total) : "—"}</span>
                </div>
                {unpriced > 0 && <p className="text-xs text-slate-600">{tr(`${unpriced} item(s) are price-on-request. Our team confirms the final price before you pay.`, `${unpriced} वस्तुको मूल्य सोधपुछमा छ। तिर्नुअघि हाम्रो टोलीले अन्तिम मूल्य पुष्टि गर्नेछ।`)}</p>}
                <Link href="/checkout" onClick={() => setDrawer(false)} className="block rounded-xl bg-emerald-600 px-5 py-4 text-center font-extrabold text-white hover:bg-emerald-700">
                  {unpriced > 0 ? tr("Request quote / Checkout →", "कोटेसन माग्नुहोस् / चेकआउट →") : tr("Checkout →", "चेकआउट →")}
                </Link>
                <button type="button" onClick={clearCart} className="w-full text-sm font-semibold text-slate-500 hover:text-red-600">{tr("Clear cart", "कार्ट खाली गर्नुहोस्")}</button>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

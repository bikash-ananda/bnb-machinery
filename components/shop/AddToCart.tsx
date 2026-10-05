"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addToCart } from "@/lib/shop/store";
import { useTr } from "@/lib/shop/tr";
import type { ShopProduct } from "@/lib/shop/types";

const toItem = (p: ShopProduct) => ({ id: p.id, name: p.name, price: p.price, image: p.image, slug: p.slug });

export default function AddToCart({ product, detail = false }: { product: ShopProduct; detail?: boolean }) {
  const tr = useTr();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  const out = product.availability === "out";
  const label = product.price === null ? tr("Add to quote list", "कोटेसन सूचीमा थप्नुहोस्") : tr("Add to cart", "कार्टमा थप्नुहोस्");
  const text = out ? tr("Out of stock", "स्टकमा छैन") : done ? tr("Added ✓", "थपियो ✓") : label;

  function add(buyNow = false) {
    addToCart(toItem(product), detail ? qty : 1, !buyNow);
    if (buyNow) { router.push("/checkout"); return; }
    setDone(true);
    setTimeout(() => setDone(false), 1400);
  }

  if (!detail)
    return (
      <button type="button" disabled={out} onClick={() => add()}
        className="w-full rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{text}</button>
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center overflow-hidden rounded-xl border border-slate-300 bg-white">
          <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-12 w-12 text-xl font-bold hover:bg-slate-100">−</button>
          <span className="w-12 text-center font-bold" aria-live="polite">{qty}</span>
          <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(99, q + 1))} className="h-12 w-12 text-xl font-bold hover:bg-slate-100">+</button>
        </div>
        <button type="button" disabled={out} onClick={() => add()} className="h-12 flex-1 rounded-xl bg-[var(--brand-primary)] px-6 font-bold text-white transition hover:bg-slate-800 disabled:opacity-50">{text}</button>
      </div>
      <button type="button" disabled={out} onClick={() => add(true)} className="h-12 w-full rounded-xl bg-amber-400 font-extrabold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50">
        {product.price === null ? tr("Request quote now →", "अहिले कोटेसन माग्नुहोस् →") : tr("Buy now →", "अहिले किन्नुहोस् →")}
      </button>
    </div>
  );
}

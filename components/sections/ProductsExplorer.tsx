"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AddToCart from "@/components/shop/AddToCart";
import Reveal from "@/components/ui/Reveal";
import SafeImage from "@/components/ui/SafeImage";
import { toggleWish, useShop } from "@/lib/shop/store";
import { discountPct, npr, type ShopProduct } from "@/lib/shop/types";

type Sort = "featured" | "name" | "low" | "high";

type LegacyProduct = { id: string; name: string; category: string; brand: string; image: string; description: string; featured?: boolean };

const normalize = (p: ShopProduct | LegacyProduct): ShopProduct =>
  "slug" in p
    ? p
    : { id: p.id, slug: p.id, name: p.name, brand: p.brand, category: p.category, image: p.image, images: [p.image], description: p.description, specs: [], price: null, mrp: null, availability: "ask", stockQty: null, featured: p.featured };

export default function ProductsExplorer({ products: input }: { products: (ShopProduct | LegacyProduct)[]; categories?: string[] }) {
  const products = useMemo(() => input.map(normalize), [input]);
  const { wish } = useShop();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [brand, setBrand] = useState("All");
  const [sort, setSort] = useState<Sort>("featured");
  const [stockOnly, setStockOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);

  const cats = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category)))], [products]);
  const brands = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.brand)))], [products]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out = products.filter((p) =>
      (cat === "All" || p.category === cat) && (brand === "All" || p.brand === brand) &&
      (!stockOnly || p.availability === "in") && (!savedOnly || wish.includes(p.id)) &&
      (!term || [p.name, p.brand, p.category, p.model ?? "", p.description].join(" ").toLowerCase().includes(term)));
    if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "low") out.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (sort === "high") out.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    if (sort === "featured") out.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    return out;
  }, [products, q, cat, brand, sort, stockOnly, savedOnly, wish]);

  const sel = "rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-amber-500";
  const chip = (on: boolean) => `rounded-full border px-4 py-2 text-sm font-semibold transition ${on ? "border-amber-400 bg-amber-400 text-slate-950" : "border-slate-300 bg-white text-slate-700 hover:border-amber-400"}`;

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Search machines, brands, models…" aria-label="Search products"
            className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 lg:max-w-md" />
          <div className="flex flex-wrap gap-2">
            <select aria-label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)} className={sel}>
              {brands.map((b) => <option key={b} value={b}>{b === "All" ? "All brands" : b}</option>)}
            </select>
            <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={sel}>
              <option value="featured">Featured</option><option value="name">Name A–Z</option>
              <option value="low">Price: low to high</option><option value="high">Price: high to low</option>
            </select>
            <button type="button" aria-pressed={stockOnly} onClick={() => setStockOnly(!stockOnly)} className={chip(stockOnly)}>In stock</button>
            <button type="button" aria-pressed={savedOnly} onClick={() => setSavedOnly(!savedOnly)} className={chip(savedOnly)}>♥ Saved ({wish.length})</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c} className={chip(cat === c)}>{c}</button>)}
        </div>
        <p className="text-sm text-slate-500">{list.length} product{list.length === 1 ? "" : "s"}</p>
      </div>

      {list.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="font-bold">No match found.</p>
          <Link href={`/contact?item=${encodeURIComponent(q)}`} className="mt-3 inline-block font-bold text-amber-600">Ask us to source “{q || "your item"}” →</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((p, i) => {
            const off = discountPct(p);
            const saved = wish.includes(p.id);
            return (
              <Reveal key={p.id} delay={(i % 4) * 0.05}>
                <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-amber-400 hover:shadow-xl">
                  <div className="relative aspect-square overflow-hidden bg-slate-100">
                    <Link href={`/products/${p.slug}`} aria-label={p.name}>
                      <SafeImage src={p.image} alt={p.name} contain className="h-full w-full p-4 transition duration-500 group-hover:scale-105" />
                    </Link>
                    <button type="button" onClick={() => toggleWish(p.id)} aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save for later"}
                      className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg shadow ${saved ? "text-red-600" : "text-slate-400 hover:text-red-500"}`}>
                      {saved ? "♥" : "♡"}
                    </button>
                    <div className="absolute left-3 top-3 flex flex-col gap-1">
                      {p.featured && <span className="rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase">Featured</span>}
                      {off > 0 && <span className="rounded-full bg-red-600 px-3 py-1 text-[10px] font-black text-white">{off}% OFF</span>}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-600">{p.brand}</p>
                    <Link href={`/products/${p.slug}`} className="mt-1 text-lg font-extrabold text-slate-950 hover:text-amber-600">{p.name}</Link>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.description}</p>
                    <div className="mt-3 flex items-baseline gap-2">
                      {p.price !== null ? (
                        <>
                          <span className="text-xl font-black text-slate-950">{npr(p.price)}</span>
                          {p.mrp && p.mrp > p.price && <span className="text-sm text-slate-400 line-through">{npr(p.mrp)}</span>}
                        </>
                      ) : <span className="text-sm font-bold text-slate-600">Price on request</span>}
                    </div>
                    <p className={`mt-1 text-xs font-bold ${p.availability === "in" ? "text-emerald-600" : p.availability === "out" ? "text-red-600" : "text-slate-500"}`}>
                      {p.availability === "in" ? (p.stockQty !== null && p.stockQty <= 3 ? `Only ${p.stockQty} left` : "In stock") : p.availability === "out" ? "Out of stock" : "Ask for availability"}
                    </p>
                    <div className="mt-auto pt-4"><AddToCart product={p} /></div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      )}
    </>
  );
}

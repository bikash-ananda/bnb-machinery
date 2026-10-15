"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownWideNarrow, Heart, LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";
import AddToCart from "@/components/shop/AddToCart";
import CompareButton from "@/components/shop/CompareButton";
import SafeImage from "@/components/ui/SafeImage";
import { toggleWish, useShop } from "@/lib/shop/store";
import { discountPct, npr, type ShopProduct } from "@/lib/shop/types";

type LegacyProduct = {
  id: string;
  name: string;
  category: string;
  brand: string;
  image: string;
  description: string;
  featured?: boolean;
};
type InitialFilters = { q?: string; category?: string; brand?: string; saved?: boolean };
type Props = { products: (ShopProduct | LegacyProduct)[]; categories?: string[]; initial?: InitialFilters };

const normalize = (product: ShopProduct | LegacyProduct): ShopProduct =>
  "slug" in product
    ? product
    : {
        id: product.id,
        slug: product.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        image: product.image,
        images: product.image ? [product.image] : [],
        description: product.description,
        specs: [],
        price: null,
        mrp: null,
        availability: "ask",
        stockQty: null,
        featured: product.featured,
      };

export default function ProductsExplorer({ products: input, initial }: Props) {
  const products = useMemo(() => input.map(normalize), [input]);
  const { wish } = useShop();
  const [q, setQ] = useState(initial?.q ?? "");
  const [cat, setCat] = useState(initial?.category ?? "All categories");
  const [brand, setBrand] = useState(initial?.brand ?? "All brands");
  const [sort, setSort] = useState<"featured" | "name" | "low" | "high">("featured");
  const [stockOnly, setStockOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(initial?.saved ?? false);
  const [pricedOnly, setPricedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listView, setListView] = useState(false);

  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category).filter(Boolean)).values()).sort(), [products]);
  const brands = useMemo(() => Array.from(new Set(products.map((product) => product.brand).filter(Boolean)).values()).sort(), [products]);
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const result = products.filter((product) => {
      const searchable = [product.name, product.brand, product.category, product.model ?? "", product.description, ...product.specs.map((spec) => `${spec.name} ${spec.value}`)].join(" ").toLowerCase();
      return (
        (cat === "All categories" || product.category === cat) &&
        (brand === "All brands" || product.brand === brand) &&
        (!stockOnly || product.availability === "in") &&
        (!savedOnly || wish.includes(product.id)) &&
        (!pricedOnly || product.price != null || product.marketPrice != null) &&
        (!term || searchable.includes(term))
      );
    });
    if (sort === "name") result.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "low") result.sort((a, b) => (a.price ?? a.marketPrice ?? Number.POSITIVE_INFINITY) - (b.price ?? b.marketPrice ?? Number.POSITIVE_INFINITY));
    if (sort === "high") result.sort((a, b) => (b.price ?? b.marketPrice ?? -1) - (a.price ?? a.marketPrice ?? -1));
    if (sort === "featured") result.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    return result;
  }, [products, q, cat, brand, stockOnly, savedOnly, pricedOnly, sort, wish]);

  const clearFilters = () => {
    setQ(""); setCat("All categories"); setBrand("All brands"); setSort("featured");
    setStockOnly(false); setSavedOnly(false); setPricedOnly(false);
  };
  const hasFilters = !!q || cat !== "All categories" || brand !== "All brands" || stockOnly || savedOnly || pricedOnly;
  const selectClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100";
  const checkboxClass = "h-4 w-4 rounded border-slate-300 accent-amber-500";

  const filterPanel = (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-950">Filters</h2>
        {hasFilters && <button type="button" onClick={clearFilters} className="text-xs font-bold text-amber-700 hover:underline">Clear all</button>}
      </div>

      <label className="block text-sm font-bold text-slate-800">Category
        <select value={cat} onChange={(event) => setCat(event.target.value)} className={`${selectClass} mt-2`}>
          <option>All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}
        </select>
      </label>

      <label className="block text-sm font-bold text-slate-800">Brand
        <select value={brand} onChange={(event) => setBrand(event.target.value)} className={`${selectClass} mt-2`}>
          <option>All brands</option>{brands.map((value) => <option key={value}>{value}</option>)}
        </select>
      </label>

      <div className="space-y-3 border-t border-slate-100 pt-5">
        <p className="text-sm font-bold text-slate-800">Availability & price</p>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input className={checkboxClass} type="checkbox" checked={stockOnly} onChange={(event) => setStockOnly(event.target.checked)} />Show confirmed in-stock only</label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input className={checkboxClass} type="checkbox" checked={pricedOnly} onChange={(event) => setPricedOnly(event.target.checked)} />Show products with a reference rate</label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input className={checkboxClass} type="checkbox" checked={savedOnly} onChange={(event) => setSavedOnly(event.target.checked)} />Saved products ({wish.length})</label>
      </div>

      <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        Reference rates come from Nepal online listings. B&B confirms the final rate, delivery and stock before payment.
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-[#101c2e] text-white shadow-xl">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
          <div className="px-6 py-8 sm:px-9 sm:py-10 lg:px-11">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Pokhara · Gandaki · Nepal</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-black leading-tight sm:text-4xl">Tools and machines for the work ahead.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Browse power tools, farm equipment, workshop machines and everyday hardware. Search by product, brand or model.</p>
            <label className="mt-6 flex max-w-2xl items-center gap-3 rounded-2xl bg-white p-2 pl-4 text-slate-500 shadow-lg">
              <Search size={19} aria-hidden="true" />
              <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search drill, tiller, Deli, INGCO, model…" aria-label="Search products by name, brand or model" className="min-w-0 flex-1 bg-transparent py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400" />
              {q && <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={17} /></button>}
              <Link href="/search" className="hidden rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300 sm:block">Smart search</Link>
            </label>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-200">
              <span className="rounded-full border border-white/15 px-3 py-1.5">Retail & wholesale</span>
              <span className="rounded-full border border-white/15 px-3 py-1.5">Local pickup in Pokhara</span>
              <span className="rounded-full border border-white/15 px-3 py-1.5">Delivery confirmed per order</span>
            </div>
          </div>
          <div className="relative hidden min-h-64 lg:block">
            <SafeImage src="/images/IMG-20261004-WA0007.jpg" alt="Power tillers displayed at the Pokhara machinery showroom" className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#101c2e] via-[#101c2e]/50 to-transparent" />
            <div className="absolute bottom-6 right-7 rounded-2xl border border-white/15 bg-slate-950/70 px-4 py-3 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-300">B&B Machinery</p>
              <p className="mt-1 text-sm font-extrabold">Equipment, support and spares</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)]">
        <aside className={`${filtersOpen ? "block" : "hidden"} xl:block`}>
          <div className="sticky top-24">{filterPanel}</div>
        </aside>

        <section className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:px-5">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setFiltersOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800 hover:border-amber-400 xl:hidden">
                <SlidersHorizontal size={16} />Filters{hasFilters ? " · Active" : ""}
              </button>
              <p className="text-sm text-slate-600"><strong className="text-slate-950">{list.length}</strong> products</p>
              {brand !== "All brands" && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">{brand}</span>}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ArrowDownWideNarrow size={16} className="hidden text-slate-400 sm:block" />
              <select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500">
                <option value="featured">Recommended</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="name">Name A–Z</option>
              </select>
              <div className="hidden overflow-hidden rounded-xl border border-slate-200 sm:flex">
                <button type="button" aria-label="Grid view" aria-pressed={!listView} onClick={() => setListView(false)} className={`p-2.5 ${!listView ? "bg-slate-900 text-white" : "bg-white text-slate-500"}`}><LayoutGrid size={17} /></button>
                <button type="button" aria-label="List view" aria-pressed={listView} onClick={() => setListView(true)} className={`p-2.5 ${listView ? "bg-slate-900 text-white" : "bg-white text-slate-500"}`}><List size={17} /></button>
              </div>
            </div>
          </div>

          {list.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700"><Search /></div>
              <h2 className="mt-4 text-xl font-black text-slate-950">No products match those filters</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">Try a model number, clear a filter, or ask our team to source a specific machine or spare part.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={clearFilters} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">Clear filters</button>
                <Link href={`/contact?item=${encodeURIComponent(q || "machinery requirement")}`} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-amber-500 hover:text-slate-950">Ask us to source it</Link>
              </div>
            </div>
          ) : (
            <div className={`mt-5 grid gap-4 ${listView ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"}`}>
              {list.map((product) => {
                const saved = wish.includes(product.id);
                const discount = discountPct(product);
                return (
                  <article key={product.id} className={`group relative flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg ${listView ? "flex-row" : "flex-col"}`}>
                    <div className={`relative shrink-0 overflow-hidden bg-[#f7f8fa] ${listView ? "h-36 w-36 sm:h-48 sm:w-56" : "aspect-[4/3] w-full"}`}>
                      <Link href={`/products/${product.slug}`} aria-label={`View ${product.name}`} className="block h-full w-full">
                        <SafeImage src={product.image} alt={product.name} contain className="h-full w-full p-3 transition duration-300 group-hover:scale-[1.04]" />
                      </Link>
                      <button type="button" onClick={() => toggleWish(product.id)} aria-label={saved ? "Remove from saved" : "Save product"} aria-pressed={saved} className={`absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full border bg-white/95 shadow-sm ${saved ? "border-rose-200 text-rose-600" : "border-slate-200 text-slate-500 hover:text-rose-600"}`}>
                        <Heart size={17} fill={saved ? "currentColor" : "none"} />
                      </button>
                      <div className="absolute left-2 top-2 flex max-w-[calc(100%-3.5rem)] flex-col items-start gap-1">
                        {product.featured && <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black uppercase text-slate-950">Featured</span>}
                        {discount > 0 && <span className="rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-black text-white">{discount}% off</span>}
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col p-3.5 sm:p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">{product.brand} <span className="px-1 text-slate-300">/</span> {product.category}</p>
                      <Link href={`/products/${product.slug}`} className="mt-1 line-clamp-2 min-h-10 text-sm font-extrabold leading-5 text-slate-950 hover:text-amber-700 sm:text-base">{product.name}</Link>
                      {product.model && <p className="mt-1 text-[11px] font-semibold text-slate-500">Model: {product.model}</p>}
                      <p className={`mt-2 line-clamp-2 text-xs leading-5 text-slate-600 ${listView ? "sm:line-clamp-3" : "hidden sm:block"}`}>{product.description}</p>

                      <div className="mt-auto pt-3">
                        {product.price !== null || product.marketPrice != null ? (
                          <>
                            <p className="text-base font-black text-slate-950 sm:text-lg">{npr(product.price ?? product.marketPrice ?? 0)}</p>
                            {product.marketReference && <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">Online reference rate</p>}
                          </>
                        ) : <p className="text-sm font-black text-slate-800">Price on request</p>}
                        <p className={`mt-1 text-[11px] font-bold ${product.availability === "in" ? "text-emerald-700" : product.availability === "out" ? "text-rose-700" : "text-slate-500"}`}>
                          {product.availability === "in" ? "In stock" : product.availability === "out" ? "Out of stock" : "Availability confirmed on request"}
                        </p>
                      </div>

                      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                        <AddToCart product={product} />
                        <CompareButton id={product.id} className="rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:border-amber-400 hover:text-slate-950" />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <p className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
            Nepal online listing rates are shown as a shopping reference. They are not confirmation of B&B stock or a final B&B offer. Our team confirms the final price, warranty, availability and delivery before payment.
          </p>
        </section>
      </div>
    </div>
  );
}

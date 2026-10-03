"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import SafeImage from "@/components/ui/SafeImage";
import Reveal from "@/components/ui/Reveal";
import { productImage } from "@/data/siteImages";
import type { Product } from "@/data/products";

export default function ProductsExplorer({ products, categories }: { products: Product[]; categories: string[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const list = useMemo(() => products.filter((p) =>
    (cat === "All" || p.category === cat) &&
    (p.name + " " + p.description + " " + p.brand).toLowerCase().includes(q.trim().toLowerCase())), [products, q, cat]);

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Search machines, tools, parts…" aria-label="Search products"
          className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 lg:max-w-md" />
        <div className="flex flex-wrap gap-2">
          {["All", ...categories].map((c) => (
            <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${cat === c ? "border-amber-400 bg-amber-400 text-slate-950" : "border-slate-300 bg-white text-slate-700 hover:border-amber-400"}`}>{c}</button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="font-bold">No match found.</p>
          <Link href={`/contact?item=${encodeURIComponent(q)}`} className="mt-3 inline-block font-bold text-amber-600">Ask us for “{q || "your item"}” →</Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((p, i) => (
            <Reveal key={p.id} delay={(i % 4) * 0.06}>
              <article className="group h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:border-amber-400 hover:shadow-xl">
                <div className="relative aspect-square overflow-hidden bg-slate-100">
                  <SafeImage src={productImage(p.id, p.image)} alt={p.name} contain className="h-full w-full p-4 transition duration-500 group-hover:scale-105" />
                  {p.featured && <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase">Featured</span>}
                </div>
                <div className="p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-600">{p.category}</p>
                  <h3 className="mt-1 text-lg font-extrabold text-slate-950">{p.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{p.description}</p>
                  <div className="mt-4 flex gap-4 text-sm font-bold">
                    {p.href && <Link href={p.href} className="text-slate-950 hover:text-amber-600">Details →</Link>}
                    <Link href={`/contact?item=${encodeURIComponent(p.name)}`} className="text-emerald-700 hover:text-emerald-900">Get quote →</Link>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      )}
    </>
  );
}

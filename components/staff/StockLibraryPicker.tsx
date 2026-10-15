"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, LoaderCircle, PackagePlus, Search } from "lucide-react";

type LibraryItem = {
  id: string;
  manufacturer: string;
  model: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  sourceUrl: string;
  sourceName: string;
  specifications: string[];
};

type LibraryResponse = {
  items: LibraryItem[];
  total: number;
  brands: string[];
  categories: string[];
  error?: string;
};

const PAGE_SIZE = 24;

export default function StockLibraryPicker() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<LibraryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          brand,
          category,
          offset: String(page * PAGE_SIZE),
        });
        const response = await fetch(`/api/staff/inventory/library?${params}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const result = (await response.json()) as LibraryResponse;
        if (!response.ok) throw new Error(result.error || "The product library could not be loaded.");
        setItems(result.items);
        setTotal(result.total);
        setBrands(result.brands);
        setCategories(result.categories);
        setError("");
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "The product library could not be loaded.");
          setItems([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, brand, category, page]);

  function updateBrand(value: string) {
    setBrand(value);
    setPage(0);
  }

  function updateCategory(value: string) {
    setCategory(value);
    setPage(0);
  }

  async function addSelectedToStock() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/staff/inventory/library", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId: selected.id }),
      });
      const result = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !result.id) throw new Error(result.error || "The stock draft could not be created.");
      router.push(`/staff/inventory/${encodeURIComponent(result.id)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The stock draft could not be created.");
      setBusy(false);
    }
  }

  const selectClass = "min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-white shadow-sm">
      <div className="border-b border-amber-100 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-800">Manufacturer product library</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Find a model and add it to stock</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Search official product names, model numbers and descriptions. Selecting a model fills in its details and manufacturer image; enter real stock in the next step.
            </p>
          </div>
          <span className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-900">{total.toLocaleString()} matches</span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(220px,1fr)_190px_220px]">
          <label className="relative block">
            <span className="sr-only">Search by model or product name</span>
            <Search aria-hidden="true" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(0); }}
              placeholder="Search name, model or detail…"
              className={`${selectClass} w-full pl-9`}
            />
          </label>
          <label>
            <span className="sr-only">Filter by manufacturer</span>
            <select value={brand} onChange={(event) => updateBrand(event.target.value)} className={`${selectClass} w-full`}>
              <option value="">All manufacturers</option>
              {brands.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by category</span>
            <select value={category} onChange={(event) => updateCategory(event.target.value)} className={`${selectClass} w-full`}>
              <option value="">All categories</option>
              {categories.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>
      </div>

      {selected ? (
        <div className="mx-5 mt-4 flex flex-col gap-4 rounded-xl border border-amber-300 bg-white p-4 shadow-sm sm:mx-6 sm:flex-row sm:items-center">
          <div className="h-24 w-28 shrink-0 overflow-hidden rounded-lg bg-slate-50">
            {/* Manufacturer product images are deliberately displayed from their official catalog URLs. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.imageUrl} alt={selected.name} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain p-2" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800">{selected.manufacturer} · {selected.category}</p>
            <h3 className="mt-1 font-black text-slate-950">{selected.name}</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">Model {selected.model}</p>
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{selected.description}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
            <button type="button" onClick={() => void addSelectedToStock()} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600 disabled:cursor-wait disabled:opacity-60">
              {busy ? <LoaderCircle size={17} className="animate-spin" /> : <PackagePlus size={17} />}
              {busy ? "Preparing draft…" : "Use model"}
            </button>
            <button type="button" onClick={() => setSelected(null)} disabled={busy} className="min-h-10 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Clear</button>
          </div>
        </div>
      ) : null}

      {error ? <p role="alert" className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:mx-6">{error}</p> : null}

      <div className="p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>{loading ? "Searching manufacturer records…" : `${items.length ? page * PAGE_SIZE + 1 : 0}–${page * PAGE_SIZE + items.length} of ${total.toLocaleString()}`}</span>
          <span>Official image · stock stays unavailable until approval</span>
        </div>

        {loading ? (
          <div className="flex min-h-36 items-center justify-center gap-2 text-sm font-semibold text-slate-500"><LoaderCircle size={18} className="animate-spin" />Searching the product library</div>
        ) : items.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { setSelected(item); setError(""); }}
                aria-pressed={selected?.id === item.id}
                className={`flex min-w-0 items-center gap-3 rounded-xl border p-2.5 text-left transition hover:border-amber-300 hover:bg-amber-50/70 ${selected?.id === item.id ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"}`}
              >
                <span className="h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain p-1" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[10px] font-black uppercase tracking-wide text-slate-500">{item.manufacturer} · {item.category}</span>
                  <span className="mt-0.5 block line-clamp-2 text-sm font-bold leading-5 text-slate-900">{item.name}</span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">Model {item.model}</span>
                </span>
                <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700">Select</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center">
            <p className="font-bold text-slate-800">No manufacturer items match</p>
            <p className="mt-1 text-sm text-slate-500">Try a model number, a shorter term, or clear a manufacturer/category filter.</p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0 || loading} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft size={16} />Previous</button>
          <span className="text-xs font-semibold text-slate-500">Page {page + 1} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
          <button type="button" onClick={() => setPage((current) => current + 1)} disabled={loading || (page + 1) * PAGE_SIZE >= total} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next<ArrowRight size={16} /></button>
        </div>
      </div>
    </section>
  );
}

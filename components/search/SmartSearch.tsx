"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Camera, Search } from "lucide-react";
import SafeImage from "@/components/ui/SafeImage";
import { useTr } from "@/lib/shop/tr";
import { npr } from "@/lib/shop/types";
import type { SearchHit } from "@/src/lib/search/engine";

type Props = {
  variant?: "header" | "hero" | "page";
  className?: string;
  initialQuery?: string;
  initialResults?: SearchHit[];
};

async function toJpeg(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("blob"))), "image/jpeg", 0.82));
}

export default function SmartSearch({ variant = "header", className = "", initialQuery = "", initialResults = [] }: Props) {
  const tr = useTr();
  const inline = variant === "page";
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<SearchHit[]>(initialResults);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ctrl = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function run(v: string) {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(v)}`, { signal: c.signal });
      const d = (await r.json()) as { results?: SearchHit[] };
      setResults(d.results ?? []);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setResults([]);
    } finally {
      if (ctrl.current === c) setLoading(false);
    }
  }

  function onChange(v: string) {
    setQ(v);
    setNote("");
    setGuesses([]);
    setOpen(true);
    clearTimeout(timer.current);
    if (v.trim().length < 2) {
      ctrl.current?.abort();
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(() => run(v), 250);
  }

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setLoading(true);
    setNote("");
    setGuesses([]);
    setOpen(true);
    try {
      const body = new FormData();
      body.append("file", await toJpeg(f), "photo.jpg");
      const r = await fetch("/api/search/image", { method: "POST", body });
      const d = (await r.json()) as { error?: string; names?: string[]; results?: SearchHit[] };
      if (!r.ok) {
        setResults([]);
        setNote(
          d.error === "ai_disabled"
            ? tr("Photo search is not switched on yet. Type the name, brand or local name instead.", "फोटो खोज अहिले सक्रिय छैन। नाम, ब्रान्ड वा स्थानीय नाम टाइप गर्नुहोस्।")
            : d.error === "rate_limited"
              ? tr("Too many photo searches. Please wait a minute.", "धेरै फोटो खोज भयो। एक मिनेट पर्खनुहोस्।")
              : tr("We could not read that photo. Try a clearer one.", "फोटो पढ्न सकिएन। अझ स्पष्ट फोटो प्रयोग गर्नुहोस्।"),
        );
        return;
      }
      const found = d.results ?? [];
      setResults(found);
      setGuesses(d.names ?? []);
      setQ((d.names ?? [])[0] ?? "");
      if (!found.length) {
        setNote(tr("No match in our catalogue. Send the photo on WhatsApp and we will identify and source it.", "हाम्रो सूचीमा मिलेन। फोटो WhatsApp मा पठाउनुहोस्, हामी पहिचान गरी खोजिदिन्छौं।"));
      }
    } catch {
      setNote(tr("Photo search failed. Please try again.", "फोटो खोज असफल भयो। फेरि प्रयास गर्नुहोस्।"));
    } finally {
      setLoading(false);
    }
  }

  const formClass =
    variant === "header"
      ? "flex overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] focus-within:border-[var(--brand-accent)]"
      : "flex overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200";
  const inputPad = variant === "header" ? "px-4 py-2.5 text-sm" : "px-5 py-4 text-base";
  const hasQuery = q.trim().length >= 2 || guesses.length > 0;
  const showPanel = (inline || open) && (loading || !!note || results.length > 0 || hasQuery);
  const priceOf = (h: SearchHit) => (h.price !== null ? npr(h.price) : tr("Price on request", "मूल्य सोध्नुहोस्"));

  return (
    <div ref={box} className={`relative ${className}`}>
      <form action={inline ? "/search" : "/products"} method="get" role="search" className={formClass}>
        <label htmlFor={`sq-${variant}`} className="sr-only">{tr("Search products", "उत्पादन खोज्नुहोस्")}</label>
        <input
          id={`sq-${variant}`}
          name="q"
          type="search"
          autoComplete="off"
          maxLength={80}
          value={q}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={tr("Name, brand or local name (e.g. makai, पाना, Deli)…", "नाम, ब्रान्ड वा स्थानीय नाम (जस्तै मकै, पाना, Deli)…")}
          className={`min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-400 ${inputPad}`}
        />
        <input ref={fileInput} type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" aria-hidden="true" tabIndex={-1} />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          aria-label={tr("Search by photo", "फोटोबाट खोज्नुहोस्")}
          title={tr("Search by photo", "फोटोबाट खोज्नुहोस्")}
          className="flex items-center px-3 text-slate-500 transition-colors hover:text-[var(--brand-accent)]"
        >
          <Camera size={20} aria-hidden="true" />
        </button>
        <button type="submit" aria-label={tr("Search", "खोज्नुहोस्")} className="flex items-center bg-[var(--brand-primary)] px-5 text-white hover:bg-[var(--brand-secondary)]">
          <Search size={18} aria-hidden="true" />
        </button>
      </form>

      {showPanel && (
        <div
          className={
            inline
              ? "mt-6 text-slate-900"
              : "absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-auto rounded-xl border border-[var(--border)] bg-white p-2 text-slate-900 shadow-2xl"
          }
          aria-live="polite"
        >
          {guesses.length > 0 && (
            <p className="px-2 py-1.5 text-xs font-semibold text-slate-500">
              {tr("Looks like:", "यस्तो देखिन्छ:")} {guesses.slice(0, 3).join(", ")}
            </p>
          )}
          {loading && <p className="px-3 py-3 text-sm text-slate-500">{tr("Searching…", "खोज्दै…")}</p>}
          {note && !loading && <p className="px-3 py-3 text-sm text-slate-700">{note}</p>}

          {results.length > 0 && (
            <ul className={inline ? "grid grid-cols-2 gap-4 lg:grid-cols-4" : "divide-y divide-slate-100"}>
              {results.map((h) =>
                inline ? (
                  <li key={h.id}>
                    <Link href={`/products/${h.slug}`} data-tilt="" className="group block overflow-hidden rounded-xl border border-[var(--border)] bg-white transition hover:shadow-xl">
                      <SafeImage src={h.image} alt={h.name} className="aspect-[4/3] w-full" />
                      <div className="p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{h.brand}</p>
                        <h3 className="mt-1 line-clamp-2 font-bold">{h.name}</h3>
                        <p className="mt-2 text-sm font-bold text-[var(--brand-primary)]">{priceOf(h)}</p>
                      </div>
                    </Link>
                  </li>
                ) : (
                  <li key={h.id}>
                    <Link href={`/products/${h.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg p-2 hover:bg-[var(--surface)]">
                      <SafeImage src={h.image} alt="" className="h-12 w-12 shrink-0 rounded-md" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{h.name}</span>
                        <span className="block truncate text-xs text-slate-500">{h.brand} · {h.category}</span>
                      </span>
                      <span className="shrink-0 text-xs font-bold text-[var(--brand-primary)]">{priceOf(h)}</span>
                    </Link>
                  </li>
                ),
              )}
            </ul>
          )}

          {!loading && !note && results.length === 0 && hasQuery && (
            <p className="px-3 py-3 text-sm text-slate-600">{tr("No match yet. We can source it for you.", "अहिले मिलेन। हामी खोजिदिन सक्छौं।")}</p>
          )}

          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-2 pt-2 text-xs font-bold">
            <Link href={`/products?q=${encodeURIComponent(q)}`} onClick={() => setOpen(false)} className="text-[var(--brand-primary)] hover:text-[var(--brand-accent)]">
              {tr("See all results →", "सबै नतिजा हेर्नुहोस् →")}
            </Link>
            <Link href={`/contact?item=${encodeURIComponent(q || "machinery requirement")}`} onClick={() => setOpen(false)} className="text-[var(--brand-accent)] hover:text-amber-600">
              {tr("Can't find it? Ask us to source it", "भेटिएन? हामीलाई खोजिदिन भन्नुहोस्")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
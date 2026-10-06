"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AddToCart from "@/components/shop/AddToCart";
import Reveal from "@/components/ui/Reveal";
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

type InitialFilters = {
  q?: string;
  category?: string;
  brand?: string;
  saved?: boolean;
};

type Props = {
  products: (ShopProduct | LegacyProduct)[];
  categories?: string[];
  initial?: InitialFilters;
};

const normalize = (p: ShopProduct | LegacyProduct): ShopProduct =>
  "slug" in p
    ? p
    : {
        id: p.id,
        slug: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        image: p.image,
        images: p.image ? [p.image] : [],
        description: p.description,
        specs: [],
        price: null,
        mrp: null,
        availability: "ask",
        stockQty: null,
        featured: p.featured,
      };

export default function ProductsExplorer({
  products: input,
  initial,
}: Props) {
  const products = useMemo(() => input.map(normalize), [input]);
  const { wish } = useShop();

  const [q, setQ] = useState(initial?.q ?? "");
  const [cat, setCat] = useState(initial?.category ?? "All");
  const [brand, setBrand] = useState(initial?.brand ?? "All");
  const [sort, setSort] = useState<"featured" | "name" | "low" | "high">(
    "featured",
  );
  const [stockOnly, setStockOnly] = useState(initial?.saved ?? false);
  const [savedOnly, setSavedOnly] = useState(initial?.saved ?? false);



  const cats = useMemo(() => {
    const values = Array.from(
      new Set(products.map((p) => p.category).filter(Boolean)),
    );

    return ["All", ...values];
  }, [products]);

  const brands = useMemo(() => {
    const values = Array.from(
      new Set(products.map((p) => p.brand).filter(Boolean)),
    );

    return ["All", ...values];
  }, [products]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();

    const out = products.filter((p) => {
      const searchable = [
        p.name,
        p.brand,
        p.category,
        p.model ?? "",
        p.description,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (cat === "All" || p.category === cat) &&
        (brand === "All" || p.brand === brand) &&
        (!stockOnly || p.availability === "in") &&
        (!savedOnly || wish.includes(p.id)) &&
        (!term || searchable.includes(term))
      );
    });

    if (sort === "name") {
      out.sort((a, b) => a.name.localeCompare(b.name));
    }

    if (sort === "low") {
      out.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    }

    if (sort === "high") {
      out.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    }

    if (sort === "featured") {
      out.sort(
        (a, b) => Number(!!b.featured) - Number(!!a.featured),
      );
    }

    return out;
  }, [products, q, cat, brand, sort, stockOnly, savedOnly, wish]);

  const clearFilters = () => {
    setQ("");
    setCat("All");
    setBrand("All");
    setSort("featured");
    setStockOnly(false);
    setSavedOnly(false);
  };

  const selectClass =
    "rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200";

  const chipClass = (active: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-bold transition ${
      active
        ? "border-amber-400 bg-amber-400 text-slate-950 shadow-sm"
        : "border-slate-300 bg-white text-slate-700 hover:border-amber-400 hover:text-slate-950"
    }`;

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">
              B&B Machinery
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Find the right machine
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Search machinery, tools, brands and models.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-slate-100 px-3 py-2 font-bold text-slate-700">
              {list.length} {list.length === 1 ? "product" : "products"}
            </span>

            {(q ||
              cat !== "All" ||
              brand !== "All" ||
              stockOnly ||
              savedOnly) && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full px-3 py-2 font-bold text-amber-700 hover:bg-amber-50"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search machines, brands, models..."
            aria-label="Search products"
            className="w-full rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
          />

          <select
            aria-label="Brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className={selectClass}
          >
            {brands.map((b) => (
              <option key={b} value={b}>
                {b === "All" ? "All brands" : b}
              </option>
            ))}
          </select>

          <select
            aria-label="Sort products"
            value={sort}
            onChange={(e) =>
              setSort(e.target.value as "featured" | "name" | "low" | "high")
            }
            className={selectClass}
          >
            <option value="featured">Featured first</option>
            <option value="name">Name A-Z</option>
            <option value="low">Price: low to high</option>
            <option value="high">Price: high to low</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {cats.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              aria-pressed={cat === c}
              className={chipClass(cat === c)}
            >
              {c}
            </button>
          ))}

          <button
            type="button"
            aria-pressed={stockOnly}
            onClick={() => setStockOnly(!stockOnly)}
            className={chipClass(stockOnly)}
          >
            In stock
          </button>

          <button
            type="button"
            aria-pressed={savedOnly}
            onClick={() => setSavedOnly(!savedOnly)}
            className={chipClass(savedOnly)}
          >
            ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¾ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥ Saved ({wish.length})
          </button>
        </div>
      </section>

      {list.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-2xl">
            ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â½
          </div>

          <h3 className="mt-5 text-xl font-black text-slate-950">
            We could not find that item
          </h3>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            Tell B&B Machinery what machine, tool or spare part you need.
            We can help you find or source it.
          </p>

          <Link
            href={`/contact?item=${encodeURIComponent(q || "machinery requirement")}`}
            className="mt-5 inline-flex rounded-xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-amber-500 hover:text-slate-950"
          >
            Request sourcing help ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((p, i) => {
            const off = discountPct(p);
            const saved = wish.includes(p.id);

            return (
              <Reveal key={p.id} delay={(i % 4) * 0.05}>
                <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-400 hover:shadow-xl">
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    <Link
                      href={`/products/${p.slug}`}
                      aria-label={`View ${p.name}`}
                    >
                      {p.image ? (
                        <SafeImage
                          src={p.image}
                          alt={p.name}
                          contain
                          className="h-full w-full p-5 transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-8 text-center">
                          <span className="text-sm font-bold text-slate-400">
                            B&B Machinery
                          </span>
                        </div>
                      )}
                    </Link>

                    <button
                      type="button"
                      onClick={() => toggleWish(p.id)}
                      aria-pressed={saved}
                      aria-label={
                        saved ? "Remove from saved" : "Save for later"
                      }
                      className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-lg shadow-sm backdrop-blur transition ${
                        saved
                          ? "text-red-600"
                          : "text-slate-400 hover:border-red-200 hover:text-red-500"
                      }`}
                    >
                      {saved ? "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¾ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥" : "ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¾ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡"}
                    </button>

                    <div className="absolute left-3 top-3 flex flex-col gap-1">
                      {p.featured && (
                        <span className="rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-950">
                          Featured
                        </span>
                      )}

                      {off > 0 && (
                        <span className="rounded-full bg-red-600 px-3 py-1 text-[10px] font-black text-white">
                          {off}% OFF
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-600">
                      {p.category}
                    </p>

                    <Link
                      href={`/products/${p.slug}`}
                      className="mt-1 text-xl font-black leading-tight text-slate-950 transition hover:text-amber-600"
                    >
                      {p.name}
                    </Link>

                    {p.model && (
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        Model: {p.model}
                      </p>
                    )}

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                      {p.description}
                    </p>

                    <div className="mt-4">
                      {p.price !== null ? (
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-xl font-black text-slate-950">
                            {npr(p.price)}
                          </span>

                          {p.mrp && p.mrp > p.price && (
                            <span className="text-sm text-slate-400 line-through">
                              {npr(p.mrp)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm font-black text-slate-700">
                          Price on request
                        </span>
                      )}

                      <p
                        className={`mt-1 text-xs font-bold ${
                          p.availability === "in"
                            ? "text-emerald-600"
                            : p.availability === "out"
                              ? "text-red-600"
                              : "text-slate-500"
                        }`}
                      >
                        {p.availability === "in"
                          ? p.stockQty !== null && p.stockQty <= 3
                            ? `Only ${p.stockQty} left`
                            : "In stock"
                          : p.availability === "out"
                            ? "Out of stock"
                            : "Availability on request"}
                      </p>
                    </div>

                    <div className="mt-auto grid gap-2 pt-5">
                      <Link
                        href={`/products/${p.slug}`}
                        className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-amber-500 hover:text-slate-950"
                      >
                        View product details ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¾ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢
                      </Link>

                      <AddToCart product={p} />
                    </div>
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

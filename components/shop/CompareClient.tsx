"use client";

import Link from "next/link";
import AddToCart from "@/components/shop/AddToCart";
import SafeImage from "@/components/ui/SafeImage";
import { toggleCompare, useShop } from "@/lib/shop/store";
import { useTr } from "@/lib/shop/tr";
import { npr, type ShopProduct } from "@/lib/shop/types";

export default function CompareClient({ products }: { products: ShopProduct[] }) {
  const tr = useTr();
  const { compare } = useShop();
  const items = compare.map((id) => products.find((p) => p.id === id)).filter((p): p is ShopProduct => !!p);

  if (items.length === 0)
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center">
        <p className="text-lg font-bold">{tr("Nothing to compare yet", "तुलना गर्न केही छैन")}</p>
        <p className="mt-2 text-slate-600">{tr("Tap “⇄ Compare” on up to 3 products.", "३ वटासम्म उत्पादनमा “⇄ तुलना” थिच्नुहोस्।")}</p>
        <Link href="/products" className="mt-4 inline-block rounded-xl bg-amber-400 px-6 py-3 font-bold">{tr("Browse products", "उत्पादन हेर्नुहोस्")}</Link>
      </div>
    );

  const specNames = Array.from(new Set(items.flatMap((p) => p.specs.map((s) => s.name))));
  const avail = (p: ShopProduct) => (p.availability === "in" ? tr("In stock", "स्टकमा छ") : p.availability === "out" ? tr("Out of stock", "स्टकमा छैन") : tr("Ask us", "सोध्नुहोस्"));
  const rows: [string, (p: ShopProduct) => string][] = [
    [tr("Brand", "ब्रान्ड"), (p) => p.brand],
    [tr("Category", "वर्ग"), (p) => p.category],
    [tr("Model", "मोडल"), (p) => p.model ?? "—"],
    [tr("Price", "मूल्य"), (p) => (p.price === null ? tr("On request", "सोधपुछमा") : npr(p.price))],
    [tr("Availability", "उपलब्धता"), avail],
    ...specNames.map((n): [string, (p: ShopProduct) => string] => [n, (p) => p.specs.find((s) => s.name === n)?.value ?? "—"]),
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="align-top">
            <th className="w-40 p-4" />
            {items.map((p) => (
              <th key={p.id} className="p-4">
                <SafeImage src={p.image} alt={p.name} contain className="mb-3 aspect-square w-full max-w-[180px] rounded-xl bg-slate-100 p-2" />
                <Link href={`/products/${p.slug}`} className="text-base font-extrabold hover:text-amber-600">{p.name}</Link>
                <button type="button" onClick={() => toggleCompare(p.id)} className="mt-1 block text-xs font-bold text-red-600">{tr("Remove", "हटाउनुहोस्")}</button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(([label, get]) => (
            <tr key={label}><th scope="row" className="bg-slate-50 p-4 font-bold text-slate-600">{label}</th>{items.map((p) => <td key={p.id} className="p-4">{get(p)}</td>)}</tr>
          ))}
          <tr><th className="bg-slate-50 p-4" />{items.map((p) => <td key={p.id} className="p-4"><AddToCart product={p} /></td>)}</tr>
        </tbody>
      </table>
    </div>
  );
}

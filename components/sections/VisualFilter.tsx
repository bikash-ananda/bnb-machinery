import Link from "next/link";
import L from "@/components/i18n/L";
import SafeImage from "@/components/ui/SafeImage";
import type { ShopProduct } from "@/lib/shop/types";
import { productKind, type Kind } from "@/src/lib/search/engine";

const KINDS: { id: Kind; en: string; ne: string }[] = [
  { id: "machines", en: "Machines", ne: "मेसिनहरू" },
  { id: "tools", en: "Tools", ne: "औजारहरू" },
  { id: "parts", en: "Spare parts", ne: "स्पेयर पार्टस्" },
];

export default function VisualFilter({ products, kind, category }: { products: ShopProduct[]; kind?: Kind; category?: string }) {
  const scoped = kind ? products.filter((p) => productKind(p.category) === kind) : products;
  const cats = new Map<string, { n: number; image: string }>();
  for (const p of scoped) {
    const c = cats.get(p.category) ?? { n: 0, image: "" };
    cats.set(p.category, { n: c.n + 1, image: c.image || p.image });
  }
  const tab = (active: boolean) =>
    `rounded-full border px-5 py-2.5 text-sm font-bold transition ${active ? "border-amber-400 bg-amber-400 text-slate-950" : "border-slate-300 bg-white text-slate-700 hover:border-amber-400"}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Link href="/products" className={tab(!kind)} aria-current={!kind ? "page" : undefined}><L en="All" ne="सबै" /></Link>
        {KINDS.map((k) => (
          <Link key={k.id} href={`/products?kind=${k.id}`} className={tab(kind === k.id)} aria-current={kind === k.id ? "page" : undefined}>
            <L en={k.en} ne={k.ne} />
          </Link>
        ))}
      </div>
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {[...cats.entries()].map(([name, c]) => (
          <Link
            key={name}
            href={`/products?${kind ? `kind=${kind}&` : ""}category=${encodeURIComponent(name)}`}
            data-tilt=""
            aria-current={category === name ? "page" : undefined}
            className={`group w-40 shrink-0 overflow-hidden rounded-2xl border bg-white transition hover:shadow-xl ${category === name ? "border-amber-400 ring-2 ring-amber-200" : "border-slate-200"}`}
          >
            <SafeImage src={c.image} alt={name} className="aspect-[4/3] w-full" />
            <div className="p-3">
              <p className="line-clamp-1 text-sm font-extrabold text-slate-950">{name}</p>
              <p className="text-xs text-slate-500">{c.n} <L en="items" ne="वस्तु" /></p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
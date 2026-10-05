import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/sections/PageHero";
import Tx from "@/components/shop/Tx";
import { getShopProducts } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Brands & categories" };
export const revalidate = 60;

function count(values: string[]) {
  const m = new Map<string, number>();
  values.forEach((v) => m.set(v, (m.get(v) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export default async function BrandsPage() {
  const products = await getShopProducts();
  const brands = count(products.map((p) => p.brand));
  const categories = count(products.map((p) => p.category));
  const card = "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-amber-400 hover:shadow-lg";
  return (
    <main>
      <PageHero page="brands" variant="workshop" eyebrow="Brands & categories" title="Shop by brand." />
      <section className="bg-[var(--surface)] px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-14">
          <div>
            <h2 className="text-2xl font-black"><Tx en="Brands" ne="ब्रान्डहरू" /></h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {brands.map(([b, n]) => (
                <Link key={b} href={`/products?brand=${encodeURIComponent(b)}`} className={card}>
                  <p className="text-lg font-extrabold">{b}</p><p className="mt-1 text-sm text-slate-600">{n} <Tx en="product(s)" ne="उत्पादन" /></p>
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black"><Tx en="Categories" ne="वर्गहरू" /></h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map(([c, n]) => (
                <Link key={c} href={`/products?category=${encodeURIComponent(c)}`} className={card}>
                  <p className="text-lg font-extrabold">{c}</p><p className="mt-1 text-sm text-slate-600">{n} <Tx en="product(s)" ne="उत्पादन" /></p>
                </Link>
              ))}
            </div>
          </div>
          <p className="text-slate-600"><Tx en="Looking for a specific brand? " ne="कुनै खास ब्रान्ड चाहिएको छ? " /><Link href="/contact" className="font-bold text-amber-600"><Tx en="Ask us to source it →" ne="हामीलाई खोजिदिन भन्नुहोस् →" /></Link></p>
        </div>
      </section>
    </main>
  );
}

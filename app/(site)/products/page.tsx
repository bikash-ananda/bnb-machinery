import type { Metadata } from "next";
import PageHero from "@/components/sections/PageHero";
import ProductsExplorer from "@/components/sections/ProductsExplorer";
import VisualFilter from "@/components/sections/VisualFilter";
import Tx from "@/components/shop/Tx";
import { getShopProducts } from "@/lib/server/catalog";
import { productKind, type Kind } from "@/src/lib/search/engine";

export const metadata: Metadata = { title: "Shop" };
export const revalidate = 60;

type SP = { q?: string; category?: string; brand?: string; kind?: string };
const KINDS: Kind[] = ["machines", "tools", "parts"];

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const all = await getShopProducts();
  const kind = KINDS.find((k) => k === sp.kind);
  const products = kind ? all.filter((p) => productKind(p.category) === kind) : all;
  const initial = { q: sp.q?.slice(0, 80), category: sp.category?.slice(0, 80), brand: sp.brand?.slice(0, 80) };
  return (
    <main>
      <PageHero page="products" variant="farm" eyebrow="Shop" title="Machinery. Tools. Parts." text="Add items to your cart or quote list. Our team confirms price and delivery." />
      <section className="bg-[var(--surface)] px-6 py-14 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <VisualFilter products={all} kind={kind} category={initial.category} />
          <p className="text-sm text-slate-600"><Tx en="Tap ♡ to save, ⇄ to compare up to 3 machines." ne="♡ थिचेर सुरक्षित गर्नुहोस्, ⇄ थिचेर ३ वटासम्म मेसिन तुलना गर्नुहोस्।" /></p>
          <ProductsExplorer key={JSON.stringify({ initial, kind })} products={products} initial={initial} />
        </div>
      </section>
    </main>
  );
}
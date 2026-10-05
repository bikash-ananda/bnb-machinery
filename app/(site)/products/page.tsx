import type { Metadata } from "next";
import PageHero from "@/components/sections/PageHero";
import ProductsExplorer from "@/components/sections/ProductsExplorer";
import Tx from "@/components/shop/Tx";
import { getShopProducts } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Shop" };
export const revalidate = 60;

type SP = { q?: string; category?: string; brand?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const products = await getShopProducts();
  const initial = { q: sp.q?.slice(0, 80), category: sp.category?.slice(0, 80), brand: sp.brand?.slice(0, 80) };
  return (
    <main>
      <PageHero page="products" variant="farm" eyebrow="Shop" title="Machinery. Tools. Parts." text="Add items to your cart or quote list. Our team confirms price and delivery." />
      <section className="bg-[var(--surface)] px-6 py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="mb-6 text-sm text-slate-600"><Tx en="Tap ♡ to save, ⇄ to compare up to 3 machines." ne="♡ थिचेर सुरक्षित गर्नुहोस्, ⇄ थिचेर ३ वटासम्म मेसिन तुलना गर्नुहोस्।" /></p>
          <ProductsExplorer key={JSON.stringify(initial)} products={products} initial={initial} />
        </div>
      </section>
    </main>
  );
}

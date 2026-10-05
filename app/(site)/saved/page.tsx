import type { Metadata } from "next";
import PageHero from "@/components/sections/PageHero";
import ProductsExplorer from "@/components/sections/ProductsExplorer";
import { getShopProducts } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Saved items", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const products = await getShopProducts();
  return (
    <main>
      <PageHero page="gallery" variant="tools" eyebrow="Saved" title="Your saved items." text="Products you tapped ♡ on, kept on this device." />
      <section className="bg-[var(--surface)] px-6 py-14 lg:px-8">
        <div className="mx-auto max-w-7xl"><ProductsExplorer products={products} initial={{ saved: true }} /></div>
      </section>
    </main>
  );
}

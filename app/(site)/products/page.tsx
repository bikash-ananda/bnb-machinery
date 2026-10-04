import type { Metadata } from "next";
import PageHero from "@/components/sections/PageHero";
import ProductsExplorer from "@/components/sections/ProductsExplorer";
import { getShopProducts } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Shop" };
export const revalidate = 60;

export default async function ProductsPage() {
  const products = await getShopProducts();
  return (
    <main>
      <PageHero page="products" variant="farm" eyebrow="Shop" title="Machinery. Tools. Parts." text="Add items to your cart or quote list. Our team confirms price and delivery." />
      <section className="bg-[var(--surface)] px-6 py-14 lg:px-8">
        <div className="mx-auto max-w-7xl"><ProductsExplorer products={products} /></div>
      </section>
    </main>
  );
}

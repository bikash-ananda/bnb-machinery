import type { Metadata } from "next";
import PageHero from "@/components/sections/PageHero";
import CompareClient from "@/components/shop/CompareClient";
import { getShopProducts } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Compare machines", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const products = await getShopProducts();
  return (
    <main>
      <PageHero page="services" variant="workshop" eyebrow="Compare" title="Side by side." text="Compare up to 3 machines on price, specs and availability." />
      <section className="bg-[var(--surface)] px-4 py-12 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><CompareClient products={products} /></div></section>
    </main>
  );
}

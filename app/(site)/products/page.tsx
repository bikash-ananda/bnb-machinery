import type { Metadata } from "next";
import ProductsExplorer from "@/components/sections/ProductsExplorer";
import { pageSocialMetadata } from "@/lib/seo/metadata";
import { getShopProducts } from "@/lib/server/catalog";
import { productKind, type Kind } from "@/src/lib/search/engine";

export const metadata: Metadata = {
  title: "Shop Machinery & Tools in Nepal",
  description:
    "Browse machinery, agricultural equipment, power tools and spare parts from Machinery Tools Nepal in Pokhara. Check product details and contact us for price and availability.",
  alternates: { canonical: "/products" },
  ...pageSocialMetadata(
    "Shop Machinery & Tools in Nepal | Machinery Tools Nepal",
    "Browse machinery, agricultural equipment, power tools and spare parts from Machinery Tools Nepal in Pokhara.",
    "/products",
  ),
};
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
    <main className="bg-[var(--surface)] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <ProductsExplorer key={JSON.stringify({ initial, kind })} products={products} initial={initial} />
      </div>
    </main>
  );
}

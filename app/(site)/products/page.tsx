import type { Metadata } from "next";
import PageHero from "@/components/sections/PageHero";
import ProductsExplorer from "@/components/sections/ProductsExplorer";
import { products as staticProducts, productCategories, type Product } from "@/data/products";
import { getPublishedProducts } from "@/lib/server/inventory";

export const metadata: Metadata = { title: "Products" };
export const revalidate = 60;

async function liveProducts(): Promise<Product[]> {
  try {
    const rows = await getPublishedProducts();
    return rows.map((r) => ({
      id: r.slug,
      name: r.name_en || r.name || "Product",
      category: r.category_name_en || "Machinery",
      brand: r.brand_name || "B&B Machinery",
      image: r.images?.[0] ? `/api/inventory/images/${r.images[0].id}` : "",
      description: r.description_en || "",
      href: `/products/${r.slug}`,
    }));
  } catch {
    return []; // backend not configured or down: fall back to static catalog
  }
}

export default async function ProductsPage() {
  const live = await liveProducts();
  const all = [...live, ...staticProducts.filter((s) => !live.some((l) => l.id === s.id))];
  const cats = Array.from(new Set([...productCategories, ...all.map((p) => p.category)]));
  return (
    <main>
      <PageHero page="products" variant="farm" eyebrow="Our products" title="Machinery. Tools. Parts." text="Search our catalogue or tell us what you need — we can source it." />
      <section className="bg-[var(--surface)] px-6 py-14 lg:px-8">
        <div className="mx-auto max-w-7xl"><ProductsExplorer products={all} categories={cats} /></div>
      </section>
    </main>
  );
}

import Link from "next/link";
import Image from "next/image";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { LocalizedField } from "@/components/i18n/LocalizedField";
import { LocalizedText } from "@/components/i18n/LanguageProvider";
import { getPublishedProducts } from "@/lib/server/inventory";
import type { ProductRecord } from "@/lib/inventory/types";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  let products: ProductRecord[] = [];
  let loadError = false;
  try {
    products = await getPublishedProducts();
  } catch {
    loadError = true;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--surface)]">
        <section className="border-b border-[var(--border)] bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--brand-accent)]">
              <LocalizedText id="catalogEyebrow" />
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--brand-primary)]">
              <LocalizedText id="catalogTitle" />
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--text-muted)]">
              <LocalizedText id="catalogDescription" />
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {loadError ? (
            <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950">
              <LocalizedText id="catalogLoadError" />
            </p>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center">
              <div className="mx-auto max-w-xl">
                <h2 className="text-2xl font-bold text-[var(--brand-primary)]">
                  <LocalizedText id="catalogEmptyTitle" />
                </h2>
                <p className="mt-4 leading-7 text-[var(--text-muted)]">
                  <LocalizedText id="catalogEmptyDescription" />
                </p>
                <Link
                  href="/contact"
                  className="mt-7 inline-flex min-h-12 items-center rounded-lg bg-[var(--brand-primary)] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-secondary)]"
                >
                  <LocalizedText id="requestProductInfo" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-xl border border-[var(--border)] bg-white"
                >
                  <div className="aspect-[4/3] bg-[var(--surface-muted)]">
                    {product.images?.[0] ? (
                      <Image
                        src={"/api/inventory/images/" + encodeURIComponent(product.images[0].id)}
                        alt={product.name_en || product.name_ne || "Machinery product"}
                        width={800}
                        height={600}
                        unoptimized
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-5">
                    {product.brand_name ? (
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                        {product.brand_name}
                      </p>
                    ) : null}
                    <h2 className="mt-2 text-lg font-semibold text-[var(--brand-primary)]">
                      <LocalizedField en={product.name_en} ne={product.name_ne} />
                    </h2>
                    {product.model ? (
                      <p className="mt-2 text-sm text-[var(--text-muted)]">
                        <LocalizedText id="model" />: {product.model}
                      </p>
                    ) : null}
                    <Link
                      href={"/products/" + product.slug}
                      className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-accent)]"
                    >
                      <LocalizedText id="viewDetails" /> <span aria-hidden="true" className="ml-1">→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

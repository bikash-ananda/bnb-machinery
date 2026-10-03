import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { LocalizedField } from "@/components/i18n/LocalizedField";
import { LocalizedText } from "@/components/i18n/LanguageProvider";
import { getPublishedProduct } from "@/lib/server/inventory";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getPublishedProduct(slug);
  if (!product) notFound();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--surface)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link href="/products" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--brand-primary)]">
            ← <span className="ml-2"><LocalizedText id="products" /></span>
          </Link>

          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <section aria-label="Product images" className="space-y-4">
              {product.images?.map((image, index) => (
                <div key={image.id} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
                  <Image
                    src={"/api/inventory/images/" + encodeURIComponent(image.id)}
                    alt={(product.name_en || product.name_ne || "Machinery product") + " " + (index + 1)}
                    width={1200}
                    height={900}
                    unoptimized
                    className="aspect-[4/3] w-full object-contain"
                  />
                </div>
              ))}
            </section>

            <article className="rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-8">
              {product.brand_name ? (
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  {product.brand_name}
                </p>
              ) : null}
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--brand-primary)] sm:text-4xl">
                <LocalizedField en={product.name_en} ne={product.name_ne} />
              </h1>

              <div className="mt-6 space-y-4">
                {product.description_en || product.description_ne ? (
                  <section>
                    <h2 className="font-semibold text-[var(--brand-primary)]">
                      <LocalizedText id="description" />
                    </h2>
                    <p className="mt-2 whitespace-pre-line leading-7 text-[var(--text-muted)]">
                      <LocalizedField en={product.description_en} ne={product.description_ne} />
                    </p>
                  </section>
                ) : null}

                <dl className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                  {product.category_name_en ? (
                    <div className="flex justify-between gap-4 py-3 text-sm">
                      <dt className="text-[var(--text-muted)]"><LocalizedText id="category" /></dt>
                      <dd className="text-right font-medium text-[var(--brand-primary)]">{product.category_name_en}</dd>
                    </div>
                  ) : null}
                  {product.model ? (
                    <div className="flex justify-between gap-4 py-3 text-sm">
                      <dt className="text-[var(--text-muted)]"><LocalizedText id="model" /></dt>
                      <dd className="text-right font-medium text-[var(--brand-primary)]">{product.model}</dd>
                    </div>
                  ) : null}
                  {product.part_number ? (
                    <div className="flex justify-between gap-4 py-3 text-sm">
                      <dt className="text-[var(--text-muted)]"><LocalizedText id="partNumber" /></dt>
                      <dd className="text-right font-medium text-[var(--brand-primary)]">{product.part_number}</dd>
                    </div>
                  ) : null}
                  {product.stock_quantity !== null ? (
                    <div className="flex justify-between gap-4 py-3 text-sm">
                      <dt className="text-[var(--text-muted)]"><LocalizedText id="stockQuantity" /></dt>
                      <dd className="text-right font-medium text-[var(--brand-primary)]">{product.stock_quantity}</dd>
                    </div>
                  ) : null}
                </dl>

                {product.specifications.length > 0 ? (
                  <section>
                    <h2 className="font-semibold text-[var(--brand-primary)]"><LocalizedText id="specifications" /></h2>
                    <dl className="mt-2 divide-y divide-[var(--border)]">
                      {product.specifications.map((spec, index) => (
                        <div key={spec.name + index} className="flex justify-between gap-4 py-2 text-sm">
                          <dt className="text-[var(--text-muted)]">{spec.name}</dt>
                          <dd className="text-right font-medium text-[var(--brand-primary)]">{spec.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ) : null}
              </div>

              <Link
                href="/contact"
                className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[var(--brand-primary)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--brand-secondary)]"
              >
                <LocalizedText id="requestProductInfo" />
              </Link>
            </article>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

import Image from "next/image";
import Link from "next/link";
import { products, productCategories } from "@/data/products";

export default function ProductsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(245,158,11,0.15),transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-amber-400">
            B & B Machinery
          </p>

          <h1 className="mt-5 max-w-4xl text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
            Machinery.
            <br />
            <span className="text-amber-400">Tools.</span>
            <br />
            Parts.
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
            Explore machinery, power tools, workshop equipment and mechanical
            spare parts available from B & B Machinery, Pokhara.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            {productCategories.map((category) => (
              <span
                key={category}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-slate-300"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
              Our Products
            </p>

            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Equipment for real work
            </h2>
          </div>

          <Link
            href="/contact"
            className="hidden rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 sm:block"
          >
            Request a Quote
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <article
              key={product.id}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition duration-500 hover:-translate-y-2 hover:border-amber-400/40 hover:bg-white/[0.07]"
            >
              <div className="relative aspect-square overflow-hidden bg-white">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-contain p-6 transition duration-500 group-hover:scale-110"
                  unoptimized
                />

                {product.featured && (
                  <span className="absolute left-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-950">
                    Featured
                  </span>
                )}
              </div>

              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  {product.category}
                </p>

                <h3 className="mt-2 text-lg font-bold">
                  {product.name}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {product.description}
                </p>

                <Link
                  href="/contact"
                  className="mt-5 inline-flex text-sm font-bold text-white transition hover:text-amber-400"
                >
                  Enquire →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-white/10 bg-amber-400 text-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-16 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <h2 className="text-3xl font-black">
              Looking for a specific machine or part?
            </h2>

            <p className="mt-2 max-w-xl text-slate-800">
              Contact B & B Machinery and tell us what you need.
            </p>
          </div>

          <Link
            href="/contact"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-950 px-7 py-4 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Contact B & B Machinery →
          </Link>
        </div>
      </section>
    </main>
  );
}
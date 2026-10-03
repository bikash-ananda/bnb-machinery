import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/sections/PageHero";
import { brands } from "@/data/brands";

export const metadata: Metadata = { title: "Brands" };

export default function BrandsPage() {
  return (
    <main>
      <PageHero page="brands" variant="workshop" eyebrow="Our brands" title="Brands we work with" />
      <section className="bg-[var(--surface)] px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {brands.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="font-bold">Brand list coming soon.</p>
              <p className="mt-2 text-slate-600">Looking for a specific brand? Ask us — we can source it.</p>
              <Link href="/contact" className="mt-4 inline-block rounded-xl bg-amber-400 px-6 py-3 font-bold">Ask about a brand →</Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {brands.map((b) => <div key={b.id} className="rounded-2xl border bg-white p-6"><h2 className="font-extrabold">{b.name}</h2><p className="mt-2 text-sm text-slate-600">{b.description}</p></div>)}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

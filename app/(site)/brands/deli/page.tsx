import type { Metadata } from "next";
import Link from "next/link";
import L from "@/components/i18n/L";
import Reveal from "@/components/ui/Reveal";
import SafeImage from "@/components/ui/SafeImage";
import { distribution } from "@/config/brand";
import { getShopProducts } from "@/lib/server/catalog";
import { npr } from "@/lib/shop/types";

export const metadata: Metadata = {
  title: "Deli — Main Distributor for Gandaki & Dhaulagiri",
  description: "Machinery Tools Nepal is the main distributor of Deli for Gandaki and Dhaulagiri. Browse Deli products or request a quotation.",
};
export const revalidate = 60;

export default async function DeliPage() {
  const all = await getShopProducts();
  const deli = all.filter((p) => p.brand.toLowerCase().includes(distribution.brand.toLowerCase()));

  return (
    <main>
      <section className="relative overflow-hidden bg-[#07111f] px-6 py-20 text-white lg:px-8 lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(245,158,11,0.2),transparent_45%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-extrabold uppercase tracking-[0.25em] text-amber-400">
            <L en={distribution.regionsEn.join(" & ")} ne={distribution.regionsNe.join(" र ")} />
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">
            <L en={distribution.roleEn} ne={distribution.roleNe} />
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            <L en="Ask us for Deli products, availability and dealer or bulk pricing. Our team replies the same day." ne="डेली उत्पादन, उपलब्धता र डिलर वा थोक मूल्यका लागि हामीलाई सोध्नुहोस्। हाम्रो टोलीले सोही दिन जवाफ दिन्छ।" />
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/products?brand=${encodeURIComponent(distribution.brand)}`} className="rounded-lg bg-[var(--brand-accent)] px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-amber-400">
              <L en="Shop Deli" ne="डेली किनमेल" />
            </Link>
            <Link href="/contact" className="rounded-lg border border-white/30 px-6 py-3.5 text-sm font-bold hover:bg-white/10">
              <L en="Dealer / bulk quote" ne="डिलर / थोक मूल्य" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[var(--surface)] px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-2xl font-black text-slate-950 sm:text-3xl"><L en="Deli products" ne="डेली उत्पादनहरू" /></h2>
          {deli.length === 0 ? (
            <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
              <L en="Deli products are being added. Contact us for the current range." ne="डेली उत्पादनहरू थप्दै छौं। हालको सूचीका लागि सम्पर्क गर्नुहोस्।" />
            </p>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {deli.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 0.05}>
                  <Link href={`/products/${p.slug}`} data-tilt="" className="group block overflow-hidden rounded-xl border border-[var(--border)] bg-white transition hover:-translate-y-1 hover:shadow-xl">
                    <SafeImage src={p.image} alt={p.name} className="aspect-[4/3] w-full" />
                    <div className="p-4">
                      <h3 className="line-clamp-2 font-bold text-slate-950">{p.name}</h3>
                      <p className="mt-2 text-sm font-bold text-[var(--brand-primary)]">
                        {p.price !== null ? npr(p.price) : <L en="Price on request" ne="मूल्य सोध्नुहोस्" />}
                      </p>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
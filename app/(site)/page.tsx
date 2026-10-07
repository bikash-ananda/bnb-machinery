import type { Metadata } from "next";
import Link from "next/link";
import HeroBackdrop from "@/components/ui/HeroBackdrop";
import { heroSlides } from "@/data/heroImages";
import SmartSearch from "@/components/search/SmartSearch";
import L from "@/components/i18n/L";
import Reveal from "@/components/ui/Reveal";
import SafeImage from "@/components/ui/SafeImage";
import { company } from "@/config/site";
import { distribution } from "@/config/brand";
import { getShopProducts } from "@/lib/server/catalog";
import { npr } from "@/lib/shop/types";

export const metadata: Metadata = {
  title: "Machinery, Tools & Spare Parts in Pokhara",
  description:
    "Machinery Tools Nepal: machinery, tools and spare parts in Pokhara and Western Nepal. Main distributor of Deli for Gandaki and Dhaulagiri.",
};
export const revalidate = 60;

export default async function HomePage() {
  const all = await getShopProducts();
  const featured = (all.filter((p) => p.featured).length ? all.filter((p) => p.featured) : all).slice(0, 8);
  const categories = Array.from(new Set(all.map((p) => p.category))).slice(0, 8);
  return (
    <main>
      {/* HERO */}
      <section className="hero-adaptive relative overflow-hidden bg-[#07111f] text-[color:var(--hero-fg,#fff)]">
        <HeroBackdrop slides={heroSlides("home")} />
        <div className="relative mx-auto max-w-7xl px-6 pb-28 pt-16 lg:px-8 lg:pb-36 lg:pt-24">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--hero-accent,#fcd34d)]">
            <L en={`${distribution.roleEn} · ${distribution.regionsEn.join(" & ")}`} ne={`${distribution.roleNe} · ${distribution.regionsNe.join(" र ")}`} />
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            <L en="Machinery, tools and spare parts you can rely on." ne="भरपर्दो मेसिनरी, औजार र स्पेयर पार्टस्।" />
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[color:var(--hero-muted,#cbd5e1)]">
            <L en="Shop online or visit our showroom at Baglung Buspark, Pokhara. Retail and wholesale, with service support." ne="अनलाइन किन्नुहोस् वा पोखराको बाग्लुङ बसपार्कस्थित हाम्रो सोरुम भ्रमण गर्नुहोस्। खुद्रा तथा थोक, सेवा सहयोगसहित।" />
          </p>

          {/* Search-first */}<SmartSearch variant="hero" className="mt-8 max-w-2xl" />

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/products" className="rounded-lg bg-[var(--brand-accent)] px-6 py-3.5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400">
              <L en="Shop now" ne="किनमेल गर्नुहोस्" />
            </Link>
            <Link href="/contact" className="rounded-lg border border-current/40 px-6 py-3.5 text-sm font-bold text-[color:var(--hero-fg,#fff)] transition-colors hover:bg-white/10">
              <L en="Request a quote" ne="मूल्य सोध्नुहोस्" />
            </Link>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="relative z-10 -mt-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-xl sm:grid-cols-2 lg:grid-cols-4">
          {[
            { en: "Deli distributor", ne: "डेली वितरक", ten: "Gandaki & Dhaulagiri", tne: "गण्डकी र धौलागिरी" },
            { en: "Retail & wholesale", ne: "खुद्रा र थोक", ten: "Single items to bulk orders", tne: "एकदेखि थोक अर्डरसम्म" },
            { en: "Service & spares", ne: "सेवा र स्पेयर पार्टस्", ten: "Repair and technical support", tne: "मर्मत तथा प्राविधिक सहयोग" },
            { en: "Pokhara showroom", ne: "पोखरा सोरुम", ten: company.location.address, tne: "बाग्लुङ बसपार्क, पोखरा" },
          ].map((it, i) => (
            <Reveal key={it.en} delay={i * 0.06} className="bg-white p-6">
              <h3 className="font-extrabold text-slate-950"><L en={it.en} ne={it.ne} /></h3>
              <p className="mt-1 text-sm text-slate-600"><L en={it.ten} ne={it.tne} /></p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CATEGORIES (from real catalogue only) */}
      {categories.length > 0 && (
        <section className="px-6 py-16 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl"><L en="Shop by category" ne="वर्गअनुसार किनमेल" /></h2>
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              {categories.map((c, i) => (
                <Reveal key={c} delay={i * 0.04}>
                  <Link
                    href={`/products?category=${encodeURIComponent(c)}`}
                    className="flex min-h-24 items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 font-bold text-[var(--brand-primary)] transition hover:-translate-y-0.5 hover:border-[var(--brand-accent)] hover:shadow-lg"
                  >
                    <span>{c}</span>
                    <span aria-hidden="true" className="text-[var(--brand-accent)]">→</span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FEATURED PRODUCTS */}
      <section className="bg-[var(--surface)] px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl"><L en="Featured products" ne="विशेष उत्पादनहरू" /></h2>
            <Link href="/products" className="text-sm font-bold text-[var(--brand-primary)] hover:text-[var(--brand-accent)]"><L en="View all →" ne="सबै हेर्नुहोस् →" /></Link>
          </div>

          {featured.length === 0 ? (
            <p className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
              <L en="Products will appear here soon." ne="उत्पादनहरू छिट्टै यहाँ देखिनेछन्।" />
            </p>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {featured.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 0.05}>
                  <Link
                    href={`/products/${p.slug}`}
                    data-tilt="" className="group block overflow-hidden rounded-xl border border-[var(--border)] bg-white transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <SafeImage src={p.image} alt={p.name} className="aspect-[4/3] w-full" />
                    <div className="p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{p.brand}</p>
                      <h3 className="mt-1 line-clamp-2 font-bold text-slate-950 group-hover:text-[var(--brand-primary)]">{p.name}</h3>
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

      {/* WHOLESALE CTA */}
      <section className="px-6 py-16 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-2xl bg-[var(--brand-primary)] p-8 text-white md:flex-row md:items-center md:p-12">
          <div>
            <h2 className="text-2xl font-black sm:text-3xl"><L en="Buying in bulk or for a business?" ne="थोकमा वा व्यवसायका लागि किन्दै हुनुहुन्छ?" /></h2>
            <p className="mt-2 max-w-xl text-slate-300"><L en="Send us your list. We will reply with a quotation." ne="आफ्नो सूची पठाउनुहोस्। हामी कोटेसनसहित जवाफ दिनेछौं।" /></p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="rounded-lg bg-[var(--brand-accent)] px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-amber-400"><L en="Request a quote" ne="मूल्य सोध्नुहोस्" /></Link>
            <a href={`https://wa.me/977${company.contact.whatsapp}`} className="rounded-lg border border-white/30 px-6 py-3.5 text-sm font-bold hover:bg-white/10">WhatsApp</a>
          </div>
        </div>
      </section>
    </main>
  );
}
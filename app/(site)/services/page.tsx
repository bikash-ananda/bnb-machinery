import type { Metadata } from "next";
import Link from "next/link";
import L from "@/components/i18n/L";
import PageHero from "@/components/sections/PageHero";
import { pageSocialMetadata } from "@/lib/seo/metadata";
import Reveal from "@/components/ui/Reveal";
import { services } from "@/data/services";

export const metadata: Metadata = {
  title: "Machine Repair & Maintenance in Pokhara",
  description:
    "Ask Machinery Tools Nepal about machinery repair, maintenance, installation support and spare parts in Pokhara and nearby districts.",
  alternates: { canonical: "/services" },
  ...pageSocialMetadata(
    "Machine Repair & Maintenance in Pokhara | Machinery Tools Nepal",
    "Machinery repair, maintenance, installation support and spare parts from Machinery Tools Nepal in Pokhara.",
    "/services",
  ),
};

export default function ServicesPage() {
  return (
    <main>
      <PageHero
        page="services"
        variant="workshop"
        eyebrow={{ en: "What we do", ne: "हामी के गर्छौँ" }}
        title={{ en: "Our services", ne: "हाम्रा सेवाहरू" }}
        text={{ en: "From selection to repair — support for your machines.", ne: "छनोटदेखि मर्मतसम्म — तपाईंका मेसिनका लागि सहयोग।" }}
      />
      <section className="bg-[var(--surface)] px-6 py-16 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.id} delay={(i % 3) * 0.07}>
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-amber-400 hover:shadow-lg">
                <h2 className="text-xl font-extrabold"><L en={s.title} ne={s.ne.title} /></h2>
                <p className="mt-2 text-sm leading-6 text-slate-600"><L en={s.description} ne={s.ne.description} /></p>
                <ul className="mt-4 space-y-1 text-sm text-slate-700">
                  {s.features.map((f, n) => <li key={f}>✔ <L en={f} ne={s.ne.features[n]} /></li>)}
                </ul>
                <Link href={`/contact?item=${encodeURIComponent(s.title)}`} className="mt-5 inline-block text-sm font-bold text-amber-600">
                  <L en="Enquire →" ne="सोधपुछ गर्नुहोस् →" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/sections/PageHero";
import Reveal from "@/components/ui/Reveal";
import { services } from "@/data/services";

export const metadata: Metadata = { title: "Services" };

export default function ServicesPage() {
  return (
    <main>
      <PageHero page="services" variant="workshop" eyebrow="What we do" title="Our services" text="From selection to repair — support for your machines." />
      <section className="bg-[var(--surface)] px-6 py-16 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.id} delay={(i % 3) * 0.07}>
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-amber-400 hover:shadow-lg">
                <h2 className="text-xl font-extrabold">{s.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{s.description}</p>
                <ul className="mt-4 space-y-1 text-sm text-slate-700">{s.features.map((f) => <li key={f}>✔ {f}</li>)}</ul>
                <Link href={`/contact?item=${encodeURIComponent(s.title)}`} className="mt-5 inline-block text-sm font-bold text-amber-600">Enquire →</Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import PageHero from "@/components/sections/PageHero";
import SafeImage from "@/components/ui/SafeImage";
import { siteImages } from "@/data/siteImages";
import { company } from "@/data/company";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  const points = ["Agricultural machinery", "Power & mechanical tools", "Spare parts & repair support", "Honest advice for your budget"];
  return (
    <main>
      <PageHero page="about" variant="gears" eyebrow="About us" title="Practical machinery for Western Nepal." />
      <section className="bg-white px-6 py-16 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-lg leading-8 text-slate-700">
              B & B Machinery Suppliers is based at {company.location.address}. We help farmers, workshops and businesses
              find the right machine, tool or spare part — and keep it running.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {points.map((p) => <li key={p} className="rounded-xl border border-slate-200 bg-[var(--surface)] p-4 font-semibold">✔ {p}</li>)}
            </ul>
            <p className="mt-6 text-slate-600"><b>Service areas:</b> {company.serviceAreas.join(" · ")}</p>
          </div>
          <SafeImage src={siteImages.aboutPhoto.src} alt={siteImages.aboutPhoto.alt} className="aspect-[4/3] w-full rounded-3xl shadow-lg" />
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import L from "@/components/i18n/L";
import PageHero from "@/components/sections/PageHero";
import SafeImage from "@/components/ui/SafeImage";
import { siteImages } from "@/data/siteImages";
import { company } from "@/data/company";

export const metadata: Metadata = { title: "About | हाम्रो बारे" };

const points = [
  { en: "Agricultural machinery", ne: "कृषि मेसिनरी" },
  { en: "Power & mechanical tools", ne: "पावर तथा मेकानिकल औजार" },
  { en: "Spare parts & repair support", ne: "स्पेयर पार्ट्स र मर्मत सहयोग" },
  { en: "Honest advice for your budget", ne: "तपाईंको बजेटअनुसार इमानदार सल्लाह" },
];

export default function AboutPage() {
  return (
    <main>
      <PageHero
        page="about"
        variant="gears"
        eyebrow={{ en: "About us", ne: "हाम्रो बारे" }}
        title={{ en: "Practical machinery for Western Nepal.", ne: "पश्चिम नेपालका लागि उपयोगी मेसिनरी।" }}
      />
      <section className="bg-white px-6 py-16 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-lg leading-8 text-slate-700">
              <L
                en={`Machinery Tools Nepal is based at ${company.location.address}. We help farmers, workshops and businesses find the right machine, tool or spare part — and keep it running.`}
                ne="Machinery Tools Nepal बाग्लुङ बसपार्क, पोखरामा अवस्थित छ। हामी किसान, वर्कशप र व्यवसायीलाई सही मेसिन, औजार वा स्पेयर पार्ट छनोट गर्न र त्यसलाई चलिरहन सहयोग गर्छौँ।"
              />
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {points.map((p) => (
                <li key={p.en} className="rounded-xl border border-slate-200 bg-[var(--surface)] p-4 font-semibold">✔ <L en={p.en} ne={p.ne} /></li>
              ))}
            </ul>
            <p className="mt-6 text-slate-600">
              <b><L en="Service areas:" ne="सेवा क्षेत्र:" /></b>{" "}
              <L en={company.serviceAreas.join(" · ")} ne={company.serviceAreasNe.join(" · ")} />
            </p>
          </div>
          <SafeImage src={siteImages.aboutPhoto.src} alt={siteImages.aboutPhoto.alt} className="aspect-[4/3] w-full rounded-3xl shadow-lg" />
        </div>
      </section>
    </main>
  );
}
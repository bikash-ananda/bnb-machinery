import type { Metadata } from "next";
import L from "@/components/i18n/L";
import SmartSearch from "@/components/search/SmartSearch";
import { getShopProducts } from "@/lib/server/catalog";
import { searchProducts } from "@/src/lib/search/engine";

export const metadata: Metadata = { title: "Smart search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").slice(0, 80);
  const initial = q.trim() ? searchProducts(await getShopProducts(), q, 24) : [];
  return (
    <main>
      <section className="bg-[#07111f] px-6 py-16 text-white lg:px-8 lg:py-24">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
            <L en="Don't know the exact name? Just search." ne="ठ्याक्कै नाम थाहा छैन? खोज्नुहोस्।" />
          </h1>
          <p className="mt-4 text-slate-300">
            <L en="Type a name, brand or local name, or tap the camera and take a photo of the machine, tool or part." ne="नाम, ब्रान्ड वा स्थानीय नाम लेख्नुहोस्, वा क्यामेरा थिचेर मेसिन, औजार वा पार्टको फोटो खिच्नुहोस्।" />
          </p>
          <div id="photo" className="mt-8"><SmartSearch variant="page" initialQuery={q} initialResults={initial} /></div>
        </div>
      </section>
    </main>
  );
}
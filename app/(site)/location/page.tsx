import type { Metadata } from "next";
import PageHero from "@/components/sections/PageHero";
import { company } from "@/data/company";

export const metadata: Metadata = { title: "Location" };

export default function LocationPage() {
  const l = company.location;
  const q = encodeURIComponent(`${l.address}, ${l.country}`);
  return (
    <main>
      <PageHero page="location" variant="road" eyebrow="Visit us" title="Find our showroom." text={`${l.address}, ${l.district}, ${l.province}`} />
      <section className="bg-[var(--surface)] px-6 py-16 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[2fr_1fr]">
          <iframe title="Machinery Tools Nepal on Google Maps" src={`https://www.google.com/maps?q=${q}&output=embed`}
            className="h-[420px] w-full rounded-2xl border border-slate-200 shadow-lg" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black">Get directions</h2>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${q}`} target="_blank" rel="noopener noreferrer"
              className="block rounded-xl bg-slate-950 px-5 py-3 text-center font-bold text-white hover:bg-slate-800">Open in Google Maps →</a>
            <a href={`tel:${company.contact.phoneRaw}`} className="block rounded-xl bg-amber-400 px-5 py-3 text-center font-bold text-slate-950 hover:bg-amber-300">☎ Call before you come</a>
            <p className="text-sm text-slate-600"><b>We serve:</b> {company.serviceAreas.join(", ")}</p>
          </div>
        </div>
      </section>
    </main>
  );
}

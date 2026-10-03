import type { Metadata } from "next";
import PageHero from "@/components/sections/PageHero";
import Reveal from "@/components/ui/Reveal";
import SafeImage from "@/components/ui/SafeImage";
import { gallery } from "@/data/gallery";

export const metadata: Metadata = { title: "Gallery" };

export default function GalleryPage() {
  return (
    <main>
      <PageHero page="gallery" variant="tools" eyebrow="Gallery" title="Our shop & equipment." text="Real photos from our Pokhara showroom." />
      <section className="bg-[var(--surface)] px-6 py-16 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((g, i) => (
            <Reveal key={g.src} delay={i * 0.06}>
              <figure className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm">
                <SafeImage src={g.src} alt={g.alt} className="aspect-[4/3] w-full transition duration-700 group-hover:scale-105" />
                <figcaption className="absolute bottom-3 left-3 rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase text-slate-950">{g.tag}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}

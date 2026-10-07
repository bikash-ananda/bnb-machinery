import Link from "next/link";
import MechanicalTools3D from "./MechanicalTools3D";

export default function Hero3D() {
  return (
    <section className="hero-3d relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#07111f] text-white">
      <div className="hero-grid absolute inset-0" />

      <div className="hero-glow hero-glow-one" />
      <div className="hero-glow hero-glow-two" />

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300 backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />

            <span className="lang-en">
              Mechanical Tools & Machinery
            </span>

            <span className="lang-ne">
              मेकानिकल टुल्स तथा मेसिनरी
            </span>
          </div>

          <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
            <span className="lang-en">
              Built for
              <br />
              <span className="text-amber-400">Hard Work.</span>
              <br />
              Ready for
              <br />
              Business.
            </span>

            <span className="lang-ne">
              कठिन कामका लागि
              <br />
              <span className="text-amber-400">
                बलियो उपकरण।
              </span>
              <br />
              व्यवसायका लागि
              <br />
              तयार।
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
            <span className="lang-en">
              Mechanical tools, machinery, spare parts and technical support
              from Machinery Tools Nepal in Pokhara.
            </span>

            <span className="lang-ne">
              पोखरास्थित Machinery Tools Nepal बाट मेकानिकल टुल्स, मेसिनरी,
              स्पेयर पार्ट्स तथा प्राविधिक सहयोग।
            </span>
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/products"
              className="group inline-flex items-center justify-center gap-3 rounded-xl bg-amber-400 px-7 py-4 text-sm font-bold text-slate-950 shadow-[0_0_40px_rgba(245,158,11,0.2)] transition-all duration-300 hover:-translate-y-1 hover:bg-amber-300"
            >
              <span className="lang-en">
                Explore Machinery
              </span>

              <span className="lang-ne">
                मेसिनरी हेर्नुहोस्
              </span>

              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>

            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.05] px-7 py-4 text-sm font-bold text-white backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:bg-white/10"
            >
              <span className="lang-en">
                Request a Quote
              </span>

              <span className="lang-ne">
                मूल्य प्रस्ताव माग्नुहोस्
              </span>
            </Link>
          </div>

          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3 border-t border-white/10 pt-7">
            <div>
              <p className="text-xl font-bold text-white">01</p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                <span className="lang-en">Mechanical Tools</span>
                <span className="lang-ne">मेकानिकल टुल्स</span>
              </p>
            </div>

            <div>
              <p className="text-xl font-bold text-white">02</p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                <span className="lang-en">Machinery</span>
                <span className="lang-ne">मेसिनरी</span>
              </p>
            </div>

            <div>
              <p className="text-xl font-bold text-white">03</p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                <span className="lang-en">Spare Parts</span>
                <span className="lang-ne">स्पेयर पार्ट्स</span>
              </p>
            </div>
          </div>
        </div>

        <div className="relative flex min-h-[520px] items-center justify-center lg:min-h-[650px]">
          <MechanicalTools3D />
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
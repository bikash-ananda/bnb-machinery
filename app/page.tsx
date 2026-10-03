import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { LocalizedText } from "@/components/i18n/LanguageProvider";

export default function Home() {
  return (
    <>
      <Header />

      <main>
        <section className="bg-[var(--surface)]">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--brand-accent)]">
                <LocalizedText id="heroEyebrow" />
              </p>

              <h1 className="text-4xl font-bold tracking-tight text-[var(--brand-primary)] sm:text-5xl lg:text-6xl">
                <LocalizedText id="heroTitle" />
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--text-muted)]">
                <LocalizedText id="heroDescription" />
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-lg bg-[var(--brand-primary)] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-secondary)]"
                >
                  <LocalizedText id="exploreProducts" />
                </Link>

                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-white px-6 py-3.5 text-sm font-semibold text-[var(--brand-primary)] transition-colors hover:bg-[var(--surface-muted)]"
                >
                  <LocalizedText id="requestQuote" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--brand-accent)]">
                <LocalizedText id="whatWeProvide" />
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--brand-primary)]">
                <LocalizedText id="serviceHeadline" />
              </h2>

              <p className="mt-4 leading-7 text-[var(--text-muted)]">
                <LocalizedText id="serviceIntro" />
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-[var(--border)] p-6">
                <h3 className="font-semibold text-[var(--brand-primary)]">
                  <LocalizedText id="machinery" />
                </h3>

                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  <LocalizedText id="machineryCardDescription" />
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] p-6">
                <h3 className="font-semibold text-[var(--brand-primary)]">
                  <LocalizedText id="spareParts" />
                </h3>

                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  <LocalizedText id="partsCardDescription" />
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] p-6">
                <h3 className="font-semibold text-[var(--brand-primary)]">
                  <LocalizedText id="technicalService" />
                </h3>

                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  <LocalizedText id="technicalCardDescription" />
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border)] p-6">
                <h3 className="font-semibold text-[var(--brand-primary)]">
                  <LocalizedText id="customerSupport" />
                </h3>

                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  <LocalizedText id="customerCardDescription" />
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[var(--surface)]">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-6 rounded-2xl bg-[var(--brand-primary)] px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-bold text-white sm:text-3xl">
                  <LocalizedText id="calloutTitle" />
                </h2>

                <p className="mt-3 leading-7 text-slate-300">
                  <LocalizedText id="calloutDescription" />
                </p>
              </div>

              <Link
                href="/contact"
                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--brand-accent)] px-6 py-3.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400"
              >
                <LocalizedText id="contactBusiness" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

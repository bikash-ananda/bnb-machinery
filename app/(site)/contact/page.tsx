import type { Metadata } from "next";
import PageHero from "@/components/sections/PageHero";
import QuoteForm from "@/components/forms/QuoteForm";
import { company } from "@/data/company";
import { pageSocialMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "Get a Machinery Quote in Pokhara",
  description:
    "Contact Machinery Tools Nepal in Pokhara for machinery, power tools, spare parts, service support, wholesale pricing and product availability.",
  alternates: { canonical: "/contact" },
  ...pageSocialMetadata(
    "Get a Machinery Quote in Pokhara | Machinery Tools Nepal",
    "Contact our Pokhara team about machinery, tools, spare parts, service and wholesale pricing.",
    "/contact",
  ),
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const { item } = await searchParams;
  const c = company.contact;
  const cards = [
    { icon: "☎", label: "Call", value: c.phone, href: `tel:${c.phoneRaw}` },
    { icon: "💬", label: "WhatsApp / Viber", value: c.whatsapp, href: `https://wa.me/977${c.whatsapp}` },
    { icon: "✉", label: "Email", value: c.email, href: `mailto:${c.email}` },
    { icon: "📍", label: "Visit", value: company.location.address, href: "/location" },
  ];
  return (
    <main>
      <PageHero page="contact" variant="tools" eyebrow="Contact" title="Tell us what you need." text="We reply the same day on WhatsApp, Viber or phone." />
      <section className="bg-[var(--surface)] px-6 py-16 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
          <div className="grid content-start gap-4 sm:grid-cols-2">
            {cards.map((x) => (
              <a key={x.label} href={x.href} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-amber-400 hover:shadow-lg">
                <div className="text-2xl">{x.icon}</div>
                <p className="mt-3 text-xs font-extrabold uppercase tracking-widest text-amber-600">{x.label}</p>
                <p className="mt-1 break-words font-bold text-slate-950">{x.value}</p>
              </a>
            ))}
          </div>
          <QuoteForm defaultItem={item?.slice(0, 120) ?? ""} />
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import StockQuotePicker from "@/components/forms/StockQuotePicker";
import { pageSocialMetadata } from "@/lib/seo/metadata";
import { getShopProducts } from "@/lib/server/catalog";

export const metadata: Metadata = {
  title: "Machinery, Tools & Spare Parts Quote",
  description:
    "Request a price and availability check for machinery, tools or spare parts from Machinery Tools Nepal in Pokhara.",
  alternates: { canonical: "/get-a-quote" },
  ...pageSocialMetadata(
    "Machinery, Tools & Spare Parts Quote | Machinery Tools Nepal",
    "Request current pricing and availability for machinery, tools and spare parts from our Pokhara team.",
    "/get-a-quote",
  ),
};
export const revalidate = 30;

export default async function GetAQuotePage({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const [{ item }, all] = await Promise.all([searchParams, getShopProducts()]);
  const inStock = all.filter((p) => p.availability === "in" && typeof p.stockQty === "number" && p.stockQty > 0 && !p.marketReference);

  return (
    <main className="min-h-[70vh] bg-[var(--surface)] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">Pokhara · Gandaki · Nepal</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Get a quote from our stock</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Search and select machinery, tools or parts that have a confirmed positive stock quantity. We’ll confirm your final price and delivery on WhatsApp.</p>
        </header>
        <StockQuotePicker products={inStock} initialItem={item?.slice(0, 120)} />
      </div>
    </main>
  );
}

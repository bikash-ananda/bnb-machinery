import type { Metadata } from "next";
import CheckoutClient from "@/components/shop/CheckoutClient";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <main className="min-h-[70vh] bg-[var(--surface)] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">Machinery Tools Nepal · Secure checkout</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Review your bill and place your order</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Check your items, enter customer and delivery details, then choose how you want to pay.</p>
          <ol className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-600" aria-label="Checkout steps">
            <li className="rounded-full bg-white px-3 py-2">1 · Bill</li><li className="rounded-full bg-white px-3 py-2">2 · Customer details</li><li className="rounded-full bg-white px-3 py-2">3 · Payment</li>
          </ol>
        </header>
        <CheckoutClient />
      </div>
    </main>
  );
}

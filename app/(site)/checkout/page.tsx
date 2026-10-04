import type { Metadata } from "next";
import PageHero from "@/components/sections/PageHero";
import CheckoutClient from "@/components/shop/CheckoutClient";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <main>
      <PageHero page="contact" variant="tools" eyebrow="Checkout" title="Almost there." text="Tell us where to send your order. We confirm price and delivery on WhatsApp or phone." />
      <section className="bg-[var(--surface)] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl"><CheckoutClient /></div>
      </section>
    </main>
  );
}

```tsx
import Image from "next/image";
import Link from "next/link";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Hero3D from "@/components/sections/Hero3D";
import { products } from "@/data/products";

export default function HomePage() {
  const featuredProducts = products.filter(
    (product) => product.featured,
  );

  return (
    <>
      <Header />

      <main className="bg-white text-slate-900">
        {/* HERO */}
        <Hero3D />

        {/* COMPANY INTRODUCTION */}
        <section className="bg-white px-6 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.25em] text-amber-600">
                B & B Machinery Suppliers
              </p>

              <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
                Machinery and tools
                <br />
                <span className="text-amber-600">for real work.</span>
              </h2>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-700">
                B & B Machinery Suppliers is a machinery and technical
                equipment business based in Pokhara, Nepal.
              </p>

              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                We supply agricultural machinery, power tools, mechanical
                tools, workshop equipment, spare parts and other practical
                equipment for businesses, farms, workshops and individuals.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-6 py-4 text-sm font-bold text-white transition hover:-translate-y-1 hover:bg-slate-800"
                >
                  Explore Products →
                </Link>

                <Link
                  href="/about"
                  className="inline-flex items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-6 py-4 text-sm font-bold text-slate-900 transition hover:-translate-y-1 hover:border-amber-400 hover:bg-amber-50"
                >
                  About B & B
                </Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-lg">
              <Image
                src="/images/company/shop.jpg"
                alt="B & B Machinery Suppliers shop in Pokhara"
                width={1200}
                height={800}
                className="h-auto w-full object-cover"
              />

              <div className="absolute bottom-0 left-0 right-0 bg-white/95 p-6 backdrop-blur-sm">
                <p className="text-xs font-extrabold uppercase tracking-widest text-amber-600">
                  Visit our showroom
                </p>

                <p className="mt-1 text-xl font-black text-slate-950">
                  B & B Machinery · Pokhara
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Machinery · Tools · Spare Parts · Equipment
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PRODUCT CATEGORIES */}
        <section className="border-y border-slate-200 bg-slate-50 px-6 py-20 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-extrabold uppercase tracking-[0.25em] text-amber-600">
                What We Supply
              </p>

              <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Equipment for every job.
              </h2>

              <p className="mt-5 text-lg leading-8 text-slate-600">
                Practical machinery and tools for agriculture, workshops,
                construction, maintenance and technical applications.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <CategoryCard
                number="01"
                title="Agricultural Machinery"
                text="Equipment for farming, cultivation, harvesting and agricultural processing."
              />

              <CategoryCard
                number="02"
                title="Power Tools"
                text="Professional and practical tools for construction, maintenance and workshop work."
              />

              <CategoryCard
                number="03"
                title="Mechanical Tools"
                text="Tools and equipment for mechanics, technicians and workshops."
              />

              <CategoryCard
                number="04"
                title="Spare Parts"
                text="Replacement parts and components for machinery and technical equipment."
              />

              <CategoryCard
                number="05"
                title="Workshop Equipment"
                text="Equipment and tools designed to improve workshop productivity."
              />

              <CategoryCard
                number="06"
                title="Machinery"
                text="Machinery solutions for commercial, industrial and practical applications."
              />
            </div>
          </div>
        </section>

        {/* FEATURED PRODUCTS */}
        <section className="bg-white px-6 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-[0.25em] text-amber-600">
                  Featured Products
                </p>

                <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                  Machinery & Tools
                </h2>

                <p className="mt-4 max-w-2xl text-lg leading-7 text-slate-600">
                  Explore some of the machinery and tools available through
                  B & B Machinery.
                </p>
              </div>

              <Link
                href="/products"
                className="inline-flex shrink-0 items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:border-amber-400 hover:bg-amber-50"
              >
                View All Products →
              </Link>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.slice(0, 4).map((product) => (
                <Link
                  href="/products"
                  key={product.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-2 hover:border-amber-300 hover:shadow-xl"
                >
                  <div className="relative aspect-square overflow-hidden bg-slate-100">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      unoptimized
                      className="object-contain p-6 transition duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div className="p-5">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-amber-600">
                      {product.category}
                    </p>

                    <h3 className="mt-2 text-lg font-black text-slate-950">
                      {product.name}
                    </h3>

                    <p className="mt-3 text-sm font-semibold text-slate-500">
                      View product →
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* WHY B&B */}
        <section className="bg-slate-950 px-6 py-20 text-white lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.25em] text-amber-400">
                Why B & B Machinery
              </p>

              <h2 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
                Practical equipment.
                <br />
                <span className="text-amber-400">
                  Practical support.
                </span>
              </h2>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                We focus on helping customers find equipment that matches
                their actual work, application and requirements.
              </p>

              <Link
                href="/services"
                className="mt-8 inline-flex rounded-xl bg-amber-400 px-6 py-4 text-sm font-black text-slate-950 transition hover:-translate-y-1 hover:bg-amber-300"
              >
                Our Services →
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FeatureBox
                title="Product Selection"
                text="Machinery, tools, equipment and spare parts for different applications."
              />

              <FeatureBox
                title="Technical Guidance"
                text="Get practical information before choosing equipment for your work."
              />

              <FeatureBox
                title="Showroom Visit"
                text="Visit our Pokhara location and discuss your requirements directly."
              />

              <FeatureBox
                title="Customer Support"
                text="Support for customers looking for machinery and technical solutions."
              />
            </div>
          </div>
        </section>

        {/* FACEBOOK / VIDEO */}
        <section className="bg-white px-6 py-20 lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.25em] text-amber-600">
                Follow B & B Machinery
              </p>

              <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
                See our machines
                <br />
                <span className="text-amber-600">in action.</span>
              </h2>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Follow our Facebook page for machinery demonstrations,
                products, shop updates and new equipment.
              </p>

              <a
                href="https://www.facebook.com/bandbmachine/"
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex rounded-xl bg-slate-950 px-6 py-4 text-sm font-bold text-white transition hover:-translate-y-1 hover:bg-slate-800"
              >
                Visit Facebook Page →
              </a>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-400 text-3xl text-slate-950">
                ▶
              </div>

              <h3 className="mt-7 text-2xl font-black text-slate-950">
                Machinery Videos
              </h3>

              <p className="mt-3 leading-7 text-slate-600">
                Product demonstrations and machinery videos from B & B
                Machinery.
              </p>

              <a
                href="https://www.facebook.com/bandbmachine/"
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-block text-sm font-extrabold text-amber-600 hover:text-amber-700"
              >
                Watch on Facebook →
              </a>
            </div>
          </div>
        </section>

        {/* LOCATION */}
        <section className="border-t border-slate-200 bg-slate-50 px-6 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
            <div className="rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200 sm:p-10">
              <p className="text-sm font-extrabold uppercase tracking-[0.25em] text-amber-600">
                Visit Us
              </p>

              <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
                Find the right machine
                <br />
                <span className="text-amber-600">for your work.</span>
              </h2>

              <p className="mt-6 text-lg leading-8 text-slate-700">
                Visit our showroom in Pokhara, see equipment in person,
                compare your options and talk with our team.
              </p>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-extrabold uppercase tracking-widest text-amber-600">
                  Showroom
                </p>

                <p className="mt-2 text-lg font-black text-slate-950">
                  B & B Machinery Suppliers
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Pokhara, Nepal
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <SmallBenefit
                  icon="⚙"
                  title="See Machines"
                  text="Visit showroom"
                />

                <SmallBenefit
                  icon="🔧"
                  title="Tools & Parts"
                  text="Practical solutions"
                />

                <SmallBenefit
                  icon="🤝"
                  title="Talk to Us"
                  text="Get guidance"
                />
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="https://maps.app.goo.gl/4byXLucHvghraDEY8"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-6 py-4 text-sm font-black text-slate-950 transition hover:-translate-y-1 hover:bg-amber-300"
                >
                  Get Directions →
                </a>

                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-6 py-4 text-sm font-bold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Contact Us
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
              <iframe
                title="B & B Machinery Suppliers location"
                src="https://www.google.com/maps?q=B%26B%20Machinery%20Suppliers%2C%20Pokhara&output=embed"
                className="h-[420px] w-full border-0 lg:h-full lg:min-h-[600px]"
                loading="lazy"
              />

              <div className="border-t border-slate-200 p-5">
                <p className="text-sm font-black text-slate-950">
                  B & B Machinery Suppliers
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Pokhara, Nepal · Machinery · Power Tools · Spare Parts
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* QUOTE CTA */}
        <section className="bg-amber-400 px-6 py-16 text-slate-950 lg:px-8 lg:py-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-widest">
                Need machinery?
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Tell us what you need.
              </h2>

              <p className="mt-2 text-base text-slate-800">
                We can help you find the right equipment for your work.
              </p>
            </div>

            <Link
              href="/contact"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-950 px-7 py-4 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-slate-800"
            >
              Request a Quote →
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

/* CATEGORY CARD */

function CategoryCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <span className="text-sm font-black text-amber-600">
          {number}
        </span>

        <span className="text-xl text-slate-300 transition group-hover:text-amber-500">
          ⚙
        </span>
      </div>

      <h3 className="mt-7 text-xl font-black text-slate-950">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-slate-600">
        {text}
      </p>

      <div className="mt-6 h-1 w-8 bg-amber-400 transition-all duration-300 group-hover:w-16" />
    </div>
  );
}

/* WHY B&B FEATURE */

function FeatureBox({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white p-6 text-slate-950">
      <h3 className="text-lg font-black">{title}</h3>

      <p className="mt-3 text-sm leading-7 text-slate-600">
        {text}
      </p>
    </div>
  );
}

/* SMALL LOCATION BENEFIT */

function SmallBenefit({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xl">{icon}</div>

      <p className="mt-2 text-sm font-black text-slate-950">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-500">{text}</p>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCart from "@/components/shop/AddToCart";
import Gallery from "@/components/shop/Gallery";
import SafeImage from "@/components/ui/SafeImage";
import { company } from "@/data/company";
import { getShopProduct, getShopProducts } from "@/lib/server/catalog";
import { discountPct, npr } from "@/lib/shop/types";

export const revalidate = 60;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getShopProduct((await params).slug);
  if (!p) return { title: "Product not found" };
  return { title: p.name, description: p.description.slice(0, 160), openGraph: p.image ? { images: [p.image] } : undefined };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = await getShopProduct(slug);
  if (!p) notFound();

  const related = (await getShopProducts()).filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
  const off = discountPct(p);
  const ask = `Hello B & B Machinery, I am interested in: ${p.name}${p.model ? " (" + p.model + ")" : ""}`;
  const ld = {
    "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description,
    image: p.images, brand: { "@type": "Brand", name: p.brand },
    ...(p.price !== null && {
      offers: {
        "@type": "Offer", priceCurrency: "NPR", price: p.price,
        availability: p.availability === "out" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      },
    }),
  };

  return (
    <main className="bg-[var(--surface)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
          <Link href="/products" className="font-semibold hover:text-amber-600">Shop</Link> / <span>{p.category}</span> / <span className="text-slate-800">{p.name}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <Gallery images={p.images} alt={p.name} />

          <div>
            <p className="text-sm font-extrabold uppercase tracking-wider text-amber-600">{p.brand}</p>
            <h1 className="mt-1 text-3xl font-black text-slate-950 sm:text-4xl">{p.name}</h1>
            {p.nameNe && <p className="mt-1 text-lg text-slate-600">{p.nameNe}</p>}
            {p.model && <p className="mt-2 text-sm text-slate-500">Model: <b>{p.model}</b></p>}

            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              {p.price !== null ? (
                <>
                  <span className="text-4xl font-black">{npr(p.price)}</span>
                  {p.mrp && p.mrp > p.price && <span className="text-lg text-slate-400 line-through">{npr(p.mrp)}</span>}
                  {off > 0 && <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">{off}% OFF</span>}
                </>
              ) : <span className="text-2xl font-black text-slate-700">Price on request</span>}
            </div>
            <p className={`mt-2 text-sm font-bold ${p.availability === "in" ? "text-emerald-600" : p.availability === "out" ? "text-red-600" : "text-slate-500"}`}>
              {p.availability === "in" ? (p.stockQty !== null && p.stockQty <= 3 ? `Only ${p.stockQty} left` : "In stock") : p.availability === "out" ? "Out of stock" : "Contact us to confirm availability"}
            </p>
            <p className="mt-1 text-xs text-slate-500">Final price, delivery cost and availability are confirmed by our team before you pay.</p>

            {p.description && <p className="mt-6 leading-7 text-slate-700">{p.description}</p>}

            <div className="mt-6 max-w-md"><AddToCart product={p} detail /></div>

            <div className="mt-5 flex flex-wrap gap-3">
              <a href={`https://wa.me/977${company.contact.whatsapp}?text=${encodeURIComponent(ask)}`} target="_blank" rel="noopener noreferrer"
                className="rounded-xl border border-emerald-600 px-5 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50">💬 Ask on WhatsApp</a>
              <a href={`tel:${company.contact.phoneRaw}`} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold hover:bg-white">☎ Call us</a>
            </div>
          </div>
        </div>

        {p.specs.length > 0 && (
          <section className="mt-12" aria-label="Specifications">
            <h2 className="text-2xl font-black">Specifications</h2>
            <dl className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {p.specs.map((s) => (
                <div key={s.name} className="grid grid-cols-3 gap-4 px-5 py-3 text-sm"><dt className="font-bold text-slate-600">{s.name}</dt><dd className="col-span-2 text-slate-900">{s.value}</dd></div>
              ))}
            </dl>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-14" aria-label="Related products">
            <h2 className="text-2xl font-black">You may also need</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <Link key={r.id} href={`/products/${r.slug}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-amber-400 hover:shadow-lg">
                  <SafeImage src={r.image} alt={r.name} contain className="aspect-square w-full bg-slate-100 p-4" />
                  <div className="p-4"><p className="font-extrabold">{r.name}</p><p className="mt-1 text-sm text-slate-600">{r.price !== null ? npr(r.price) : "Price on request"}</p></div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

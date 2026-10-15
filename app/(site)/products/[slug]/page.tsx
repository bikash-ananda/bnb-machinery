import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import L from "@/components/i18n/L";
import AddToCart from "@/components/shop/AddToCart";
import CompareButton from "@/components/shop/CompareButton";
import ProductGallery from "@/components/shop/ProductGallery";
import ReviewsSection from "@/components/shop/ReviewsSection";
import Stars from "@/components/shop/Stars";
import VideoList from "@/components/shop/VideoList";
import SafeImage from "@/components/ui/SafeImage";
import { company } from "@/config/site";
import { getShopProduct, getShopProducts } from "@/lib/server/catalog";
import { getProductExtras, getReviews } from "@/lib/server/extras";
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

  const [extras, rv, all] = await Promise.all([getProductExtras(p.slug), getReviews(p.slug), getShopProducts()]);
  const related = all.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
  const mrp = p.mrp ?? extras.mrp;
  const off = discountPct({ price: p.price, mrp });
  const ask = `Hello Machinery Tools Nepal, I am interested in: ${p.name}${p.model ? " (" + p.model + ")" : ""}`;

  const ld = {
    "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description,
    image: p.images, brand: { "@type": "Brand", name: p.brand },
    ...(rv.count > 0 && { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(rv.avg.toFixed(1)), reviewCount: rv.count } }),
    ...(p.price !== null && !p.marketReference && {
      offers: {
        "@type": "Offer", priceCurrency: "NPR", price: p.price,
        availability: p.availability === "out" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      },
    }),
  };

  const section = "scroll-mt-28 mt-14";
  const h2 = "text-2xl font-black text-slate-950";
  const navLink = "rounded-full px-4 py-2 text-sm font-bold text-slate-700 hover:bg-amber-100";

  return (
    <main className="bg-[var(--surface)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
          <Link href="/products" className="font-semibold hover:text-amber-600"><L en="Shop" ne="पसल" /></Link> / <span>{p.category}</span> / <span className="text-slate-800">{p.name}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <div className="lg:sticky lg:top-28 lg:self-start"><ProductGallery images={p.images} alt={p.name} /></div>

          <div>
            <Link href={`/products?brand=${encodeURIComponent(p.brand)}`} className="text-sm font-extrabold uppercase tracking-wider text-amber-600 hover:underline">{p.brand}</Link>
            <h1 className="mt-1 text-3xl font-black text-slate-950 sm:text-4xl">{p.name}</h1>
            {p.nameNe && <p className="mt-1 text-lg text-slate-600">{p.nameNe}</p>}
            {p.model && <p className="mt-2 text-sm text-slate-500"><L en="Model" ne="मोडल" />: <b>{p.model}</b></p>}

            <a href="#reviews" className="mt-3 flex items-center gap-2 text-sm text-slate-600 hover:text-amber-600">
              {rv.count > 0 ? (<><Stars value={rv.avg} /> <b>{rv.avg.toFixed(1)}</b> <span>({rv.count})</span></>) : <span><L en="No reviews yet" ne="अहिलेसम्म समीक्षा छैन" /></span>}
            </a>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
              {p.price !== null ? (
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-4xl font-black text-slate-950">{npr(p.price)}</span>
                  {mrp && mrp > p.price && <span className="text-lg text-slate-400 line-through">{npr(mrp)}</span>}
                  {off > 0 && <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">{off}% OFF</span>}
                </div>
              ) : <span className="text-2xl font-black text-slate-700"><L en="Price on request" ne="मूल्य सोधपुछमा" /></span>}
              {p.marketPrice != null && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-[11px] font-black uppercase tracking-wide text-amber-900"><L en="Nepal online market reference" ne="नेपालको अनलाइन बजार सन्दर्भ मूल्य" /></p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{npr(p.marketPrice)}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-700">{p.priceNote || <L en="This is an external reference price. B&B confirms its own selling price and availability before accepting an order." ne="यो बाह्य सन्दर्भ मूल्य हो। अर्डर स्वीकार्नुअघि B&B ले आफ्नो बिक्री मूल्य र उपलब्धता पुष्टि गर्छ।" />}</p>
                  {p.priceCheckedOn && <p className="mt-1 text-[11px] text-slate-500"><L en="Checked" ne="जाँच गरिएको" />: {p.priceCheckedOn}</p>}
                </div>
              )}
              {p.price !== null && mrp && mrp > p.price && (
                <p className="mt-1 text-sm font-bold text-emerald-700"><L en="You save" ne="तपाईंले बचाउनुहुन्छ" /> {npr(mrp - p.price)}</p>
              )}
              <p className={`mt-2 text-sm font-bold ${p.availability === "in" ? "text-emerald-600" : p.availability === "out" ? "text-red-600" : "text-slate-500"}`}>
                {p.availability === "in" ? (p.stockQty !== null && p.stockQty <= 3 ? <L en={`Only ${p.stockQty} left`} ne={`${p.stockQty} वटा मात्र बाँकी`} /> : <L en="In stock" ne="स्टकमा छ" />) : p.availability === "out" ? <L en="Out of stock" ne="स्टकमा छैन" /> : <L en="Contact us to confirm availability" ne="उपलब्धता पुष्टि गर्न हामीलाई सम्पर्क गर्नुहोस्" />}
              </p>
              <p className="mt-1 text-xs text-slate-500"><L en="Final price, delivery cost and availability are confirmed by our team before you pay." ne="तिर्नुअघि अन्तिम मूल्य, डेलिभरी खर्च र उपलब्धता हाम्रो टोलीले पुष्टि गर्नेछ।" /></p>
            </div>

            <div className="mt-6 max-w-md"><AddToCart product={p} detail /></div>

            <div className="mt-5 flex flex-wrap gap-3">
              <a href={`https://wa.me/977${company.contact.whatsapp}?text=${encodeURIComponent(ask)}`} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-emerald-600 px-5 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50"><L en="Ask on WhatsApp" ne="WhatsApp मा सोध्नुहोस्" /></a>
              <a href={`tel:${company.contact.phoneRaw}`} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold hover:bg-white"><L en="Call us" ne="फोन गर्नुहोस्" /></a>
              <Link href={`/get-a-quote?item=${encodeURIComponent(p.id)}`} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold hover:bg-white"><L en="Get quotation" ne="कोटेसन लिनुहोस्" /></Link>
              <CompareButton id={p.id} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold hover:bg-white" />
            </div>
            {(p.manufacturerUrl || p.sourceUrl) && (
              <div className="mt-5 flex flex-wrap gap-3 text-sm">
                {p.manufacturerUrl && <a href={p.manufacturerUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-bold text-slate-800 hover:border-amber-400"><L en="Manufacturer specifications ↗" ne="उत्पादकको विवरण ↗" /></a>}
                {p.sourceUrl && <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-bold text-slate-700 hover:border-amber-400"><L en="View Nepal price source ↗" ne="नेपालको मूल्य स्रोत हेर्नुहोस् ↗" /></a>}
              </div>
            )}
          </div>
        </div>

        <div className="sticky top-16 z-30 mt-10 flex gap-1 overflow-x-auto rounded-full border border-slate-200 bg-white/90 p-1.5 backdrop-blur">
          <a href="#overview" className={navLink}><L en="Overview" ne="विवरण" /></a>
          {p.specs.length > 0 && <a href="#specs" className={navLink}><L en="Specifications" ne="विशेषताहरू" /></a>}
          {extras.videos.length > 0 && <a href="#videos" className={navLink}><L en="Videos" ne="भिडियो" /></a>}
          <a href="#reviews" className={navLink}><L en="Reviews" ne="समीक्षा" /></a>
        </div>

        <section id="overview" className={section}>
          <h2 className={h2}><L en="Description" ne="विवरण" /></h2>
          <p className="mt-4 max-w-3xl whitespace-pre-line leading-8 text-slate-700">
            {p.description || <L en="Full description coming soon. Ask our team for details." ne="पूर्ण विवरण छिट्टै आउँदैछ। थप जानकारीका लागि हाम्रो टोलीलाई सोध्नुहोस्।" />}
          </p>
        </section>

        {p.specs.length > 0 && (
          <section id="specs" className={section} aria-label="Specifications">
            <h2 className={h2}><L en="Specifications" ne="विशेषताहरू" /></h2>
            <dl className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {p.specs.map((s) => (
                <div key={s.name} className="grid grid-cols-3 gap-4 px-5 py-3 text-sm"><dt className="font-bold text-slate-600">{s.name}</dt><dd className="col-span-2 text-slate-900">{s.value}</dd></div>
              ))}
            </dl>
          </section>
        )}

        {extras.videos.length > 0 && (
          <section id="videos" className={section}>
            <h2 className={`${h2} mb-4`}><L en="Videos" ne="भिडियो" /></h2>
            <VideoList videos={extras.videos} />
          </section>
        )}

        <section id="reviews" className={section}>
          <h2 className={`${h2} mb-4`}><L en="Customer reviews" ne="ग्राहक समीक्षा" /></h2>
          <ReviewsSection slug={p.slug} summary={rv} />
        </section>

        {related.length > 0 && (
          <section className={section} aria-label="Related products">
            <h2 className={h2}><L en="You may also need" ne="तपाईंलाई यी पनि चाहिन सक्छ" /></h2>
            <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {related.map((r) => (
                <Link key={r.id} href={`/products/${r.slug}`} data-tilt="" className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-amber-400 hover:shadow-lg">
                  <SafeImage src={r.image} alt={r.name} contain className="aspect-square w-full bg-slate-100 p-4" />
                  <div className="p-4"><p className="font-extrabold">{r.name}</p><p className="mt-1 text-sm font-bold text-[var(--brand-primary)]">{r.price !== null ? npr(r.price) : r.marketPrice != null ? npr(r.marketPrice) : <L en="Price on request" ne="मूल्य सोधपुछमा" />}</p>{r.marketReference && <p className="mt-1 text-[10px] font-bold uppercase text-amber-800"><L en="Market reference" ne="बजार सन्दर्भ" /></p>}</div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

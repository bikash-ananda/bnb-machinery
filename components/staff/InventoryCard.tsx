import Link from "next/link";
import Image from "next/image";
import { LocalizedField } from "@/components/i18n/LocalizedField";
import { LocalizedText } from "@/components/i18n/LanguageProvider";
import type { ProductRecord } from "@/lib/inventory/types";
import StatusLabel from "@/components/staff/StatusLabel";
import { messages } from "@/lib/i18n/messages";

export default function InventoryCard({
  product,
  href,
}: {
  product: ProductRecord;
  href: string;
}) {
  const image = product.images?.[0];
  return (
    <article className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
      <Link href={href} className="flex min-h-28 gap-4 p-3 sm:p-4">
        <div className="h-24 w-28 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-muted)] sm:h-28 sm:w-36">
          {image ? (
            <Image
              src={"/api/inventory/images/" + encodeURIComponent(image.id)}
              alt={messages.en.uploadedPhoto}
              width={400}
              height={300}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1 py-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              <StatusLabel status={product.verification_status} />
            </span>
            {product.publication_status === "PUBLISHED" ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                <LocalizedText id="publishedProduct" />
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 line-clamp-2 text-base font-semibold text-[var(--brand-primary)]">
            <LocalizedField en={product.name_en} ne={product.name_ne} fallback={messages.en.unnamedDraft} />
          </h2>
          <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
            {[product.brand_name, product.model, product.part_number].filter(Boolean).join(" · ") || product.slug}
          </p>
          <span className="mt-2 inline-flex min-h-9 items-center text-sm font-semibold text-amber-800">
            <LocalizedText id="viewDetails" /> <span aria-hidden="true" className="ml-1">→</span>
          </span>
        </div>
      </Link>
    </article>
  );
}

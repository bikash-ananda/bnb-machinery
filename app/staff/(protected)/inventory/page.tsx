import Link from "next/link";
import { redirect } from "next/navigation";
import { LocalizedText } from "@/components/i18n/LanguageProvider";
import InventoryCard from "@/components/staff/InventoryCard";
import { getStaffSession } from "@/lib/server/auth";
import { getInventoryProducts } from "@/lib/server/inventory";
import type { VerificationStatus } from "@/lib/inventory/types";
import type { ProductRecord } from "@/lib/inventory/types";

const validStatuses: VerificationStatus[] = [
  "DRAFT",
  "AI_IDENTIFICATION_PENDING",
  "STAFF_REVIEW",
  "OWNER_REVIEW",
  "APPROVED",
  "REJECTED",
  "NEEDS_CORRECTION",
];

export default async function InventoryListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");
  const params = await searchParams;
  const status = validStatuses.find((value) => value === params.status);
  let products: ProductRecord[] = [];
  let loadError = false;
  try {
    products = await getInventoryProducts(session, status);
  } catch {
    loadError = true;
  }
  const title =
    status === "OWNER_REVIEW"
      ? "submitted"
      : status === "STAFF_REVIEW" || status === "AI_IDENTIFICATION_PENDING"
        ? "pendingVerification"
        : status === "APPROVED"
          ? "published"
          : "inventory";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-700"><LocalizedText id="dashboard" /></p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--brand-primary)] sm:text-3xl"><LocalizedText id={title} /></h1>
        </div>
        {session.role === "INVENTORY_EDITOR" ? (
          <Link href="/staff/inventory/new" className="inline-flex min-h-12 items-center rounded-lg bg-[var(--brand-primary)] px-5 text-sm font-semibold text-white">
            + <span className="ml-2"><LocalizedText id="addStock" /></span>
          </Link>
        ) : null}
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        {[
          { label: "inventory", href: "/staff/inventory" },
          { label: "drafts", href: "/staff/inventory?status=DRAFT" },
          { label: "pendingVerification", href: "/staff/inventory?status=STAFF_REVIEW" },
          { label: "submitted", href: "/staff/inventory?status=OWNER_REVIEW" },
          { label: "published", href: "/staff/inventory?status=APPROVED" },
        ].map((filter) => (
          <Link key={filter.href} href={filter.href} className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-[var(--border)] bg-white px-4 text-xs font-semibold text-slate-700">
            <LocalizedText id={filter.label as "inventory" | "drafts" | "pendingVerification" | "submitted" | "published"} />
          </Link>
        ))}
      </div>

      {loadError ? (
        <p role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"><LocalizedText id="inventoryLoadError" /></p>
      ) : products.length ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {products.map((product) => (
            <InventoryCard
              key={product.id}
              product={product}
              href={session.role === "OWNER" && product.verification_status === "OWNER_REVIEW"
                ? "/staff/review/" + product.id
                : "/staff/inventory/" + product.id}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-white px-6 py-14 text-center">
          <h2 className="text-xl font-bold text-[var(--brand-primary)]"><LocalizedText id="noDraftsTitle" /></h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]"><LocalizedText id="noDraftsDescription" /></p>
        </div>
      )}
    </div>
  );
}

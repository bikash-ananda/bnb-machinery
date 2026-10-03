import Link from "next/link";
import { redirect } from "next/navigation";
import { LocalizedText } from "@/components/i18n/LanguageProvider";
import InventoryCard from "@/components/staff/InventoryCard";
import { getStaffSession } from "@/lib/server/auth";
import { getInventoryProducts } from "@/lib/server/inventory";
import type { ProductRecord } from "@/lib/inventory/types";

export default async function StaffDashboardPage() {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");
  if (session.role === "OWNER") redirect("/staff/review");
  let products: ProductRecord[] = [];
  let loadError = false;
  try {
    products = await getInventoryProducts(session);
  } catch {
    loadError = true;
  }

  const counts = {
    drafts: products.filter((item) => ["DRAFT", "NEEDS_CORRECTION"].includes(item.verification_status)).length,
    verification: products.filter((item) => ["AI_IDENTIFICATION_PENDING", "STAFF_REVIEW"].includes(item.verification_status)).length,
    submitted: products.filter((item) => item.verification_status === "OWNER_REVIEW").length,
    published: products.filter((item) => item.publication_status === "PUBLISHED").length,
  };
  const cards = [
    { title: "drafts", count: counts.drafts, href: "/staff/inventory?status=DRAFT" },
    { title: "pendingVerification", count: counts.verification, href: "/staff/inventory?status=STAFF_REVIEW" },
    { title: "submitted", count: counts.submitted, href: "/staff/inventory?status=OWNER_REVIEW" },
    { title: "published", count: counts.published, href: "/staff/inventory?status=APPROVED" },
  ] as const;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-5 rounded-2xl bg-[var(--brand-primary)] px-5 py-7 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-amber-300"><LocalizedText id="welcomeStaff" /></p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl"><LocalizedText id="accountName" /></h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300"><LocalizedText id="dashboardDescription" /></p>
        </div>
        <Link href="/staff/inventory/new" className="inline-flex min-h-14 items-center justify-center rounded-xl bg-amber-400 px-6 py-4 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-300">
          <span aria-hidden="true" className="mr-2 text-lg">+</span><LocalizedText id="addStock" />
        </Link>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[var(--brand-primary)]"><LocalizedText id="dashboardCounts" /></h2>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((card) => (
            <Link key={card.title} href={card.href} className="rounded-xl border border-[var(--border)] bg-white p-4 transition-colors hover:border-amber-300 sm:p-5">
              <p className="text-sm font-medium leading-5 text-[var(--text-muted)]"><LocalizedText id={card.title} /></p>
              <p className="mt-3 text-3xl font-bold text-[var(--brand-primary)]">{card.count}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-[var(--brand-primary)]"><LocalizedText id="recentActivity" /></h2>
          <Link href="/staff/inventory" className="min-h-11 inline-flex items-center text-sm font-semibold text-amber-800"><LocalizedText id="browseInventory" /> →</Link>
        </div>
        {loadError ? (
          <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"><LocalizedText id="inventoryLoadError" /></p>
        ) : products.length ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {products.slice(0, 4).map((product) => (
              <InventoryCard key={product.id} product={product} href={"/staff/inventory/" + product.id} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-white px-6 py-10 text-center">
            <h3 className="font-semibold text-[var(--brand-primary)]"><LocalizedText id="noDraftsTitle" /></h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]"><LocalizedText id="noDraftsDescription" /></p>
            <Link href="/staff/inventory/new" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[var(--brand-primary)] px-5 text-sm font-semibold text-white"><LocalizedText id="startStockEntry" /></Link>
          </div>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { LocalizedText } from "@/components/i18n/LanguageProvider";
import InventoryCard from "@/components/staff/InventoryCard";
import { getStaffSession } from "@/lib/server/auth";
import { getInventoryProducts } from "@/lib/server/inventory";
import type { ProductRecord } from "@/lib/inventory/types";

export default async function OwnerReviewQueuePage() {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");
  if (session.role !== "OWNER") redirect("/staff");
  let products: ProductRecord[] = [];
  let loadError = false;
  try {
    products = await getInventoryProducts(session, "OWNER_REVIEW");
  } catch {
    loadError = true;
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-700"><LocalizedText id="owner" /></p>
          <h1 className="mt-2 text-3xl font-bold text-[var(--brand-primary)]"><LocalizedText id="ownerQueue" /></h1>
          <p className="mt-3 max-w-2xl leading-7 text-[var(--text-muted)]"><LocalizedText id="ownerQueueDescription" /></p>
        </div>
        <Link href="/staff/inventory" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--brand-primary)]"><LocalizedText id="browseInventory" /> →</Link>
      </div>

      {loadError ? (
        <p role="alert" className="mt-7 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"><LocalizedText id="inventoryLoadError" /></p>
      ) : products.length ? (
        <div className="mt-7 grid gap-3 lg:grid-cols-2">
          {products.map((product) => (
            <InventoryCard key={product.id} product={product} href={"/staff/review/" + product.id} />
          ))}
        </div>
      ) : (
        <div className="mt-7 rounded-2xl border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center">
          <h2 className="text-xl font-bold text-[var(--brand-primary)]"><LocalizedText id="noOwnerQueue" /></h2>
        </div>
      )}
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ProductEditor from "@/components/staff/ProductEditor";
import { LocalizedText } from "@/components/i18n/LanguageProvider";
import { getStaffSession } from "@/lib/server/auth";
import { getInventoryProduct } from "@/lib/server/inventory";

export default async function InventoryReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");
  const { id } = await params;
  const product = await getInventoryProduct(id).catch(() => null);
  if (!product) notFound();

  if (session.role === "OWNER") {
    if (product.verification_status === "OWNER_REVIEW") redirect("/staff/review/" + product.id);
    redirect("/staff");
  }
  if (product.created_by !== session.email) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/staff/inventory" className="mb-4 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--brand-primary)]">← <span className="ml-2"><LocalizedText id="backToInventory" /></span></Link>
      <ProductEditor product={product} mode="staff" />
    </div>
  );
}

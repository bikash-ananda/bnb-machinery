import { redirect } from "next/navigation";
import { LocalizedText } from "@/components/i18n/LanguageProvider";
import AddStockForm from "@/components/staff/AddStockForm";
import { getStaffSession } from "@/lib/server/auth";

export default async function NewInventoryPage() {
  const session = await getStaffSession();
  if (!session) redirect("/staff/login");
  if (session.role !== "INVENTORY_EDITOR") redirect("/staff/review");

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-2 text-sm text-[var(--text-muted)]"><LocalizedText id="dashboard" /> / <LocalizedText id="addStock" /></p>
      <AddStockForm />
    </div>
  );
}

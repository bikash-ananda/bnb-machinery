import { notFound } from "next/navigation";
import { MODULES, type ModuleId } from "@/lib/admin/access";
import { requireAdmin } from "@/lib/server/admin-auth";
import QuotationInbox from "@/components/admin/QuotationInbox";
import SupportInbox from "@/components/admin/SupportInbox";

export default async function PlannedModule({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const m = MODULES.find((x) => x.id === module);
  if (!m) notFound();
  await requireAdmin(m.id as ModuleId);
  if (module === "quotations") return <QuotationInbox />;
  if (module === "support") return <SupportInbox />;
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-black text-slate-950">{m.label}</h1>
      <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">{m.summary} This module is planned.</p>
    </div>
  );
}

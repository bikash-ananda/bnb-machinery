import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/server/admin-auth";
import { db } from "@/src/db/client";
import { purchaseBills, suppliers } from "@/src/modules/purchasing/schema";
import { formatNPR } from "@/src/lib/money";

export const metadata = { title: "Procurement" };
export const dynamic = "force-dynamic";

export default async function ProcurementPage() {
  await requireAdmin("procurement");
  let supplierRows: {id:string;name:string;phone:string|null;panNo:string|null}[] = [];
  let billRows: {id:string;billNo:string;fiscalYear:string;supplierId:string;supplierInvoiceNo:string;totalPaisa:bigint;status:string;createdAt:Date}[] = [];
  let failed = false;
  try {
    [supplierRows, billRows] = await Promise.all([
      db.select({id:suppliers.id,name:suppliers.name,phone:suppliers.phone,panNo:suppliers.panNo}).from(suppliers).orderBy(suppliers.name).limit(250),
      db.select({id:purchaseBills.id,billNo:purchaseBills.billNo,fiscalYear:purchaseBills.fiscalYear,supplierId:purchaseBills.supplierId,supplierInvoiceNo:purchaseBills.supplierInvoiceNo,totalPaisa:purchaseBills.totalPaisa,status:purchaseBills.status,createdAt:purchaseBills.createdAt}).from(purchaseBills).orderBy(desc(purchaseBills.createdAt)).limit(100),
    ]);
  } catch { failed = true; }
  const supplierName = new Map(supplierRows.map(s=>[s.id,s.name]));
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-black text-slate-950">Procurement</h1><p className="mt-1 text-sm text-slate-600">Live supplier register and posted purchase bills from the purchasing ledger.</p></div>
    {failed && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Procurement data could not be loaded. Verify the purchasing database migrations.</p>}
    <section><h2 className="mb-3 text-lg font-black">Suppliers ({supplierRows.length})</h2><div className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-[600px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Supplier</th><th className="p-3">Phone</th><th className="p-3">PAN</th></tr></thead><tbody className="divide-y">{supplierRows.map(s=><tr key={s.id}><td className="p-3 font-semibold">{s.name}</td><td className="p-3">{s.phone||"—"}</td><td className="p-3">{s.panNo||"—"}</td></tr>)}</tbody></table>{!failed&&!supplierRows.length&&<p className="p-6 text-sm text-slate-600">No suppliers recorded yet.</p>}</div></section>
    <section><h2 className="mb-3 text-lg font-black">Recent purchase bills</h2><div className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-[750px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Bill</th><th className="p-3">Supplier</th><th className="p-3">Supplier invoice</th><th className="p-3">Fiscal year</th><th className="p-3">Total</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y">{billRows.map(b=><tr key={b.id}><td className="p-3 font-bold">{b.billNo}</td><td className="p-3">{supplierName.get(b.supplierId)||"Supplier"}</td><td className="p-3">{b.supplierInvoiceNo}</td><td className="p-3">{b.fiscalYear}</td><td className="p-3">{formatNPR(b.totalPaisa)}</td><td className="p-3">{b.status}</td></tr>)}</tbody></table>{!failed&&!billRows.length&&<p className="p-6 text-sm text-slate-600">No purchase bills recorded yet.</p>}</div></section>
    <p className="text-xs text-slate-500">Purchase entry and supplier payments are available in the purchasing service layer but do not yet have a safe interactive admin form.</p>
  </div>;
}

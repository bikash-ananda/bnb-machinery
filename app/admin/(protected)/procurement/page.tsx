import ProcurementManager from "@/components/admin/ProcurementManager";
import { requireAdmin } from "@/lib/server/admin-auth";
import { listProcurementData } from "@/src/modules/purchasing/queries";
export const metadata = { title: "Procurement & stock receiving" };
export const dynamic = "force-dynamic";
export default async function ProcurementPage() {
 await requireAdmin("procurement");
 let data=null; try { data=await listProcurementData(); } catch(error) { console.error("procurement load failed",error); }
 return <div className="space-y-5"><header><h1 className="text-2xl font-black">Purchase & stock entry</h1><p className="mt-1 text-sm text-slate-600">Receive supplier invoices into the existing product library and stock ledger.</p></header>{!data?<p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Procurement data could not be loaded. Check database and seed configuration.</p>:<ProcurementManager {...data}/>}</div>;
}
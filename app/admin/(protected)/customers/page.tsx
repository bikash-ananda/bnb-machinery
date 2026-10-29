import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/server/admin-auth";
import { db } from "@/src/db/client";
import { customers } from "@/src/modules/customers/schema";
import { formatNPR } from "@/src/lib/money";

export const metadata = { title: "Customers & CRM" };
export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  await requireAdmin("customers");
  let rows: {id:string;name:string;code:string|null;phone:string|null;email:string|null;type:string;district:string|null;panNo:string|null;creditLimitPaisa:bigint;createdAt:Date}[] | null = null;
  let error = false;
  try {
    rows = await db.select().from(customers).orderBy(desc(customers.createdAt)).limit(250);
  } catch { error = true; }
  return <div className="space-y-5">
    <div><h1 className="text-2xl font-black text-slate-950">Customers & CRM</h1><p className="mt-1 text-sm text-slate-600">Live customer directory from the ERP customer register.</p></div>
    {error ? <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Customer data could not be loaded. Check the database connection and migrations.</p> : !rows?.length ? <p className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-600">No customers are registered yet. Customers are created through POS and order workflows.</p> :
      <div className="overflow-x-auto rounded-2xl border bg-white"><table className="min-w-[850px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Customer</th><th className="p-3">Phone</th><th className="p-3">Email</th><th className="p-3">Type</th><th className="p-3">District</th><th className="p-3">Credit limit</th><th className="p-3">Joined</th></tr></thead><tbody className="divide-y">{rows.map((c) => <tr key={c.id}><td className="p-3"><p className="font-bold">{c.name}</p><p className="text-xs text-slate-500">{c.code ?? c.id.slice(0, 8)}{c.panNo ? " · PAN " + c.panNo : ""}</p></td><td className="p-3">{c.phone || "—"}</td><td className="p-3">{c.email || "—"}</td><td className="p-3">{c.type}</td><td className="p-3">{c.district || "—"}</td><td className="p-3">{formatNPR(c.creditLimitPaisa)}</td><td className="p-3 whitespace-nowrap">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></div>}
    <p className="text-xs text-slate-500">Showing up to 250 most recent customers. Customer edits and follow-up task management are not enabled yet.</p>
  </div>;
}

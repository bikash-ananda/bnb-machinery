import { requireAdmin } from "@/lib/server/admin-auth";
import { safeSelect } from "@/lib/server/admin-api";

export const metadata = { title: "Audit log" };
type Ev = { id: string; at: string; actor_email: string | null; actor_role: string | null; action: string; entity: string | null; entity_id: string | null; ip: string | null };

export default async function AuditPage() {
  await requireAdmin("audit");
  const rows = await safeSelect<Ev>("admin_audit_events?select=id,at,actor_email,actor_role,action,entity,entity_id,ip&order=at.desc&limit=200");
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-slate-950">Audit log</h1>
      {rows === null ? <p className="rounded-2xl bg-amber-50 p-5 text-sm font-semibold text-amber-900">The audit log could not be loaded.</p> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">When (Nepal time)</th><th className="px-4 py-3">Who</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Item</th><th className="px-4 py-3">IP</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-4 py-2.5">{new Date(e.at).toLocaleString("en-GB", { timeZone: "Asia/Kathmandu" })}</td>
                  <td className="px-4 py-2.5">{e.actor_email ?? "—"}</td>
                  <td className="px-4 py-2.5 font-semibold">{e.action}</td>
                  <td className="px-4 py-2.5 text-slate-600">{e.entity}{e.entity_id ? ` · ${e.entity_id.slice(0, 12)}` : ""}</td>
                  <td className="px-4 py-2.5 text-slate-500">{e.ip ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-8 text-center text-sm text-slate-600">No events yet.</p>}
        </div>
      )}
    </div>
  );
}
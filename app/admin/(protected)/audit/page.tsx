import { requireAdmin } from "@/lib/server/admin-auth";
import { safeSelect } from "@/lib/server/admin-api";

export const metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

type AuditEvent = {
  id: string;
  at: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  detail: unknown;
  ip: string | null;
};

function detailText(detail: unknown) {
  if (detail == null) return "—";
  try {
    const value = typeof detail === "string" ? detail : JSON.stringify(detail);
    return value.length > 220 ? value.slice(0, 217) + "…" : value;
  } catch {
    return "Details unavailable";
  }
}

export default async function AuditLogPage() {
  await requireAdmin("audit");
  const rows = await safeSelect<AuditEvent>(
    "admin_audit_events?select=id,at,actor_email,actor_role,action,entity,entity_id,detail,ip&order=at.desc&limit=250",
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-slate-950">Audit log</h1>
        <p className="mt-1 text-sm text-slate-600">Recent administrative and system actions, newest first. Up to 250 events are shown.</p>
      </div>
      {rows === null ? (
        <p role="alert" className="rounded-2xl bg-amber-50 p-5 text-sm font-semibold text-amber-900">
          The audit log could not be loaded. Check database connectivity and the admin_audit_events migration.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          No audit events have been recorded yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">IP address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((event) => (
                <tr key={event.id} className="align-top hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {event.at ? new Date(event.at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{event.actor_email || "System"}</p>
                    <p className="text-xs text-slate-500">{event.actor_role || "—"}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{event.action}</td>
                  <td className="px-4 py-3">
                    <p>{event.entity || "—"}</p>
                    {event.entity_id && <p className="break-all text-xs text-slate-500">{event.entity_id}</p>}
                  </td>
                  <td className="max-w-md break-words px-4 py-3 text-xs text-slate-600">{detailText(event.detail)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{event.ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

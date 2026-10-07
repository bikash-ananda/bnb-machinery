"use client";

import { useState, type FormEvent } from "react";
import { ROLES, ROLE_LABEL, type AdminRole } from "@/lib/admin/access";

export type AdminUserRow = { id: string; email: string; name: string; role: AdminRole; active: boolean; must_change_password: boolean; last_login_at: string | null };

export default function UsersManager({ initial, selfId }: { initial: AdminUserRow[]; selfId: string }) {
  const [users, setUsers] = useState(initial);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AdminRole>("SALES_STAFF");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(method: "POST" | "PATCH", body: unknown) {
    const r = await fetch("/api/admin/users", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: r.ok, d: (await r.json()) as { error?: string; tempPassword?: string } };
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { ok, d } = await call("POST", { email, name, role });
    setBusy(false);
    if (!ok) return setMsg({ ok: false, text: d.error ?? "Failed." });
    setMsg({ ok: true, text: `Created ${email}. Temporary password (shown once, share it privately): ${d.tempPassword}` });
    setEmail(""); setName("");
    window.setTimeout(() => window.location.reload(), 8000);
  }

  async function act(id: string, action: "activate" | "deactivate" | "reset") {
    setMsg(null);
    const { ok, d } = await call("PATCH", { id, action });
    if (!ok) return setMsg({ ok: false, text: d.error ?? "Failed." });
    if (action === "reset") return setMsg({ ok: true, text: `New temporary password (shown once): ${d.tempPassword}` });
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, active: action === "activate" } : x)));
  }

  const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500";
  return (
    <div className="space-y-6">
      <form onSubmit={create} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-4">
        <label className="text-sm font-semibold">Email<input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="text-sm font-semibold">Name<input className={field} value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label className="text-sm font-semibold">Role
          <select className={field} value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></label>
        <div className="flex items-end"><button type="submit" disabled={busy} className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60">Create user</button></div>
      </form>
      {msg && <p role="status" className={`break-words rounded-lg px-4 py-3 text-sm font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Last login</th><th className="px-4 py-3" /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3"><b>{u.name}</b><br /><span className="text-xs text-slate-500">{u.email}</span></td>
                <td className="px-4 py-3">{ROLE_LABEL[u.role]}</td>
                <td className="px-4 py-3">{u.active ? (u.must_change_password ? "Active · must change password" : "Active") : "Deactivated"}</td>
                <td className="px-4 py-3 text-slate-600">{u.last_login_at ? new Date(u.last_login_at).toLocaleString("en-GB", { timeZone: "Asia/Kathmandu" }) : "Never"}</td>
                <td className="px-4 py-3 text-right">
                  {u.id !== selfId && (
                    <span className="inline-flex gap-2">
                      <button type="button" onClick={() => act(u.id, "reset")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold hover:bg-slate-100">Reset password</button>
                      <button type="button" onClick={() => act(u.id, u.active ? "deactivate" : "activate")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold hover:bg-slate-100">{u.active ? "Deactivate" : "Activate"}</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
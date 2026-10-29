"use client";

import { useState, type FormEvent } from "react";
import { ROLES, ROLE_LABEL, type AdminRole } from "@/lib/admin/access";

export type AdminUserRow = { id: string; email: string; name: string; role: AdminRole; active: boolean; must_change_password: boolean; last_login_at: string | null };

type ApiResponse = { ok?: boolean; error?: string; tempPassword?: string; role?: AdminRole };

export default function UsersManager({
  initial,
  selfId,
  actorRole,
}: {
  initial: AdminUserRow[];
  selfId: string;
  actorRole: AdminRole;
}) {
  const [users, setUsers] = useState(initial);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AdminRole>("SALES_STAFF");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [roleChanges, setRoleChanges] = useState<Record<string, AdminRole>>({});

  const assignableRoles = ROLES.filter((r) =>
    actorRole === "SUPER_ADMIN" ? true : r !== "SUPER_ADMIN" && r !== "BUSINESS_OWNER",
  );

  async function call(method: "POST" | "PATCH", body: unknown) {
    const r = await fetch("/api/admin/users", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let d: ApiResponse = {};
    try {
      d = (await r.json()) as ApiResponse;
    } catch {
      d = { error: "The server returned an unreadable response." };
    }
    return { ok: r.ok, d };
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const { ok, d } = await call("POST", { email, name, role });
      if (!ok) {
        setMsg({ ok: false, text: d.error ?? "Could not create the account." });
        return;
      }
      setMsg({
        ok: true,
        text: `Created ${email}. Temporary password (shown once; share it privately): ${d.tempPassword ?? "Not returned—contact the Super Admin before sharing login details."}`,
      });
      setEmail("");
      setName("");
      window.setTimeout(() => window.location.reload(), 8000);
    } catch {
      setMsg({ ok: false, text: "Network error while creating the account. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  async function act(user: AdminUserRow, action: "activate" | "deactivate" | "reset") {
    setMsg(null);
    setBusyUserId(user.id);
    try {
      const { ok, d } = await call("PATCH", { id: user.id, action });
      if (!ok) {
        setMsg({ ok: false, text: d.error ?? "Could not update the account." });
        return;
      }
      if (action === "reset") {
        setMsg({
          ok: true,
          text: `Temporary password for ${user.email} (shown once; share it privately): ${d.tempPassword ?? "Not returned—contact the Super Admin before sharing login details."}`,
        });
        return;
      }
      setUsers((current) =>
        current.map((u) => (u.id === user.id ? { ...u, active: action === "activate" } : u)),
      );
      setMsg({ ok: true, text: action === "deactivate" ? `Deactivated ${user.email}.` : `Activated ${user.email}.` });
    } catch {
      setMsg({ ok: false, text: "Network error while updating the account. Please try again." });
    } finally {
      setBusyUserId(null);
    }
  }

  async function saveRole(user: AdminUserRow) {
    const nextRole = roleChanges[user.id] ?? user.role;
    if (nextRole === user.role) return;
    setMsg(null);
    setBusyUserId(user.id);
    try {
      const { ok, d } = await call("PATCH", { id: user.id, action: "set-role", role: nextRole });
      if (!ok) {
        setMsg({ ok: false, text: d.error ?? "Could not change the account role." });
        return;
      }
      setUsers((current) => current.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u)));
      setRoleChanges((current) => {
        const next = { ...current };
        delete next[user.id];
        return next;
      });
      setMsg({ ok: true, text: `Updated ${user.email} to ${ROLE_LABEL[nextRole]}.` });
    } catch {
      setMsg({ ok: false, text: "Network error while changing the role. Please try again." });
    } finally {
      setBusyUserId(null);
    }
  }

  const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500";

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-4">
        <label className="text-sm font-semibold">
          Email
          <input className={field} type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="text-sm font-semibold">
          Name
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
        </label>
        <label className="text-sm font-semibold">
          Role
          <select className={field} value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
            {assignableRoles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60">
            {busy ? "Creating…" : "Create user"}
          </button>
        </div>
      </form>

      {msg && <p role="status" aria-live="polite" className={`break-words rounded-lg px-4 py-3 text-sm font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const canManage = u.id !== selfId && (
                actorRole === "SUPER_ADMIN" ||
                (actorRole === "BUSINESS_OWNER" && u.role !== "SUPER_ADMIN" && u.role !== "BUSINESS_OWNER")
              );
              return (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <b>{u.name}</b><br />
                    <span className="text-xs text-slate-500">{u.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    {actorRole === "SUPER_ADMIN" && u.id !== selfId ? (
                      <div className="flex min-w-40 flex-col gap-2">
                        <select aria-label={`Role for ${u.email}`} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs" value={roleChanges[u.id] ?? u.role} disabled={busyUserId !== null || busy} onChange={(e) => setRoleChanges((current) => ({ ...current, [u.id]: e.target.value as AdminRole }))}>
                          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                        </select>
                        {(roleChanges[u.id] ?? u.role) !== u.role && (
                          <button type="button" disabled={busyUserId !== null || busy} onClick={() => saveRole(u)} className="self-start rounded-lg border border-amber-400 px-2 py-1 text-xs font-bold text-amber-900 hover:bg-amber-50 disabled:opacity-50">
                            Save role
                          </button>
                        )}
                      </div>
                    ) : (ROLE_LABEL[u.role] ?? u.role)}
                  </td>
                  <td className="px-4 py-3">{u.active ? (u.must_change_password ? "Active · must change password" : "Active") : "Deactivated"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString("en-GB", { timeZone: "Asia/Kathmandu" }) : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage ? (
                      <span className="inline-flex gap-2">
                        <button type="button" disabled={busyUserId !== null || busy} onClick={() => act(u, "reset")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold hover:bg-slate-100 disabled:opacity-50">
                          {busyUserId === u.id ? "Working…" : "Reset password"}
                        </button>
                        <button type="button" disabled={busyUserId !== null || busy} onClick={() => act(u, u.active ? "deactivate" : "activate")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold hover:bg-slate-100 disabled:opacity-50">
                          {u.active ? "Deactivate" : "Activate"}
                        </button>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">{u.id === selfId ? "Your account" : "Restricted"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No staff accounts found.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Deactivation preserves account history. Temporary passwords are displayed only in this response; share them securely and ask the staff member to change the password after signing in.</p>
    </div>
  );
}

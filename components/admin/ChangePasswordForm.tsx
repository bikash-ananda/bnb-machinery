"use client";

import { useState, type FormEvent } from "react";
import { passwordProblem } from "@/lib/admin/access";

export default function ChangePasswordForm({ email, forced }: { email: string; forced: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem = passwordProblem(next, email);
    if (problem) return setErr(problem);
    if (next !== again) return setErr("The two new passwords do not match.");
    setErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/admin/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current, next }) });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) { setErr(d.error ?? "Could not change the password."); setBusy(false); return; }
      window.location.assign("/admin");
    } catch {
      setErr("Network error. Please try again.");
      setBusy(false);
    }
  }

  const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200";
  return (
    <form onSubmit={submit} className="relative w-full max-w-md space-y-5 rounded-3xl bg-white p-8 shadow-2xl" noValidate>
      <div>
        <h1 className="text-2xl font-black text-slate-950">{forced ? "Choose a new password" : "Change password"}</h1>
        {forced && <p className="mt-1 text-sm text-slate-600">Your temporary password must be replaced before you can continue.</p>}
      </div>
      <label className="block text-sm font-semibold text-slate-700">Current password
        <input className={field} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></label>
      <label className="block text-sm font-semibold text-slate-700">New password
        <input className={field} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required /></label>
      <label className="block text-sm font-semibold text-slate-700">Repeat new password
        <input className={field} type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} required /></label>
      <p className="text-xs text-slate-500">At least 10 characters with an uppercase letter, a lowercase letter and a number.</p>
      {err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60">{busy ? "Saving…" : "Save new password"}</button>
    </form>
  );
}
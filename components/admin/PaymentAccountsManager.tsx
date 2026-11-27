"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Account = { id: string; label: string; method: string; payeeName: string; accountNo: string | null; instructions: string | null; active: boolean; hasQr: boolean };
const METHODS = ["QR", "BANK", "ESEWA", "KHALTI"] as const;

export default function PaymentAccountsManager() {
  const [rows, setRows] = useState<Account[]>([]);
  const [label, setLabel] = useState(""); const [method, setMethod] = useState<(typeof METHODS)[number]>("QR");
  const [payeeName, setPayeeName] = useState(""); const [accountNo, setAccountNo] = useState(""); const [instructions, setInstructions] = useState("");
  const [qr, setQr] = useState<{ mime: string; data: string } | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const response = await fetch("/api/admin/payment-accounts", { cache: "no-store" }); const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load payment accounts."); setRows(data.accounts ?? []);
  }, []);
  useEffect(() => { void load().catch((e) => setError(e instanceof Error ? e.message : "Could not load payment accounts.")); }, [load]);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/payment-accounts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ label, method, payeeName, accountNo, instructions, qr }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not save payment account.");
      setLabel(""); setPayeeName(""); setAccountNo(""); setInstructions(""); setQr(null); setMessage("Payment account saved."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save payment account."); }
    finally { setBusy(false); }
  }
  async function toggle(row: Account) {
    setBusy(true); setError("");
    try { const response = await fetch("/api/admin/payment-accounts", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: row.id, active: !row.active }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not update account."); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not update account."); } finally { setBusy(false); }
  }
  async function chooseQr(file?: File) {
    setQr(null); if (!file) return;
    if (file.size > 300 * 1024) { setError("QR image must be 300 KB or smaller."); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setError("Use a PNG, JPEG or WebP QR image."); return; }
    const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read QR image.")); reader.onerror = () => reject(new Error("Could not read QR image.")); reader.readAsDataURL(file); });
    setQr({ mime: file.type, data });
  }
  return <section className="space-y-4">
    <div><h2 className="text-lg font-black">Payment accounts</h2><p className="text-sm text-slate-600">Only add verified B&amp;B-owned merchant accounts. No sample account details are prefilled.</p></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}{message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    <form onSubmit={submit} className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-2">
      <label className="text-sm font-semibold">Account label<input required minLength={2} maxLength={60} value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="e.g. Main bank QR" /></label>
      <label className="text-sm font-semibold">Method<select value={method} onChange={(e) => setMethod(e.target.value as (typeof METHODS)[number])} className="mt-1 w-full rounded-lg border px-3 py-2">{METHODS.map((m) => <option key={m}>{m}</option>)}</select></label>
      <label className="text-sm font-semibold">Verified payee name<input required minLength={2} maxLength={120} value={payeeName} onChange={(e) => setPayeeName(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
      <label className="text-sm font-semibold">Account number / wallet ID (optional)<input maxLength={60} value={accountNo} onChange={(e) => setAccountNo(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>
      <label className="text-sm font-semibold md:col-span-2">Customer instructions (optional)<textarea maxLength={500} value={instructions} onChange={(e) => setInstructions(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" rows={2} /></label>
      <label className="text-sm font-semibold md:col-span-2">Merchant QR image (PNG/JPEG/WebP, max 300 KB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => void chooseQr(e.target.files?.[0]).catch((x) => setError(x instanceof Error ? x.message : "Could not read QR image."))} className="mt-1 block w-full text-sm" />{qr && <span className="mt-1 block text-xs text-emerald-700">QR image selected.</span>}</label>
      <button disabled={busy} className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "Saving…" : "Add payment account"}</button>
    </form>
    <div className="overflow-x-auto rounded-xl border bg-white"><table className="min-w-[680px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Account</th><th className="p-3">Payee</th><th className="p-3">Account / wallet</th><th className="p-3">QR</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.id}><td className="p-3"><b>{row.label}</b><p className="text-xs text-slate-500">{row.method}</p></td><td className="p-3">{row.payeeName}</td><td className="p-3">{row.accountNo || "—"}</td><td className="p-3">{row.hasQr ? "Uploaded" : "Not set"}</td><td className="p-3">{row.active ? "Active" : "Disabled"}</td><td className="p-3"><button type="button" disabled={busy} onClick={() => void toggle(row)} className="rounded-lg border px-3 py-1.5 text-xs font-bold">{row.active ? "Disable" : "Activate"}</button></td></tr>)}{rows.length===0&&<tr><td colSpan={6} className="p-5 text-center text-slate-500">No payment accounts configured.</td></tr>}</tbody></table></div>
  </section>;
}

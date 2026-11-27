"use client";

import { useCallback, useEffect, useState } from "react";
import { formatNPR } from "@/src/lib/money";

type Submission = {
  id: string; orderNo: string; customerName: string; phone: string; method: string; txnId: string;
  accountLabel: string | null; totalPaisa: string; paidPaisa: string; duePaisa: string; createdAt: string;
};

export default function PaymentVerificationQueue() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/payments", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load payment submissions.");
      setRows(data.submissions ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load payment submissions."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/payments", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load payment submissions.");
        if (active) setRows(data.submissions ?? []);
      })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : "Could not load payment submissions."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function review(id: string, action: "verify" | "reject") {
    setBusy(id); setError(""); setMessage("");
    try {
      const body = action === "verify" ? { action, amount: amounts[id] ?? "" } : { action, reason: reasons[id] ?? "" };
      const response = await fetch(`/api/admin/payments/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Payment review failed.");
      setMessage(action === "verify" ? "Payment verified and posted to the sales/accounting ledger." : "Payment claim rejected.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Payment review failed."); }
    finally { setBusy(null); }
  }

  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">Manual payment verification</h2><p className="text-sm text-slate-600">Customer references are claims only. Check the actual bank/wallet statement before verifying.</p></div><button type="button" onClick={() => void load()} className="rounded-lg border px-3 py-2 text-sm font-bold">Refresh</button></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {loading ? <p className="rounded-xl border bg-white p-5 text-sm text-slate-500">Loading payment queue…</p> : rows.length === 0 ? <p className="rounded-xl border border-dashed bg-white p-7 text-center text-sm text-slate-600">No payment claims are waiting for review.</p> : rows.map((row) => <article key={row.id} className="space-y-3 rounded-2xl border bg-white p-4">
      <div className="flex flex-wrap justify-between gap-3"><div><p className="font-black">{row.orderNo} · {row.customerName}</p><p className="text-sm text-slate-600">{row.phone} · {row.method}{row.accountLabel ? ` · ${row.accountLabel}` : ""}</p><p className="mt-1 text-xs text-slate-500">Submitted {new Date(row.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Kathmandu" })}</p></div><div className="text-right text-sm"><p>Due: <b>{formatNPR(BigInt(row.duePaisa))}</b></p><p className="text-xs text-slate-500">Order total {formatNPR(BigInt(row.totalPaisa))} · Paid {formatNPR(BigInt(row.paidPaisa))}</p></div></div>
      <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">Customer transaction reference</p><p className="mt-1 break-all font-mono font-bold">{row.txnId}</p></div>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
        <label className="text-sm font-semibold">Amount actually received (NPR)<input type="number" min="0.01" step="0.01" value={amounts[row.id] ?? ""} onChange={(e) => setAmounts((s) => ({ ...s, [row.id]: e.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Confirm from bank statement" /></label>
        <label className="text-sm font-semibold">Rejection reason (if rejecting)<input value={reasons[row.id] ?? ""} onChange={(e) => setReasons((s) => ({ ...s, [row.id]: e.target.value.slice(0, 200) }))} className="mt-1 w-full rounded-lg border px-3 py-2" maxLength={200} /></label>
        <button type="button" disabled={busy !== null || !(Number(amounts[row.id]) > 0)} onClick={() => void review(row.id, "verify")} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy === row.id ? "Working…" : "Verify & post"}</button>
        <button type="button" disabled={busy !== null || (reasons[row.id] ?? "").trim().length < 3} onClick={() => void review(row.id, "reject")} className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50">Reject</button>
      </div>
    </article>)}
  </section>;
}

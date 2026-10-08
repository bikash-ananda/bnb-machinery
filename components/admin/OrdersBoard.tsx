"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BoardOrder } from "@/src/modules/sales/queries";

const rs = (p: string) => "Rs " + (Number(p) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const tone: Record<string, string> = { NEW: "bg-amber-100 text-amber-800", CONFIRMED: "bg-sky-100 text-sky-800", DISPATCHED: "bg-indigo-100 text-indigo-800", READY_FOR_PICKUP: "bg-indigo-100 text-indigo-800", COMPLETED: "bg-emerald-100 text-emerald-800", CANCELLED: "bg-slate-200 text-slate-600" };
const METHODS = ["CASH", "QR", "ESEWA", "KHALTI", "CARD", "BANK"];

export default function OrdersBoard({ initial }: { initial: BoardOrder[] }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [method, setMethod] = useState("CASH");

  async function act(id: string, body: Record<string, string>) {
    setBusy(id); setErr("");
    try {
      const r = await fetch(`/api/admin/orders/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(d.error ?? "Could not complete that action.");
      router.refresh();
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not complete that action."); }
    setBusy("");
  }

  if (initial.length === 0) return <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">No orders yet.</p>;
  return (
    <div className="space-y-3">
      {err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</p>}
      {initial.map((o) => {
        const num = o.phone.replace(/\D/g, "");
        const wa = num ? (num.length === 10 ? "977" + num : num) : "";
        const msg = encodeURIComponent(`Machinery Tools Nepal: your order ${o.orderNo} is ${o.status.replace(/_/g, " ").toLowerCase()}. Total ${rs(o.totalPaisa)}.${o.invoiceNo ? " Invoice " + o.invoiceNo + "." : ""}`);
        const canPay = o.invoiceId && o.paymentStatus !== "PAID" && o.status !== "CANCELLED";
        return (
          <details key={o.id} className="rounded-2xl border border-slate-200 bg-white p-4" open={o.status === "NEW"}>
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
              <span className="flex flex-wrap items-center gap-3">
                <b>{o.orderNo}</b>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${tone[o.status] ?? ""}`}>{o.status.replace(/_/g, " ")}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{o.channel} / {o.paymentStatus}</span>
                <span className="text-sm text-slate-600">{o.customerName} {o.phone && "/ " + o.phone}</span>
              </span>
              <span className="text-sm font-bold">{rs(o.totalPaisa)}{o.unpriced ? ` + ${o.unpriced} unpriced` : ""}</span>
            </summary>
            <div className="mt-4 space-y-3 text-sm">
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                {o.items.map((i, k) => <li key={k} className="flex justify-between px-3 py-2"><span>{i.name} x {i.qty}</span><span>{rs(i.linePaisa)}</span></li>)}
              </ul>
              <p className="text-slate-600">{o.deliveryMethod === "pickup" ? "Pickup at shop" : "Delivery: " + (o.address ?? "no address")} / pays by {o.paymentMethod} / paid {rs(o.paidPaisa)}</p>
              <div className="flex flex-wrap items-center gap-2">
                {o.status === "NEW" && o.unpriced === 0 && <button type="button" disabled={busy === o.id} onClick={() => act(o.id, { action: "confirm" })} className="rounded-lg bg-amber-400 px-4 py-2 font-black text-slate-950 disabled:opacity-50">Confirm (stock + invoice + accounts)</button>}
                {o.status === "NEW" && o.unpriced > 0 && <span className="rounded-lg bg-amber-50 px-3 py-2 font-semibold text-amber-900">Needs prices before it can be confirmed</span>}
                {o.status === "NEW" && <button type="button" disabled={busy === o.id} onClick={() => act(o.id, { action: "cancel" })} className="rounded-lg border border-slate-300 px-4 py-2 font-bold">Cancel</button>}
                {o.status === "CONFIRMED" && (o.deliveryMethod === "pickup"
                  ? <button type="button" onClick={() => act(o.id, { action: "status", status: "READY_FOR_PICKUP" })} className="rounded-lg border border-slate-300 px-4 py-2 font-bold">Ready for pickup</button>
                  : <button type="button" onClick={() => act(o.id, { action: "status", status: "DISPATCHED" })} className="rounded-lg border border-slate-300 px-4 py-2 font-bold">Mark dispatched</button>)}
                {["CONFIRMED", "DISPATCHED", "READY_FOR_PICKUP"].includes(o.status) && <button type="button" onClick={() => act(o.id, { action: "status", status: "COMPLETED" })} className="rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white">Complete</button>}
                {canPay && (
                  <span className="flex items-center gap-1">
                    <select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Payment method" className="rounded-lg border border-slate-300 px-2 py-2">{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
                    <button type="button" disabled={busy === o.id} onClick={() => act(o.id, { action: "pay", method })} className="rounded-lg bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-50">Mark fully paid</button>
                  </span>
                )}
                {o.invoiceId && <a href={`/print/invoice/${o.invoiceId}`} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-4 py-2 font-bold">Invoice</a>}
                {wa && <a href={`https://wa.me/${wa}?text=${msg}`} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-50 px-4 py-2 font-bold text-emerald-800">WhatsApp customer</a>}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}

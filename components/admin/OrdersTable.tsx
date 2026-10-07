"use client";

import { useState } from "react";

export type AdminOrder = {
  id: string; order_no: string; created_at: string; status: string; customer_name: string; phone: string; email: string | null;
  address: string | null; district: string | null; delivery_method: string; payment_method: string; note: string | null;
  items: { name: string; qty: number; price: number | null }[]; subtotal: number; unpriced_items: number;
};
const STATUSES = ["NEW", "CONFIRMED", "DISPATCHED", "COMPLETED", "CANCELLED"];
const tone: Record<string, string> = { NEW: "bg-amber-100 text-amber-800", CONFIRMED: "bg-sky-100 text-sky-800", DISPATCHED: "bg-indigo-100 text-indigo-800", COMPLETED: "bg-emerald-100 text-emerald-800", CANCELLED: "bg-slate-200 text-slate-600" };

export default function OrdersTable({ initial }: { initial: AdminOrder[] }) {
  const [orders, setOrders] = useState(initial);
  const [err, setErr] = useState("");

  async function setStatus(id: string, status: string) {
    const before = orders;
    setErr("");
    setOrders((o) => o.map((x) => (x.id === id ? { ...x, status } : x)));
    try {
      const r = await fetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      if (!r.ok) throw new Error();
    } catch {
      setOrders(before);
      setErr("Could not update that order. Please try again.");
    }
  }

  if (orders.length === 0) return <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">No orders yet.</p>;
  return (
    <div className="space-y-3">
      {err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</p>}
      {orders.map((o) => (
        <details key={o.id} className="rounded-2xl border border-slate-200 bg-white p-4">
          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
            <span className="flex flex-wrap items-center gap-3">
              <b>{o.order_no}</b>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${tone[o.status] ?? ""}`}>{o.status}</span>
              <span className="text-sm text-slate-600">{o.customer_name} · {o.phone}</span>
            </span>
            <span className="text-sm font-bold">Rs {Number(o.subtotal).toLocaleString("en-IN")}{o.unpriced_items ? ` + ${o.unpriced_items} unpriced` : ""}</span>
          </summary>
          <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
            <div className="space-y-1 text-slate-700">
              <p><b>Placed:</b> {new Date(o.created_at).toLocaleString("en-GB", { timeZone: "Asia/Kathmandu" })}</p>
              <p><b>{o.delivery_method === "pickup" ? "Pickup from shop" : "Deliver to:"}</b> {o.delivery_method === "delivery" ? `${o.address ?? ""}, ${o.district ?? ""}` : ""}</p>
              <p><b>Payment:</b> {o.payment_method}</p>
              {o.email && <p><b>Email:</b> {o.email}</p>}
              {o.note && <p><b>Note:</b> {o.note}</p>}
            </div>
            <ul className="space-y-1">
              {o.items.map((it, i) => <li key={i} className="flex justify-between gap-3"><span>{it.name} × {it.qty}</span><span>{it.price !== null ? `Rs ${(it.price * it.qty).toLocaleString("en-IN")}` : "Price on request"}</span></li>)}
            </ul>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button key={s} type="button" disabled={s === o.status} onClick={() => setStatus(o.id, s)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold hover:bg-slate-100 disabled:bg-slate-900 disabled:text-white">{s}</button>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
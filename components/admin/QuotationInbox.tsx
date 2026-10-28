"use client";

import { useEffect, useState } from "react";

type Status = "NEW" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
type Quote = {
  id: string;
  reference: string;
  customerName: string;
  phone: string;
  email: string | null;
  customerType: string;
  deliveryDistrict: string | null;
  deliveryAddress: string | null;
  notes: string | null;
  channel: string;
  status: Status;
  assignedTo: string | null;
  createdAt: string;
  lines: { id: string; productName: string; sku: string | null; quantity: number }[];
};

const label: Record<Status, string> = { NEW: "New", IN_PROGRESS: "In progress", RESOLVED: "Resolved", CLOSED: "Closed" };
const dateTime = (value: string) => new Intl.DateTimeFormat("en-NP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function QuotationInbox() {
  const [requests, setRequests] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/quotations", { cache: "no-store" });
      if (!response.ok) throw new Error("Quotation requests could not be loaded.");
      const data = await response.json() as { requests: Quote[] };
      setRequests(data.requests);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quotation requests could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/quotations", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Quotation requests could not be loaded.");
        const data = await response.json() as { requests: Quote[] };
        if (active) setRequests(data.requests);
      })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "Quotation requests could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function updateStatus(requestId: string, status: Status) {
    const before = requests.find((request) => request.id === requestId);
    if (!before || before.status === status) return;
    setSaving(requestId);
    setError("");
    try {
      const response = await fetch("/api/admin/quotations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: requestId, status }),
      });
      if (!response.ok) throw new Error("The request status could not be updated.");
      setRequests((items) => items.map((request) => request.id === requestId ? { ...request, status } : request));
    } catch (e) {
      setError(e instanceof Error ? e.message : "The request status could not be updated.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-widest text-amber-700">Sales</p><h1 className="mt-1 text-2xl font-black text-slate-950">Quotation requests</h1><p className="mt-1 text-sm text-slate-600">Customer requests are saved for follow-up. Confirm price, stock and delivery before sending an offer.</p></div>
        <button type="button" onClick={() => void load()} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-50">Refresh</button>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
      {loading ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading requests…</p> : requests.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">No quotation requests yet.</p> : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs font-bold uppercase tracking-wide text-amber-800">{request.reference} · {request.channel}</p><h2 className="mt-1 text-lg font-black text-slate-950">{request.customerName}</h2><p className="text-sm text-slate-600">{request.customerType.toLowerCase()} · {dateTime(request.createdAt)}</p></div>
                <label className="text-xs font-bold text-slate-600">Request status<select value={request.status} disabled={saving === request.id || request.status === "CLOSED"} onChange={(event) => void updateStatus(request.id, event.target.value as Status)} className="mt-1 block min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900"><option value="NEW">{label.NEW}</option><option value="IN_PROGRESS">{label.IN_PROGRESS}</option><option value="RESOLVED">{label.RESOLVED}</option><option value="CLOSED">{label.CLOSED}</option></select></label>
              </div>
              <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-[1fr_1fr]">
                <div className="space-y-1 text-sm"><p><span className="font-bold">Phone:</span> <a href={`tel:${request.phone}`} className="underline decoration-slate-300 underline-offset-2">{request.phone}</a></p>{request.email && <p className="break-all"><span className="font-bold">Email:</span> <a href={`mailto:${request.email}`} className="underline decoration-slate-300 underline-offset-2">{request.email}</a></p>}<p><span className="font-bold">Delivery:</span> {[request.deliveryDistrict, request.deliveryAddress].filter(Boolean).join(", ") || "Confirm with customer"}</p></div>
                <div><h3 className="text-sm font-bold text-slate-800">Requested items</h3><ul className="mt-2 space-y-1 text-sm text-slate-700">{request.lines.map((line) => <li key={line.id}>{line.quantity} × {line.productName}{line.sku ? <span className="ml-1 text-xs text-slate-500">({line.sku})</span> : null}</li>)}</ul>{request.notes && <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{request.notes}</p>}</div>
              </div>
              {request.assignedTo && <p className="mt-3 text-xs text-slate-500">Assigned to {request.assignedTo}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

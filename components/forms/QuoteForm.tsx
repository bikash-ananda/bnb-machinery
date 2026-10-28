"use client";
import { useState } from "react";

export default function QuoteForm({ defaultItem = "" }: { defaultItem?: string }) {
  const [f, setF] = useState({ name: "", phone: "", item: defaultItem, msg: "" });
  const [err, setErr] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reference) return;
    if (f.name.trim().length < 2 || f.phone.replace(/\D/g, "").length < 7 || !f.item.trim()) {
      setErr("Please enter your name, a valid phone number and the item you need.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: f.name,
          phone: f.phone,
          items: [{ productName: f.item, quantity: 1 }],
          notes: f.msg,
          requestId: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : undefined,
        }),
      });
      const result = await response.json() as { reference?: string };
      if (!response.ok || !result.reference) throw new Error("Could not submit your request. Please try again or contact us by phone.");
      setReference(result.reference);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not submit your request. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200";
  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8" noValidate>
      <h2 className="text-2xl font-black text-slate-950">Request a quote</h2>
      {reference && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><p className="font-bold">Request received: {reference}</p><p className="mt-1">Our team will confirm current pricing and delivery.</p></div>}
      <label className="block text-sm font-semibold text-slate-700">Your name
        <input className={input} value={f.name} onChange={set("name")} autoComplete="name" required /></label>
      <label className="block text-sm font-semibold text-slate-700">Phone / WhatsApp
        <input className={input} value={f.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" required /></label>
      <label className="block text-sm font-semibold text-slate-700">Machine / part needed
        <input className={input} value={f.item} onChange={set("item")} placeholder="e.g. Power tiller, chainsaw chain" required /></label>
      <label className="block text-sm font-semibold text-slate-700">Details (optional)
        <textarea className={input} rows={3} value={f.msg} onChange={set("msg")} /></label>
      {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
      <button disabled={busy || !!reference} className="w-full rounded-xl bg-emerald-600 px-6 py-4 font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60">{busy ? "Sending…" : reference ? "Request submitted" : "Send quotation request"}</button>
      <p className="text-xs text-slate-500">Your contact details and request are saved so our team can reply. Do not include passwords, payment PINs or OTPs.</p>
    </form>
  );
}

"use client";
import { useState } from "react";
import { company } from "@/data/company";

export default function QuoteForm({ defaultItem = "" }: { defaultItem?: string }) {
  const [f, setF] = useState({ name: "", phone: "", item: defaultItem, msg: "" });
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2 || f.phone.replace(/\D/g, "").length < 7 || !f.item.trim()) {
      setErr("Please enter your name, a valid phone number and the item you need.");
      return;
    }
    setErr("");
    const text = `Hello Machinery Tools Nepal,\nName: ${f.name}\nPhone: ${f.phone}\nLooking for: ${f.item}\n${f.msg}`;
    window.open(`https://wa.me/977${company.contact.whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  const input = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200";
  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8" noValidate>
      <h2 className="text-2xl font-black text-slate-950">Request a quote</h2>
      <label className="block text-sm font-semibold text-slate-700">Your name
        <input className={input} value={f.name} onChange={set("name")} autoComplete="name" required /></label>
      <label className="block text-sm font-semibold text-slate-700">Phone / WhatsApp
        <input className={input} value={f.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" required /></label>
      <label className="block text-sm font-semibold text-slate-700">Machine / part needed
        <input className={input} value={f.item} onChange={set("item")} placeholder="e.g. Power tiller, chainsaw chain" required /></label>
      <label className="block text-sm font-semibold text-slate-700">Details (optional)
        <textarea className={input} rows={3} value={f.msg} onChange={set("msg")} /></label>
      {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
      <button className="w-full rounded-xl bg-emerald-600 px-6 py-4 font-bold text-white transition hover:bg-emerald-700">Send on WhatsApp →</button>
      <p className="text-xs text-slate-500">Opens WhatsApp with your message ready. Nothing is stored on our website.</p>
    </form>
  );
}

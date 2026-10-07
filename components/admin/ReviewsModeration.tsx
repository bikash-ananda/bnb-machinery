"use client";

import { useState } from "react";

export type PendingReview = { id: string; product_slug: string; name: string; rating: number; comment: string; created_at: string };

export default function ReviewsModeration({ initial }: { initial: PendingReview[] }) {
  const [list, setList] = useState(initial);
  const [err, setErr] = useState("");

  async function decide(id: string, status: "APPROVED" | "REJECTED") {
    setErr("");
    try {
      const r = await fetch("/api/admin/reviews", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      if (!r.ok) throw new Error();
      setList((l) => l.filter((x) => x.id !== id));
    } catch { setErr("Could not update that review. Please try again."); }
  }

  if (list.length === 0) return <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">No reviews waiting for approval.</p>;
  return (
    <div className="space-y-3">
      {err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{err}</p>}
      {list.map((r) => (
        <article key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-extrabold">{r.name} <span className="text-amber-500">{"★".repeat(r.rating)}<span className="text-slate-300">{"★".repeat(5 - r.rating)}</span></span></p>
            <a href={`/products/${r.product_slug}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-amber-700 hover:underline">{r.product_slug} ↗</a>
          </div>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{r.comment}</p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => decide(r.id, "APPROVED")} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">Approve</button>
            <button type="button" onClick={() => decide(r.id, "REJECTED")} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold hover:bg-slate-100">Reject</button>
          </div>
        </article>
      ))}
    </div>
  );
}
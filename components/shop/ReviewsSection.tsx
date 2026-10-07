"use client";

import { useState, type FormEvent } from "react";
import Stars from "@/components/shop/Stars";
import { useTr } from "@/lib/shop/tr";
import type { ReviewSummary } from "@/lib/shop/reviews";

export default function ReviewsSection({ slug, summary }: { slug: string; summary: ReviewSummary }) {
  const tr = useTr();
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2 || rating < 1 || comment.trim().length < 5) {
      setErr(tr("Please add your name, a star rating and a short comment.", "नाम, स्टार रेटिङ र छोटो टिप्पणी लेख्नुहोस्।"));
      return;
    }
    setErr("");
    setState("sending");
    try {
      const r = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name, rating, comment, website }),
      });
      if (r.ok) { setState("done"); return; }
      setErr(r.status === 429 ? tr("Too many attempts. Please wait a minute.", "धेरै प्रयास भयो। एक मिनेट पर्खनुहोस्।") : tr("Could not send your review. Please try again.", "समीक्षा पठाउन सकिएन। फेरि प्रयास गर्नुहोस्।"));
      setState("error");
    } catch {
      setErr(tr("Could not send your review. Please try again.", "समीक्षा पठाउन सकिएन। फेरि प्रयास गर्नुहोस्।"));
      setState("error");
    }
  }

  const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200";

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        {summary.count > 0 ? (
          <>
            <p className="text-5xl font-black text-slate-950">{summary.avg.toFixed(1)}</p>
            <Stars value={summary.avg} size="text-2xl" />
            <p className="mt-1 text-sm text-slate-500">{summary.count} {tr("review(s)", "समीक्षा")}</p>
            <div className="mt-4 space-y-1.5">
              {[5, 4, 3, 2, 1].map((s) => (
                <div key={s} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="w-3">{s}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full bg-amber-400" style={{ width: `${(summary.dist[s - 1] / summary.count) * 100}%` }} /></span>
                  <span className="w-6 text-right">{summary.dist[s - 1]}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">{tr("No reviews yet. Be the first to share your experience.", "अहिलेसम्म समीक्षा छैन। पहिलो समीक्षा तपाईंले लेख्नुहोस्।")}</p>
        )}
      </div>

      <div className="space-y-6">
        {summary.items.map((r) => (
          <article key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-extrabold text-slate-950">{r.name}</p>
              <time className="text-xs text-slate-500" dateTime={r.created_at}>{new Date(r.created_at).toLocaleDateString("en-GB", { timeZone: "UTC" })}</time>
            </div>
            <Stars value={r.rating} />
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{r.comment}</p>
          </article>
        ))}

        {summary.enabled && (
          state === "done" ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-800">
              {tr("Thank you! Your review will appear after our team approves it.", "धन्यवाद! हाम्रो टोलीले स्वीकृत गरेपछि तपाईंको समीक्षा देखिनेछ।")}
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6" noValidate>
              <h3 className="text-lg font-black">{tr("Write a review", "समीक्षा लेख्नुहोस्")}</h3>
              <div>
                <p className="text-sm font-semibold text-slate-700">{tr("Your rating", "तपाईंको रेटिङ")}</p>
                <div className="mt-1 flex gap-1" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} type="button" role="radio" aria-checked={rating === s} aria-label={`${s} star`} onClick={() => setRating(s)} className={`text-3xl leading-none transition ${s <= rating ? "text-amber-400" : "text-slate-300 hover:text-amber-200"}`}>★</button>
                  ))}
                </div>
              </div>
              <label className="block text-sm font-semibold text-slate-700">{tr("Your name", "तपाईंको नाम")}
                <input className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" /></label>
              <label className="block text-sm font-semibold text-slate-700">{tr("Your comment", "तपाईंको टिप्पणी")}
                <textarea className={field} rows={4} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} /></label>
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
              </div>
              {err && <p role="alert" className="text-sm font-semibold text-red-600">{err}</p>}
              <button type="submit" disabled={state === "sending"} className="rounded-xl bg-amber-400 px-6 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:opacity-60">
                {state === "sending" ? tr("Sending…", "पठाउँदै…") : tr("Submit review", "समीक्षा पठाउनुहोस्")}
              </button>
            </form>
          )
        )}
      </div>
    </div>
  );
}
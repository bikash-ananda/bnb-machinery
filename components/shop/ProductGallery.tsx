"use client";

import { useState, type PointerEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SafeImage from "@/components/ui/SafeImage";

export default function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const list = images.length ? images : [""];
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const go = (d: number) => setI((n) => (n + d + list.length) % list.length);

  function move(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  }

  const nav = "absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow hover:bg-white";

  return (
    <div className="space-y-3" onKeyDown={(e) => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); }}>
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" onPointerMove={move} onPointerLeave={() => setZoom(null)}>
        <div style={{ transform: zoom ? "scale(1.9)" : "scale(1)", transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : "center", transition: "transform 0.25s ease-out" }}>
          <SafeImage src={list[i]} alt={`${alt} ${i + 1}`} contain className="aspect-[4/3] w-full p-6" />
        </div>
        {list.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous image" className={`${nav} left-3`}><ChevronLeft size={20} /></button>
            <button type="button" onClick={() => go(1)} aria-label="Next image" className={`${nav} right-3`}><ChevronRight size={20} /></button>
            <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-bold text-white">{i + 1} / {list.length}</span>
          </>
        )}
      </div>
      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {list.map((src, n) => (
            <button key={src + n} type="button" onClick={() => setI(n)} aria-label={`Show image ${n + 1}`} aria-pressed={i === n}
              className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition ${i === n ? "border-amber-400" : "border-slate-200 hover:border-amber-200"}`}>
              <SafeImage src={src} alt="" contain className="h-full w-full p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
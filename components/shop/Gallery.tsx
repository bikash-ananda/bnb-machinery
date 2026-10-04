"use client";

import { useState } from "react";
import SafeImage from "@/components/ui/SafeImage";

export default function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const list = images.length ? images : [""];
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <SafeImage src={list[i]} alt={`${alt} ${i + 1}`} contain className="aspect-[4/3] w-full p-4" />
      </div>
      {list.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {list.map((src, n) => (
            <button key={src + n} type="button" onClick={() => setI(n)} aria-label={`Show image ${n + 1}`} aria-pressed={i === n}
              className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white ${i === n ? "border-amber-400" : "border-slate-200"}`}>
              <SafeImage src={src} alt="" contain className="h-full w-full p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

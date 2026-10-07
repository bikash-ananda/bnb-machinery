"use client";

import { useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import { useTr } from "@/lib/shop/tr";

function ytId(u: string): string | null {
  try {
    const x = new URL(u);
    const h = x.hostname.replace(/^www\./, "");
    let id: string | null = null;
    if (h === "youtu.be") id = x.pathname.slice(1);
    else if (h.endsWith("youtube.com")) {
      if (x.pathname === "/watch") id = x.searchParams.get("v");
      else id = x.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/)?.[1] ?? null;
    }
    return id && /^[\w-]{6,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export default function VideoList({ videos }: { videos: string[] }) {
  const tr = useTr();
  const [playing, setPlaying] = useState<string | null>(null);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {videos.map((u) => {
        const id = ytId(u);
        if (!id) {
          return (
            <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 font-bold text-slate-800 hover:border-amber-400">
              <span className="truncate">{tr("Watch video", "भिडियो हेर्नुहोस्")} · {new URL(u).hostname}</span>
              <ExternalLink size={18} aria-hidden="true" />
            </a>
          );
        }
        return (
          <div key={u} className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
            {playing === id ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
                title="Product video"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <button type="button" onClick={() => setPlaying(id)} aria-label={tr("Play video", "भिडियो चलाउनुहोस्")} className="group absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100" />
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-xl transition group-hover:scale-110"><Play size={26} fill="currentColor" /></span>
                </span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
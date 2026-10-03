"use client";
import { useState } from "react";

/** Plain <img> that shows a branded placeholder if the link is missing or broken. */
export default function SafeImage({
  src, alt, className = "", contain = false,
}: { src: string; alt: string; className?: string; contain?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src)
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-4xl ${className}`} role="img" aria-label={alt}>
        {"\u2699\uFE0F"}
      </div>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}
      className={`${contain ? "object-contain" : "object-cover"} ${className}`} />
  );
}
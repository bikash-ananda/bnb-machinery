"use client";

import { useEffect } from "react";

/** 3D tilt + glare for any element with a data-tilt attribute. Mouse devices only; respects reduced motion. */
export default function TiltProvider() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover)").matches) return;
    let current: HTMLElement | null = null;
    const reset = (t: HTMLElement) => {
      t.style.setProperty("--rx", "0deg");
      t.style.setProperty("--ry", "0deg");
    };
    const onMove = (e: PointerEvent) => {
      const t = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (current && current !== t) reset(current);
      current = t;
      if (!t) return;
      const r = t.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      t.style.setProperty("--ry", `${(px - 0.5) * 10}deg`);
      t.style.setProperty("--rx", `${(0.5 - py) * 10}deg`);
      t.style.setProperty("--gx", `${px * 100}%`);
      t.style.setProperty("--gy", `${py * 100}%`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);
  return null;
}
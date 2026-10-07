"use client";

import { useEffect, useRef, useState } from "react";

export type Slide = { src: string; alt: string };

const FX = ["fx-zoom-in", "fx-pan-left", "fx-zoom-out", "fx-pan-right", "fx-drift", "fx-pan-up"];
const HOLD = [7000, 9000, 6500, 8500, 7500, 9500]; // different time on each photo
const PALETTE = {
  dark: { fg: "#ffffff", muted: "#e2e8f0", accent: "#fbbf24", rgb: "7,17,31" },
  light: { fg: "#0b1b33", muted: "#1e293b", accent: "#92400e", rgb: "255,255,255" },
};

const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const L_DARK = lum(7, 17, 31);
const L_NAVY_TEXT = lum(11, 27, 51);

type Tone = { dark: boolean; alpha: number };

/** Brightness (0..1) of the area where the text sits: 80th percentile of the left 65% of the photo. */
function sample(src: string): Promise<number | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 24;
        c.height = 24;
        const ctx = c.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, img.naturalHeight * 0.1, img.naturalWidth * 0.65, img.naturalHeight * 0.8, 0, 0, 24, 24);
        const d = ctx.getImageData(0, 0, 24, 24).data;
        const ls: number[] = [];
        for (let k = 0; k < d.length; k += 4) ls.push(lum(d[k], d[k + 1], d[k + 2]));
        ls.sort((a, b) => a - b);
        resolve(ls[Math.floor(ls.length * 0.8)]);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Chooses white or dark text and the weakest scrim that still gives at least 4.5:1 contrast (WCAG AA). */
function pickTone(p: number | null): Tone {
  if (p === null) return { dark: true, alpha: 0.62 };
  const steps = [0.45, 0.55, 0.65, 0.75, 0.85];
  let best: Tone | null = null;
  for (const a of steps) {
    if (1.05 / ((1 - a) * p + a * L_DARK + 0.05) >= 4.5) { best = { dark: true, alpha: a }; break; }
  }
  for (const a of steps) {
    if (((1 - a) * p + a + 0.05) / (L_NAVY_TEXT + 0.05) >= 4.5) {
      if (!best || a < best.alpha) best = { dark: false, alpha: a };
      break;
    }
  }
  return best ?? { dark: true, alpha: 0.85 };
}

/**
 * Photo slideshow for a hero section. Put it as the FIRST child of a `relative` section.
 * It also sets --hero-fg / --hero-muted / --hero-accent on that section so the text colour follows the photo.
 */
export default function HeroBackdrop({ slides }: { slides: Slide[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [p, setP] = useState<(number | null)[]>([]);
  const n = slides.length;
  const key = slides.map((s) => s.src).join("|");

  useEffect(() => {
    let live = true;
    slides.forEach((s, k) => {
      sample(s.src).then((v) => {
        if (live) setP((a) => { const b = [...a]; b[k] = v; return b; });
      });
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (n < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    new Image().src = slides[(i + 1) % n].src; // preload the next photo
    const t = setTimeout(() => { setPrev(i); setI((i + 1) % n); }, HOLD[i % HOLD.length]);
    return () => clearTimeout(t);
  }, [i, n, slides]);

  const tone = pickTone(p[i] ?? null);

  useEffect(() => {
    const el = root.current?.parentElement;
    if (!el) return;
    const pal = tone.dark ? PALETTE.dark : PALETTE.light;
    el.style.setProperty("--hero-fg", pal.fg);
    el.style.setProperty("--hero-muted", pal.muted);
    el.style.setProperty("--hero-accent", pal.accent);
  }, [tone.dark]);

  function go(k: number) {
    if (k === i) return;
    setPrev(i);
    setI(k);
  }

  if (n === 0) return null;
  const shown = prev !== null && prev !== i ? [prev, i] : [i];

  return (
    <div ref={root} className="pointer-events-none absolute inset-0 overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0">
        {shown.map((k) => (
          <div
            key={k}
            className="absolute inset-0"
            style={{ opacity: k === i ? 1 : 0, transition: "opacity 1400ms ease", animation: k === i ? "hero-in 1400ms ease" : undefined }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slides[k].src}
              alt=""
              decoding="async"
              className={`h-full w-full object-cover ${FX[k % FX.length]}`}
              style={{ animationDuration: `${HOLD[k % HOLD.length] + 2600}ms` }}
            />
          </div>
        ))}
        {(["dark", "light"] as const).map((k) => {
          const rgb = PALETTE[k].rgb;
          const a = tone.alpha;
          return (
            <div
              key={k}
              className="absolute inset-0"
              style={{
                opacity: (k === "dark") === tone.dark ? 1 : 0,
                transition: "opacity 900ms ease",
                background: `linear-gradient(90deg, rgba(${rgb},${a}) 0%, rgba(${rgb},${(a * 0.85).toFixed(2)}) 55%, rgba(${rgb},${(a * 0.45).toFixed(2)}) 100%)`,
              }}
            />
          );
        })}
      </div>
      {n > 1 && (
        <div className="pointer-events-auto absolute bottom-4 right-6 z-20 flex items-center gap-2" role="group" aria-label="Background photos">
          {slides.map((s, k) => (
            <button
              key={s.src}
              type="button"
              onClick={() => go(k)}
              aria-label={`Show photo ${k + 1}: ${s.alt}`}
              aria-current={k === i}
              className="h-2.5 rounded-full transition-all"
              style={{ width: k === i ? 28 : 10, backgroundColor: "var(--hero-fg, #fff)", opacity: k === i ? 0.95 : 0.45 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
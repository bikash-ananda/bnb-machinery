"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Draggable from "@/components/ui/Draggable";
import { dismiss, useDismissed } from "@/lib/ui/dismissed";
import { activeNotices } from "@/src/lib/notices";
import { getTiharGreeting } from "@/src/lib/tihar";

const VISIT_KEY = "bnb-tihar-visits-v1";
const SEEN_KEY = "bnb-tihar-seen-v1";
const MIN_KEY = "bnb-tihar-min-v1";

/** Counts the visitor's sessions (once per browser session) so repeat visits get a different wish. */
function readVisit(): number {
  try {
    const n = Number(localStorage.getItem(VISIT_KEY)) || 0;
    if (sessionStorage.getItem(SEEN_KEY)) return n;
    sessionStorage.setItem(SEEN_KEY, "1");
    localStorage.setItem(VISIT_KEY, String(n + 1));
    return n + 1;
  } catch {
    return 0;
  }
}

function readMinimized(): boolean {
  try {
    return sessionStorage.getItem(MIN_KEY) === "1";
  } catch {
    return false;
  }
}

const PETALS = Array.from({ length: 12 }, (_, i) => ({
  "--l": `${(i * 29 + 7) % 96}%`,
  "--s": `${7 + (i % 3) * 3}px`,
  "--t": `${7 + (i % 4) * 1.6}s`,
  "--d": `${(-((i * 0.85) % 8)).toFixed(2)}s`,
  "--x": `${((i % 2) * 2 - 1) * (14 + (i % 5) * 6)}px`,
  "--b": i % 3 === 0 ? "1.2px" : "0px",
})) as CSSProperties[];

const SPARKS = Array.from({ length: 7 }, (_, i) => ({
  "--l": `${12 + ((i * 13) % 76)}%`,
  "--t": `${3.4 + (i % 3) * 0.9}s`,
  "--d": `${(-i * 0.7).toFixed(2)}s`,
})) as CSSProperties[];

/** A glowing oil lamp (diya). The flame flickers and the glow breathes (see globals.css). */
function Diya({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="tihar-glow-g" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd36b" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ff9a2e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tihar-bowl-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8c14a" />
          <stop offset="100%" stopColor="#a84c14" />
        </linearGradient>
        <radialGradient id="tihar-flame-g" cx="50%" cy="75%" r="65%">
          <stop offset="0%" stopColor="#fff7d1" />
          <stop offset="50%" stopColor="#ffb52e" />
          <stop offset="100%" stopColor="#ff6a1a" />
        </radialGradient>
      </defs>
      <circle className="tihar-glow" cx="32" cy="24" r="27" fill="url(#tihar-glow-g)" />
      <path className="tihar-flame" d="M32 6c5 7 8.5 12.500 5.500 20-1 2.600-10 2.600-11 0C23.500 18.500 27 13 32 6Z" fill="url(#tihar-flame-g)" />
      <path d="M32 18c2 3 3 5.500 1.800 8.500-.6 1.500-3 1.500-3.600 0C29 23.500 30 21 32 18Z" fill="#fffbe8" opacity="0.9" />
      <rect x="31" y="26" width="2" height="6" rx="1" fill="#3a2410" />
      <path d="M6 35c8-3 44-3 52 0-1 12-12 19-26 19S7 47 6 35Z" fill="url(#tihar-bowl-g)" />
      <ellipse cx="32" cy="35" rx="26" ry="3.600" fill="#7a3a12" />
      <ellipse cx="32" cy="34.500" rx="22" ry="2" fill="#ffb347" opacity="0.55" />
      <path d="M14 42c6 5 30 5 36 0" fill="none" stroke="#ffe08a" strokeOpacity="0.45" strokeWidth="1.500" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Floating Tihar greeting (Nepali only) on the home page.
 * Drag it anywhere, minimise it to a small diya, or close it (it stays away for 12 hours).
 */
export default function OfferCard() {
  const pathname = usePathname();
  const hidden = useDismissed("offer-card");
  const reduce = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());
  const [visit] = useState(readVisit);
  const [minimized, setMinimized] = useState(readMinimized);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const n = activeNotices("offer", now)[0];
  if (pathname !== "/" || hidden || !n) return null;
  const g = getTiharGreeting(now, visit);

  function setMin(v: boolean) {
    setMinimized(v);
    try { sessionStorage.setItem(MIN_KEY, v ? "1" : "0"); } catch {}
  }

  function close() {
    if (reduce) return dismiss("offer-card", 12);
    setClosing(true);
    setTimeout(() => { dismiss("offer-card", 12); setClosing(false); }, 240);
  }

  if (minimized) {
    return (
      <Draggable id="tihar-mini" className="fixed right-4 top-28 z-[56] size-16">
        <div className="relative size-16">
          <button
            type="button"
            onClick={() => setMin(false)}
            aria-label="शुभकामना खोल्नुहोस्"
            className="grid size-16 place-items-center rounded-full border border-amber-300/60 bg-[#0d1b3d] shadow-[0_0_28px_6px_rgba(255,170,50,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            <Diya className="tihar-bob size-12" />
          </button>
          <button
            type="button"
            onClick={() => dismiss("offer-card", 12)}
            aria-label="बन्द गर्नुहोस्"
            className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#0d1b3d] text-xs leading-none text-amber-200 ring-1 ring-amber-300/60 hover:text-white"
          >
            ×
          </button>
        </div>
      </Draggable>
    );
  }

  return (
    <Draggable id="tihar-card" className="fixed right-4 top-28 z-[56] w-80 max-w-[calc(100vw-2rem)]">
      <motion.aside
        role="complementary"
        aria-label={g.title}
        initial={reduce ? false : { opacity: 0, y: 18, scale: 0.95 }}
        animate={closing ? { opacity: 0, y: 14, scale: 0.94 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div data-tilt data-variant={g.variant} className="tihar-card">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {PETALS.map((s, i) => <span key={i} className="tihar-petal" style={s} />)}
            {SPARKS.map((s, i) => <span key={i} className="tihar-spark" style={s} />)}
          </div>
          <div className="tihar-garland" aria-hidden="true" />

          <div className="relative flex cursor-grab select-none items-center gap-2 px-4 pt-3">
            <span className="text-sm font-bold text-amber-200">🪔 शुभ दीपावली</span>
            <span className="ml-auto flex gap-1">
              <button type="button" onClick={() => setMin(true)} aria-label="सानो पार्नुहोस्" className="tihar-ctl">–</button>
              <button type="button" onClick={close} aria-label="बन्द गर्नुहोस्" className="tihar-ctl">×</button>
            </span>
          </div>

          <div className="relative flex justify-center pt-1">
            <Diya className="tihar-bob size-24" />
          </div>

          <div className="relative px-5 pb-5 text-center">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${g.theme}-${g.period}-${g.variant}`}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                <p className="text-sm text-amber-200/90">{g.salutation}</p>
                <h2 className="mt-1 text-xl font-bold leading-snug text-amber-100">{g.title}</h2>
                <p className="mt-2 text-sm leading-7 text-amber-50/90">{g.message}</p>
              </motion.div>
            </AnimatePresence>
            <p className="mt-3 text-sm font-semibold text-amber-200">{g.signature}</p>
            {n.link && (
              <Link
                href={n.link.href}
                className="mt-3 inline-flex items-center rounded-full bg-gradient-to-r from-amber-300 to-orange-400 px-4 py-2 text-sm font-bold text-slate-950 shadow hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
              >
                {n.link.label.ne}
              </Link>
            )}
          </div>
        </div>
      </motion.aside>
    </Draggable>
  );
}

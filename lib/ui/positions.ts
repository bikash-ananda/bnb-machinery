import { useSyncExternalStore } from "react";

export type Pos = { x: number; y: number; w: number };
type PosMap = Record<string, Pos>;

const KEY = "bnb-float-pos-v1";
const EMPTY: PosMap = {};
let cache: PosMap | null = null;
const listeners = new Set<() => void>();
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);

function load(): PosMap {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, Partial<Pos>>;
    const out: PosMap = {};
    for (const [id, p] of Object.entries(raw)) {
      if (p && num(p.x) && num(p.y) && num(p.w)) out[id] = { x: p.x as number, y: p.y as number, w: p.w as number };
    }
    return out;
  } catch {
    return {};
  }
}

function read(): PosMap {
  if (typeof window === "undefined") return EMPTY;
  return (cache ??= load());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; l(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
}

/** Saved position of a floating widget (null = use its default corner). */
export const usePosition = (id: string): Pos | null =>
  useSyncExternalStore(subscribe, () => read()[id] ?? null, () => null);

export function savePosition(id: string, pos: Pos) {
  cache = { ...read(), [id]: pos };
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
  listeners.forEach((l) => l());
}

export function resetPositions() {
  cache = {};
  try { localStorage.removeItem(KEY); } catch {}
  listeners.forEach((l) => l());
}
import { useSyncExternalStore } from "react";

const KEY = "bnb-dismissed-v1";
let cache: Record<string, number> | null = null;
const listeners = new Set<() => void>();

function read(): Record<string, number> {
  if (typeof window === "undefined") return {};
  if (!cache) {
    try { cache = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, number>; } catch { cache = {}; }
  }
  return cache;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** True while the visitor has closed this item. On the server it is true so nothing flashes before hydration. */
export const useDismissed = (id: string): boolean =>
  useSyncExternalStore(subscribe, () => (read()[id] ?? 0) > Date.now(), () => true);

/** Hide an item for a number of hours. */
export function dismiss(id: string, hours = 24) {
  cache = { ...read(), [id]: Date.now() + hours * 3600_000 };
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
  listeners.forEach((l) => l());
}
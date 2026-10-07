import { useSyncExternalStore } from "react";

export type DockState = { orient: "v" | "h"; collapsed: boolean };

const KEY = "bnb-dock-v1";
const DEFAULT: DockState = { orient: "v", collapsed: false };
let cache: DockState | null = null;
const listeners = new Set<() => void>();

function load(): DockState {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) || "{}") as Partial<DockState>;
    return { orient: r.orient === "h" ? "h" : "v", collapsed: r.collapsed === true };
  } catch {
    return DEFAULT;
  }
}

function read(): DockState {
  if (typeof window === "undefined") return DEFAULT;
  return (cache ??= load());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export const useDock = () => useSyncExternalStore(subscribe, read, () => DEFAULT);

export function setDock(patch: Partial<DockState>) {
  cache = { ...read(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
  listeners.forEach((l) => l());
}
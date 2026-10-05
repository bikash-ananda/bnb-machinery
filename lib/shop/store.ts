import { useSyncExternalStore } from "react";

export type CartItem = { id: string; name: string; price: number | null; image: string; slug: string; qty: number };
type State = { cart: CartItem[]; wish: string[]; compare: string[]; open: boolean };

const KEY = "bnb-shop-v1";
const EMPTY: State = { cart: [], wish: [], compare: [], open: false };
let cache: State | null = null;
const listeners = new Set<() => void>();

const isItem = (i: unknown): i is CartItem => {
  const o = i as CartItem;
  return !!o && typeof o.id === "string" && typeof o.name === "string" && typeof o.slug === "string" &&
    typeof o.image === "string" && typeof o.qty === "number" && (o.price === null || typeof o.price === "number");
};
const strings = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((w): w is string => typeof w === "string").slice(0, max) : []);

function load(): State {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}") as { cart?: unknown; wish?: unknown; compare?: unknown };
    const cart = Array.isArray(raw.cart) ? raw.cart.filter(isItem).slice(0, 50).map((i) => ({ ...i, qty: Math.min(99, Math.max(1, Math.round(i.qty))) })) : [];
    return { cart, wish: strings(raw.wish, 200), compare: strings(raw.compare, 3), open: false };
  } catch {
    return EMPTY;
  }
}

function read(): State {
  if (typeof window === "undefined") return EMPTY;
  if (!cache) cache = load();
  return cache;
}

function write(next: State) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify({ cart: next.cart, wish: next.wish, compare: next.compare })); } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; l(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
}

export const useShop = () => useSyncExternalStore(subscribe, read, () => EMPTY);

export function addToCart(item: Omit<CartItem, "qty">, qty = 1, openDrawer = true) {
  const s = read();
  const found = s.cart.find((c) => c.id === item.id);
  const cart = found
    ? s.cart.map((c) => (c.id === item.id ? { ...c, ...item, qty: Math.min(99, c.qty + qty) } : c))
    : [...s.cart, { ...item, qty: Math.min(99, Math.max(1, qty)) }];
  write({ ...s, cart, open: openDrawer ? true : s.open });
}
export function setQty(id: string, qty: number) {
  const s = read();
  write({ ...s, cart: qty <= 0 ? s.cart.filter((c) => c.id !== id) : s.cart.map((c) => (c.id === id ? { ...c, qty: Math.min(99, qty) } : c)) });
}
export const removeItem = (id: string) => setQty(id, 0);
export const clearCart = () => write({ ...read(), cart: [] });
export const setDrawer = (open: boolean) => write({ ...read(), open });
export function toggleWish(id: string) {
  const s = read();
  write({ ...s, wish: s.wish.includes(id) ? s.wish.filter((w) => w !== id) : [...s.wish, id] });
}
/** Returns false when the compare list is already full (3). */
export function toggleCompare(id: string) {
  const s = read();
  if (s.compare.includes(id)) { write({ ...s, compare: s.compare.filter((c) => c !== id) }); return true; }
  if (s.compare.length >= 3) return false;
  write({ ...s, compare: [...s.compare, id] });
  return true;
}
export const clearCompare = () => write({ ...read(), compare: [] });

export const cartCount = (s: State) => s.cart.reduce((n, c) => n + c.qty, 0);
export const cartTotal = (s: State) => s.cart.reduce((n, c) => n + (c.price ?? 0) * c.qty, 0);
export const unpricedCount = (s: State) => s.cart.filter((c) => c.price === null).length;

import { aliasGroups } from "@/config/search-aliases";
import type { ShopProduct } from "@/lib/shop/types";

export type SearchHit = Pick<ShopProduct, "id" | "slug" | "name" | "brand" | "category" | "image" | "price">;
type Input = SearchHit & Partial<Pick<ShopProduct, "nameNe" | "description" | "model">>;
export type Kind = "machines" | "tools" | "parts";

export const normalize = (s: string) =>
  s.toLowerCase().normalize("NFC").replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();

const groups = aliasGroups.map((g) => g.map(normalize).filter(Boolean));

/** Other words that mean the same as something in the query (local names, Devanagari, English). */
export function expandTerms(query: string): string[] {
  const nq = ` ${normalize(query)} `;
  const out = new Set<string>();
  for (const g of groups) if (g.some((t) => nq.includes(` ${t} `))) g.forEach((t) => out.add(t));
  return [...out];
}

function lev(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

function wordScore(token: string, words: string[]): number {
  let best = 0;
  for (const w of words) {
    if (w === token) return 1;
    if (token.length >= 2 && w.startsWith(token)) best = Math.max(best, 0.8);
    else if (token.length >= 3 && w.includes(token)) best = Math.max(best, 0.5);
    else if (token.length >= 4) {
      const max = token.length >= 8 ? 2 : 1;
      if (lev(token, w, max) <= max) best = Math.max(best, 0.4);
    }
  }
  return best;
}

const FIELDS: [keyof Input, number][] = [
  ["name", 5], ["nameNe", 5], ["brand", 4], ["model", 4], ["category", 3], ["description", 1],
];

export function searchProducts(products: Input[], query: string, limit = 8): SearchHit[] {
  const tokens = normalize(query).split(" ").filter(Boolean).slice(0, 8);
  if (!tokens.length) return [];
  const extra = expandTerms(query).filter((t) => !tokens.includes(t));

  return products
    .map((p) => {
      const fw = FIELDS.map(([k, w]) => [typeof p[k] === "string" ? normalize(p[k] as string).split(" ") : [], w] as const);
      let s = 0;
      let matched = 0;
      for (const t of tokens) {
        let best = 0;
        for (const [words, w] of fw) best = Math.max(best, wordScore(t, words) * w);
        if (best > 0) matched++;
        s += best;
      }
      for (const t of extra) {
        const parts = t.split(" ");
        let best = 0;
        for (const [words, w] of fw) if (parts.every((x) => wordScore(x, words) >= 0.8)) best = Math.max(best, w);
        s += best * 0.7;
      }
      if (matched > 0 && matched === tokens.length) s *= 1.25;
      return { p, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.p.name.localeCompare(b.p.name))
    .slice(0, limit)
    .map(({ p }) => ({ id: p.id, slug: p.slug, name: p.name, brand: p.brand, category: p.category, image: p.image, price: p.price }));
}

/** Machines / tools / spare parts, derived from the category name (no extra data needed). */
export function productKind(category: string): Kind {
  const c = category.toLowerCase();
  if (/part|spare|पार्ट|पुर्जा/.test(c)) return "parts";
  if (/tool|औजार/.test(c)) return "tools";
  return "machines";
}
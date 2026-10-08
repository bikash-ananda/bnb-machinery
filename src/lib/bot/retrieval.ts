/** Pure search over knowledge chunks (BM25). No file or network access here, so it is easy to test. */
export type Chunk = { id: string; source: string; title: string; text: string };
export type Index = { chunks: Chunk[]; tf: Map<string, number>[]; df: Map<string, number>; len: number[]; avg: number };
export type Hit = { chunk: Chunk; score: number };

const STOP = new Set([
  "the", "is", "are", "am", "a", "an", "of", "to", "and", "or", "you", "your", "do", "does", "can", "could", "i", "we", "my", "me", "in", "on", "for", "with", "what", "how", "when", "where", "which", "it", "this", "that", "please", "have", "has",
  "छ", "छन्", "हो", "र", "को", "मा", "का", "की", "के", "यो", "त्यो", "तपाईं", "तपाईंको", "हामी", "हाम्रो", "गर्न", "गर्नु", "गर्ने", "कसरी", "कहाँ", "के", "छैन", "पनि", "भने", "लागि", "सक्नु", "सकिन्छ",
]);

const NE_SUFFIX = ["हरूलाई", "हरू", "हरु", "लाई", "बाट", "मा", "को", "का", "की", "ले", "ने", "नु", "छ"];

/** Light stemming: common English endings and Nepali endings. */
const EN_SUFFIX = ["ations", "ation", "ments", "ment", "ings", "ing", "ions", "ion", "ed", "es", "s"];
export function stem(t: string): string {
  if (/\p{Script=Devanagari}/u.test(t)) {
    for (const s of NE_SUFFIX) if (t.length > s.length + 2 && t.endsWith(s)) return t.slice(0, -s.length);
    return t;
  }
  for (const s of EN_SUFFIX) if (t.length >= s.length + 4 && t.endsWith(s) && !t.endsWith("ss")) return t.slice(0, -s.length);
  return t;
}

/** Words that mean the same thing for our business, in English and Nepali. A question using one word also searches the others. */
const GROUPS: string[] = [
  "shop store showroom location located address visit map direction directions buspark ठेगाना पसल शोरुम नक्सा बाटो",
  "phone number call mobile contact whatsapp viber email mail फोन नम्बर सम्पर्क मोबाइल इमेल",
  "pay payment cash esewa khalti bank transfer भुक्तानी नगद तिर्ने बैंक",
  "price cost rate quote quotation estimate मूल्य भाउ कोटेसन दाम",
  "deliver delivery shipping transport डेलिभरी ढुवानी",
  "repair fix broken service maintenance मर्मत सम्भार बिग्रिएको",
  "part parts spare replacement component पार्ट पार्ट्स स्पेयर",
];

const rawTokens = (s: string) => (s.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? []).map(stem);

/** Extra search words from the synonym groups that the question touches. */
export function expand(query: string): string[] {
  const q = new Set(rawTokens(query));
  const extra: string[] = [];
  for (const g of GROUPS) {
    const words = g.split(" ").map((w) => stem(w));
    if (words.some((w) => q.has(w))) extra.push(...tokenize(g));
  }
  return extra;
}

export function tokenize(s: string): string[] {
  return (s.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? [])
    .filter((t) => !STOP.has(t) && (t.length > 1 || /\p{N}/u.test(t)))
    .map(stem);
}

/** Split markdown into chunks at "## " headings; long sections are split by paragraph (~700 chars). */
export function chunkMarkdown(source: string, md: string): Chunk[] {
  const out: Chunk[] = [];
  const sections = md.replace(/\r\n/g, "\n").split(/^## /m).filter((s) => s.trim());
  sections.forEach((sec, i) => {
    const hasHeading = md.trimStart().startsWith("## ") || i > 0;
    const nl = sec.indexOf("\n");
    const title = hasHeading ? (nl === -1 ? sec : sec.slice(0, nl)).trim() : source;
    const body = hasHeading ? (nl === -1 ? "" : sec.slice(nl + 1)).trim() : sec.trim();
    const paras = body.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean);
    let cur = "";
    let part = 0;
    const flush = () => {
      if (!cur) return;
      out.push({ id: `${source}#${i}.${part++}`, source, title, text: `${title}\n${cur}` });
      cur = "";
    };
    for (const p of paras) {
      if (cur && (cur + " " + p).length > 700) flush();
      cur = cur ? cur + "\n" + p : p;
    }
    flush();
  });
  return out;
}

export function buildIndex(chunks: Chunk[]): Index {
  const tf: Map<string, number>[] = [];
  const df = new Map<string, number>();
  const len: number[] = [];
  for (const c of chunks) {
    const toks = tokenize(c.text);
    const m = new Map<string, number>();
    toks.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1));
    m.forEach((_, t) => df.set(t, (df.get(t) ?? 0) + 1));
    tf.push(m);
    len.push(toks.length);
  }
  return { chunks, tf, df, len, avg: len.reduce((a, b) => a + b, 0) / Math.max(1, len.length) };
}

export function search(index: Index, query: string, k = 5): Hit[] {
  const q = Array.from(new Set([...tokenize(query), ...expand(query)]));
  const N = index.chunks.length;
  const k1 = 1.4;
  const b = 0.7;
  const hits: Hit[] = [];
  index.chunks.forEach((chunk, i) => {
    let score = 0;
    for (const t of q) {
      const f = index.tf[i].get(t);
      if (!f) continue;
      const n = index.df.get(t) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * index.len[i]) / index.avg)));
    }
    if (score > 0) hits.push({ chunk, score });
  });
  return hits.sort((a, b2) => b2.score - a.score).slice(0, k);
}

/** A match is "confident" when the best chunk shares enough meaningful words with the question. */
export const MIN_SCORE = 2.5;
export const isConfident = (hits: Hit[]) => hits.length > 0 && hits[0].score >= MIN_SCORE;
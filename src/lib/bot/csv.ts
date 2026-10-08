import type { Chunk } from "@/src/lib/bot/retrieval";

/** Small CSV reader: quotes, commas and line breaks inside quotes are supported. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const t = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (quoted) {
      if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

/** One knowledge chunk per row: "Column: value" lines. The first column is the title. */
export function csvToChunks(source: string, csv: string): Chunk[] {
  const [head, ...rows] = parseCsv(csv);
  if (!head) return [];
  return rows.map((r, i) => {
    const lines = head.map((h, j) => (r[j]?.trim() ? `${h.trim()}: ${r[j].trim()}` : "")).filter(Boolean);
    const title = r[0]?.trim() || `${source} row ${i + 1}`;
    return { id: `${source}#row${i + 1}`, source, title, text: lines.join("\n") };
  });
}
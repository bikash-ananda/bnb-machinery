import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { topics } from "@/lib/chat/knowledge";
import { getShopProducts } from "@/lib/server/catalog";
import { csvToChunks } from "@/src/lib/bot/csv";
import { buildIndex, chunkMarkdown, isConfident, search, type Chunk, type Hit, type Index } from "@/src/lib/bot/retrieval";

const dir = () => path.resolve(process.env.BOT_KNOWLEDGE_DIR || path.join(process.cwd(), "data", "knowledge"));

let fileCache: { sig: string; chunks: Chunk[] } | null = null;
let productCache: { at: number; chunks: Chunk[] } | null = null;
let indexCache: { key: string; index: Index } | null = null;

/** Every .md / .txt / .csv file in data/knowledge becomes searchable. Edit a file and the bot sees it on the next question. */
async function fileChunks(): Promise<Chunk[]> {
  let names: string[] = [];
  try { names = (await fs.readdir(dir())).filter((n) => /\.(md|txt|csv)$/i.test(n)).sort(); } catch { return []; }
  const stats = await Promise.all(names.map((n) => fs.stat(path.join(dir(), n))));
  const sig = names.map((n, i) => `${n}:${stats[i].mtimeMs}:${stats[i].size}`).join("|");
  if (fileCache?.sig === sig) return fileCache.chunks;
  const chunks: Chunk[] = [];
  for (const n of names) {
    const text = await fs.readFile(path.join(dir(), n), "utf8");
    chunks.push(...(/\.csv$/i.test(n) ? csvToChunks(n, text) : chunkMarkdown(n, text)));
  }
  fileCache = { sig, chunks };
  return chunks;
}

/** Live products (name, brand, price, stock) so the bot always matches the shop. Refreshed every 60 seconds. */
async function productChunks(): Promise<Chunk[]> {
  if (productCache && Date.now() - productCache.at < 60_000) return productCache.chunks;
  let chunks: Chunk[] = [];
  try {
    chunks = (await getShopProducts()).map((p) => {
      const synonyms = topics.find((t) => t.product === p.id)?.words.join(" ") ?? "";
      const price = p.price === null ? "Price on request (our team confirms the price)" : `Price: Rs ${p.price.toLocaleString("en-IN")}`;
      const stock = p.availability === "in" ? "In stock" : p.availability === "out" ? "Out of stock" : "Availability: ask our team";
      const title = `Product: ${p.name}${p.nameNe ? " / " + p.nameNe : ""}`;
      return {
        id: `product#${p.id}`,
        source: "catalog",
        title,
        text: `${title}\nBrand: ${p.brand}. Category: ${p.category}.${p.model ? " Model: " + p.model + "." : ""}\n${p.description}\n${price}. ${stock}.${synonyms ? "\nAlso searched as: " + synonyms : ""}`,
      };
    });
  } catch { chunks = []; }
  productCache = { at: Date.now(), chunks };
  return chunks;
}

export async function retrieve(query: string, k = 5): Promise<{ hits: Hit[]; confident: boolean }> {
  const [files, products] = await Promise.all([fileChunks(), productChunks()]);
  const key = `${fileCache?.sig}|${productCache?.at}`;
  if (indexCache?.key !== key) indexCache = { key, index: buildIndex([...files, ...products]) };
  const hits = search(indexCache.index, query, k);
  return { hits, confident: isConfident(hits) };
}
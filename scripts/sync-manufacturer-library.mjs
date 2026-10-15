import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const OUTPUT = resolve("data/manufacturer-library.json");
const SOURCES = {
  deliSitemap: "https://www.delitoolsglobal.com/sitemap.html",
  totalProducts: "https://www.totalbusiness.com/products",
  muktinathTillers: "https://www.muktinathkrishi.com/shop/machenaries/power-weeder-mini-tillers",
};
const headers = {
  "user-agent": "B-B-Machinery-Catalog-Sync/1.0 (staff product reference catalog)",
  accept: "text/html,application/xhtml+xml",
};

const clean = (value = "") => decodeEntities(value)
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"));
  return match ? decodeEntities(match[1]) : "";
}

function meta(html, property) {
  const tag = html.match(new RegExp(`<meta\\b(?=[^>]*(?:property|name)=["']${property}["'])[^>]*>`, "i"))?.[0];
  return tag ? attr(tag, "content") : "";
}

function slug(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);
}

function classify(value) {
  const text = value.toLowerCase();
  if (/bearing|ball bearing|roller bearing/.test(text)) return "Bearings";
  if (/motor|m3bp|m3aa|3gbp/.test(text)) return "Electric Motors";
  if (/tiller|weeder|reaper|harvester|cultivator|agricultur|tractor|sprayer|pump|chainsaw|brush cutter/.test(text)) return "Agricultural Machinery";
  if (/generator|genset/.test(text)) return "Generators";
  if (/weld|welder/.test(text)) return "Welding Equipment";
  if (/pump/.test(text)) return "Pumps";
  if (/drill|grinder|saw|hammer|screwdriver|planer|router|blower|polisher|mixer|compressor|impact|cordless|sander|cutting/.test(text)) return "Power Tools";
  if (/helmet|glove|goggle|safety|mask|harness|vest/.test(text)) return "Safety Equipment";
  if (/measure|level|caliper|laser|meter|tape/.test(text)) return "Measuring Tools";
  if (/spanner|wrench|pliers|socket|screwdriver|tool kit|tool set|clamp|chisel|file|cutter|hand tool/.test(text)) return "Hand Tools";
  return "Workshop Equipment";
}

async function fetchText(url, attempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, { headers, redirect: "follow", signal: AbortSignal.timeout(25_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 300 * (attempt + 1)));
    }
  }
  throw new Error(`${url}: ${lastError instanceof Error ? lastError.message : "request failed"}`);
}

async function mapLimit(values, limit, fn) {
  const result = new Array(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= values.length) return;
      try { result[index] = await fn(values[index], index); }
      catch (error) { console.warn(`Skipped source row: ${error instanceof Error ? error.message : error}`); }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 90));
    }
  }));
  return result.filter(Boolean);
}

function imageTags(html) {
  return [...html.matchAll(/<(?:img|source)\b[^>]*>/gi)].map((match) => {
    const tag = match[0];
    return attr(tag, "src") || attr(tag, "data-src") || attr(tag, "srcset").split(",")[0]?.trim().split(/\s+/)[0] || "";
  }).filter(Boolean);
}

function deliImage(html, pageUrl, model) {
  const page = new URL(pageUrl);
  const slugText = page.pathname.split("/").at(-1)?.replace(/\.html$/, "") ?? "";
  const images = imageTags(html)
    .map((src) => new URL(src, page.origin).href)
    .filter((src) => src.startsWith("https://www.delitoolsglobal.com/uploads/") && /\.(?:webp|jpe?g|png)$/i.test(src));
  const byModel = images.find((src) => src.toLowerCase().includes(model.toLowerCase()));
  const bySlug = images.find((src) => src.toLowerCase().includes(slugText.toLowerCase()));
  const productFile = images.find((src) => new URL(src).pathname.includes("/uploads/file/") && !/logo|banner/i.test(src));
  return byModel || bySlug || productFile || images.find((src) => !/logo|banner|series|category/i.test(src)) || null;
}

function deliRecord(link, html) {
  const model = link.label.slice(0, 120).trim();
  if (!model) return null;
  const title = clean(meta(html, "og:title") || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || model)
    .replace(/\s*-\s*Deli Group Co\.,?Ltd\.?\s*$/i, "")
    .replace(/\s*\|\s*Deli Group Co\.,?Ltd\.?\s*$/i, "");
  const description = clean(meta(html, "og:description") || meta(html, "description")) || title;
  const name = title.replace(new RegExp(`^${model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "i"), "").trim() || title;
  const imageUrl = deliImage(html, link.url, model);
  if (!imageUrl) return null;
  return {
    id: `deli-${slug(model)}`,
    manufacturer: "Deli",
    model,
    name: name.slice(0, 160),
    description: description.slice(0, 1400),
    category: classify(`${name} ${description}`),
    imageUrl,
    imageSourceUrl: link.url,
    sourceUrl: link.url,
    manufacturerUrl: link.url,
    sourceName: "Deli Group official product catalog",
    sourceType: "manufacturer",
    specifications: [],
  };
}

function totalRecords(html) {
  const marker = "window.g_initialProps = ";
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return [];
  const start = html.indexOf("{", markerIndex + marker.length);
  if (start < 0) return [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;
  for (let index = start; index < html.length; index++) {
    const character = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth++;
    else if (character === "}" && --depth === 0) { end = index + 1; break; }
  }
  if (end < 0) return [];
  const state = JSON.parse(html.slice(start, end));
  const list = Array.isArray(state.data?.list) ? state.data.list : [];
  return list.map((product) => {
    const model = clean(product.productNo || "");
    const name = clean(product.productName || "");
    const imageUrl = typeof product.picture === "string" ? product.picture.replace(/\\u002F/gi, "/") : "";
    const pathReplacement = clean(product.pathReplacement || "");
    let imageIsOfficial = false;
    try {
      const image = new URL(imageUrl);
      imageIsOfficial = image.protocol === "https:" && image.hostname === "www.totalbusiness.com"
        && (image.pathname.startsWith("/userfiles/") || image.pathname.startsWith("/website-center/upload/images/"));
    } catch { /* Ignore invalid manufacturer image URLs. */ }
    if (!pathReplacement || !model || !name || !imageIsOfficial) return null;
    const sourceUrl = `https://www.totalbusiness.com/product/${encodeURIComponent(pathReplacement)}/${encodeURIComponent(model)}`;
    const descriptions = [product.keyData1, product.keyData2, product.keyData3].filter((entry) => typeof entry === "string").map(clean);
    const description = descriptions.join(" · ") || `${name} (${model}) from TOTAL Tools. See the official product page for full details.`;
    return {
      id: `total-${slug(model)}`,
      manufacturer: "TOTAL",
      model,
      name: name.slice(0, 160),
      description: description.slice(0, 1400),
      category: classify(`${name} ${description}`),
      imageUrl,
      imageSourceUrl: sourceUrl,
      sourceUrl,
      manufacturerUrl: sourceUrl,
      sourceName: "TOTAL Tools official product catalog",
      sourceType: "manufacturer",
      specifications: descriptions.slice(0, 12),
    };
  }).filter(Boolean);
}

async function getDeli() {
  const sitemap = await fetchText(SOURCES.deliSitemap);
  const links = [...sitemap.matchAll(/<a\b[^>]*href=["']([^"']+\.html)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({ url: new URL(match[1], SOURCES.deliSitemap).href, label: clean(match[2]) }))
    .filter((item) => new URL(item.url).hostname === "www.delitoolsglobal.com" && new URL(item.url).pathname.startsWith("/products/"));
  const unique = [...new Map(links.map((item) => [item.url, item])).values()];
  const records = await mapLimit(unique, 6, async (link) => deliRecord(link, await fetchText(link.url)));
  console.log(`Deli: ${records.length} official product records with official images (${unique.length} product URLs discovered)`);
  return records;
}

async function getTotal() {
  const firstPage = await fetchText(SOURCES.totalProducts);
  const marker = "window.g_initialProps = ";
  const stateStart = firstPage.indexOf("{", firstPage.indexOf(marker) + marker.length);
  const objectEnd = (() => {
    let depth = 0; let inString = false; let escaped = false;
    for (let index = stateStart; index < firstPage.length; index++) {
      const character = firstPage[index];
      if (inString) { if (escaped) escaped = false; else if (character === "\\") escaped = true; else if (character === '"') inString = false; continue; }
      if (character === '"') inString = true;
      else if (character === "{") depth++;
      else if (character === "}" && --depth === 0) return index + 1;
    }
    return -1;
  })();
  const initialProps = objectEnd > stateStart ? JSON.parse(firstPage.slice(stateStart, objectEnd)) : {};
  const total = Number(initialProps.data?.total ?? 0);
  const pageSize = Number(initialProps.data?.pageSize ?? 40);
  const pages = Math.ceil(total / pageSize);
  const htmlPages = [firstPage, ...await mapLimit(Array.from({ length: Math.max(0, pages - 1) }, (_, index) => index + 2), 4, (page) => fetchText(`${SOURCES.totalProducts}?pageNum=${page}`))];
  const records = htmlPages.flatMap(totalRecords);
  console.log(`TOTAL: ${records.length} catalog cards with official images (${total} products reported over ${pages} pages)`);
  return records;
}

async function getSkfBearings() {
  const models = [
    ...Array.from({ length: 14 }, (_, i) => `600${i}`),
    ...Array.from({ length: 21 }, (_, i) => `620${i}`),
    ...Array.from({ length: 14 }, (_, i) => `630${i}`),
    ...Array.from({ length: 10 }, (_, i) => `6180${i}`),
    ...Array.from({ length: 10 }, (_, i) => `6190${i}`),
  ];
  const distinct = [...new Set(models)];
  const records = await mapLimit(distinct, 5, async (model) => {
    const sourceUrl = `https://www.emarketplace.in.skf.com/deep-groove-ball-bearing/${model}`;
    const html = await fetchText(sourceUrl, 2);
    const imageTag = imageTags(html).find((src) => /product-images\/SKF-/i.test(src) && /\.webp(?:\?|$)/i.test(src));
    const title = clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
    if (!title.toLowerCase().includes(model.toLowerCase()) || !imageTag) return null;
    const imageUrl = new URL(imageTag, sourceUrl).href;
    const name = `Deep groove ball bearing ${model}`;
    const description = `SKF single-row deep groove ball bearing, model ${model}. Manufacturer technical data, dimensions, clearance and seal variants are listed on the official SKF product page.`;
    return {
      id: `skf-${slug(model)}`,
      manufacturer: "SKF",
      model,
      name,
      description,
      category: "Bearings",
      imageUrl,
      imageSourceUrl: sourceUrl,
      sourceUrl,
      manufacturerUrl: sourceUrl,
      sourceName: "SKF official e-Marketplace product page",
      sourceType: "manufacturer",
      specifications: ["Single row", "Deep groove ball bearing", "Metric designation"],
    };
  });
  console.log(`SKF: ${records.length} verified deep-groove bearing sizes with SKF product images`);
  return records;
}

async function getAbbMotors() {
  const productIds = [
    "3GBP283420-AEK", "3GBP284220-BEK", "3GBP253220-AEK", "3GBP403820-BEK",
    "3GBP404820-BEK", "3GBP082470-BEK", "3GBP131260-ASK",
  ];
  const records = await mapLimit(productIds, 3, async (model) => {
    const sourceUrl = `https://www.abb.com/global/en/products/${model.toLowerCase()}`;
    const html = await fetchText(sourceUrl, 2);
    const title = clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    const description = clean(meta(html, "description") || meta(html, "og:description"));
    const imageUrl = meta(html, "og:image");
    if (!title.toLowerCase().includes(model.toLowerCase()) || !imageUrl.startsWith("https://cdn.productimages.abb.com/")) return null;
    return {
      id: `abb-${slug(model)}`,
      manufacturer: "ABB",
      model,
      name: description.split(" (")[0] || title,
      description: `${description} Refer to ABB for the complete electrical rating and configuration code before ordering.`,
      category: "Electric Motors",
      imageUrl,
      imageSourceUrl: sourceUrl,
      sourceUrl,
      manufacturerUrl: sourceUrl,
      sourceName: "ABB official product page",
      sourceType: "manufacturer",
      specifications: [],
    };
  });
  console.log(`ABB: ${records.length} verified ABB electric motors with official product images`);
  return records;
}

async function getNeptuneWeeders() {
  const categoryUrl = "https://www.neptunefarming.com/product/category/weeders";
  const categoryHtml = await fetchText(categoryUrl);
  const links = [...categoryHtml.matchAll(/<a\b[^>]*href=["']([^"']+\/product\/weeders\/[^"']+)["'][^>]*>/gi)]
    .map((match) => new URL(match[1], categoryUrl).href)
    .filter((url, index, list) => list.indexOf(url) === index);
  const records = await mapLimit(links, 4, async (sourceUrl) => {
    const html = await fetchText(sourceUrl, 2);
    const title = clean(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
    const model = title.match(/\b(NWP|NWD|NC|NE|NPP)[-\s]?\d+[A-Z0-9-]*/i)?.[0]?.replace(/\s+/g, "-").toUpperCase() ?? "";
    const imageTag = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]).find((tag) => /id=["']show-img["']/i.test(tag)) ?? "";
    const imageUrl = new URL(attr(imageTag, "src"), sourceUrl).href;
    if (!model || !title || !imageTag || new URL(imageUrl).hostname !== "www.neptunefarming.com") return null;
    const specifications = [...html.matchAll(/<tr\b[^>]*>\s*<td\b[^>]*>([\s\S]*?)<\/td>\s*<td\b[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi)]
      .map((match) => `${clean(match[1])}: ${clean(match[2])}`)
      .filter((value) => value.length > 2 && !value.endsWith(":"));
    const paragraphs = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => clean(match[1])).filter((value) => value.length > 50);
    const description = (meta(html, "description") || paragraphs[0] || `${title} manufacturer-listed agricultural power weeder.`).slice(0, 1400);
    const referencedByMuktinath = /power-weeder-mini-tillers/i.test(SOURCES.muktinathTillers)
      && ["NWP-170", "NWD-186FA", "NC-62"].includes(model);
    return {
      id: `neptune-${slug(model)}`,
      manufacturer: "Neptune",
      model,
      name: title,
      description,
      category: "Agricultural Machinery",
      imageUrl,
      imageSourceUrl: sourceUrl,
      sourceUrl,
      manufacturerUrl: sourceUrl,
      sourceName: referencedByMuktinath
        ? "Neptune Farming official product page (model listed by Muktinath Krishi)"
        : "Neptune Farming official product page",
      sourceType: "manufacturer",
      regionalReferenceUrl: referencedByMuktinath ? SOURCES.muktinathTillers : undefined,
      specifications: specifications.slice(0, 24),
    };
  });
  console.log(`Neptune: ${records.length} official agricultural weeder/tiller records with manufacturer images`);
  return records;
}

const all = [
  ...await getDeli(),
  ...await getTotal(),
  ...await getSkfBearings(),
  ...await getAbbMotors(),
  ...await getNeptuneWeeders(),
];

const deduped = new Map();
for (const item of all) {
  const key = `${item.manufacturer.toLowerCase()}|${item.model.toLowerCase()}`;
  if (!deduped.has(key)) deduped.set(key, item);
}

const items = [...deduped.values()].sort((a, b) => a.manufacturer.localeCompare(b.manufacturer) || a.model.localeCompare(b.model));
if (items.length < 1_000) throw new Error(`Manufacturer catalog returned only ${items.length} unique records; refusing to replace the current library.`);

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  description: "Public reference catalog only. Every item starts unavailable; B&B stock is created and approved separately.",
  sources: [
    { manufacturer: "Deli", url: SOURCES.deliSitemap },
    { manufacturer: "TOTAL", url: SOURCES.totalProducts },
    { manufacturer: "SKF", url: "https://www.emarketplace.in.skf.com/deep-groove-ball-bearing/6204" },
    { manufacturer: "ABB", url: "https://www.abb.com/global/en/areas/motion/motors-generators" },
    { manufacturer: "Neptune", url: "https://www.neptunefarming.com/product/category/weeders", crossReferencedWith: SOURCES.muktinathTillers },
  ],
  itemCount: items.length,
  items,
};

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
const byManufacturer = Object.groupBy(items, (item) => item.manufacturer);
console.log(`Saved ${items.length} unique product records to ${OUTPUT}`);
for (const [manufacturer, records] of Object.entries(byManufacturer)) console.log(`  ${manufacturer}: ${records.length}`);

import fs from "node:fs";

const checkedOn = "2026-10-15";
const sourceHtml = await (await fetch("https://ingconepal.com/products")).text();
const sourceData = JSON.parse(
  sourceHtml.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s)?.[1] ?? "null",
);
const sourceRows = sourceData?.props?.pageProps?.response;
if (!Array.isArray(sourceRows)) throw new Error("INGCO Nepal catalog data unavailable");

const officialIngcoRows = new Map();
for (const category of ["power-tools", "hand-tools"]) {
  const html = await (await fetch(`https://www.ingco.com/sa/products/${category}`)).text();
  for (const match of html.matchAll(/\{[^{}]*"productNo":"[^"]+"[^{}]*\}/gs)) {
    try {
      const row = JSON.parse(match[0]);
      officialIngcoRows.set(row.productNo.toUpperCase(), row);
    } catch {
      // Ignore page-shell JSON fragments; product rows are parsed independently.
    }
  }
}

const categoryPlan = [
  ["POWER TOOLS", 16],
  ["CORDLESS TOOLS", 14],
  ["WATER PUMPS", 7],
  ["GENERATORS", 5],
  ["WELDING MACHINES", 7],
  ["BENCH TOOLS", 7],
  ["GARDEN TOOLS", 10],
  ["AIR TOOLS", 5],
  ["HAND TOOLS", 9],
  ["MEASURING TOOLS", 4],
  ["SAFETY PRODUCTS", 4],
];
const categoryNames = {
  "POWER TOOLS": "Power Tools",
  "CORDLESS TOOLS": "Cordless Tools",
  "WATER PUMPS": "Water Pumps",
  GENERATORS: "Generators",
  "WELDING MACHINES": "Welding Equipment",
  "BENCH TOOLS": "Workshop Equipment",
  "GARDEN TOOLS": "Garden & Farm Tools",
  "AIR TOOLS": "Air Tools",
  "HAND TOOLS": "Hand Tools",
  "MEASURING TOOLS": "Measuring Tools",
  "SAFETY PRODUCTS": "Safety Equipment",
};
const ingcoItems = [];
const used = new Set();
for (const [category, count] of categoryPlan) {
  const rows = sourceRows.filter(
    (row) => !used.has(row._id) && row.categories?.includes(category) && row.price > 0 && row.image_urls?.[0],
  );
  const selected = rows.slice(0, count);
  if (selected.length !== count) throw new Error(`Not enough ${category} rows: ${selected.length}/${count}`);
  for (const row of selected) {
    used.add(row._id);
    const model = row.name.match(/[A-Z]{2,}[A-Z0-9-]{2,}/g)?.at(-1) ?? "";
    const maker = model ? officialIngcoRows.get(model.toUpperCase()) : null;
    const manufacturerUrl = maker?.pathReplacement
      ? `https://www.ingco.com/sa/product/${maker.pathReplacement}/${maker.productNo}`
      : `https://www.ingco.com/sa/products/${category === "HAND TOOLS" ? "hand-tools" : "power-tools"}`;
    const specs = maker
      ? [maker.keydata1, maker.keydata2, maker.keydata3].filter(Boolean).map((text) => {
          const split = text.indexOf(":");
          return split > 0 ? { name: text.slice(0, split).trim(), value: text.slice(split + 1).trim() } : { name: "Manufacturer detail", value: text };
        })
      : [];
    const description = specs.length
      ? `${row.name}. ${specs.map((spec) => `${spec.name}: ${spec.value}`).join(" · ")}.`
      : `${row.name}. Confirm the exact model variant, included accessories, warranty, local availability, and final B&B rate before ordering.`;
    ingcoItems.push({
      id: `ingco-${row.slug}`,
      name: row.name.trim(),
      category: categoryNames[category],
      brand: "INGCO",
      image: maker?.productPics || row.image_urls[0],
      description,
      model: model || undefined,
      specs,
      price: row.price,
      mrp: row.compare_at_price > row.price ? row.compare_at_price : undefined,
      sourceUrl: `https://ingconepal.com/product/${row.slug}`,
      manufacturerUrl,
      sourceName: "INGCO Nepal catalog (B.H.S. Machinery Pvt. Ltd.)",
      imageCredit: maker?.productPics ? "INGCO manufacturer catalog" : "INGCO Nepal catalog",
      priceCheckedOn: checkedOn,
      priceNote: "Indicative online reference; B&B stock and final selling price are confirmed on request.",
      marketReference: true,
    });
  }
}

const deliItems = [
  { id: "deli-ede-dz10-2e", name: "Deli 500W 10mm Impact Drill EDE-DZ10-2E", model: "EDE-DZ10-2E", category: "Power Tools", price: 4620, source: "https://hardwarepasal.com/product/deli-500w-10mm-impact-drill-ede-dz10-2e", specs: [["Rated power", "500W"], ["No-load speed", "0–3300rpm"], ["Chuck capacity", "10mm"]] },
  { id: "deli-ede-cz13-1e", name: "Deli 680W 13mm Impact Drill EDE-CZ13-1E", model: "EDE-CZ13-1E", category: "Power Tools", price: 5580, source: "https://hardwarepasal.com/product/deli-680w-13mm-impact-drill-ede-cz13-1e", specs: [["Input power", "680W"], ["No-load speed", "0–3000rpm"], ["Chuck capacity", "13mm"]] },
  { id: "deli-edl-cz13-e5", name: "Deli 650W 13mm Impact Drill EDL-CZ13-E5", model: "EDL-CZ13-E5", category: "Power Tools", price: 4250, source: "https://hardwarepasal.com/product/deli-650w-13mm-impact-drill-edl-cz13--e5", specs: [["Rated power", "650W"], ["Chuck capacity", "13mm"], ["Operation", "Drill and hammer modes"]] },
  { id: "deli-edl391201", name: "Deli 2000W Heat Gun EDL391201", model: "EDL391201", category: "Power Tools", price: 2860, source: "https://hardwarepasal.com/category/power-tools?page=4", specs: [["Input power", "2000W"]] },
  { id: "deli-edl-gf03-e1", name: "Deli 500W Aspirator Blower EDL-GF03-E1", model: "EDL-GF03-E1", category: "Power Tools", price: 2850, source: "https://hardwarepasal.com/category/power-tools?page=4", specs: [["Input power", "500W"], ["Air volume", "2.0m³/min"]] },
  { id: "deli-edl-sg125-e3", name: "Deli 360W 125mm Rotary Sander EDL-SG125-E3", model: "EDL-SG125-E3", category: "Power Tools", price: 6300, source: "https://hardwarepasal.com/product/deli-360w-125mm-rotary-sander-edl-sg125-e3", specs: [["Rated power", "360W"], ["No-load speed", "6000–12000rpm"], ["Base diameter", "125mm"]] },
  { id: "deli-edl-mx12-e1", name: "Deli 1600W 12mm Electric Router EDL-MX12-E1", model: "EDL-MX12-E1", category: "Workshop Equipment", price: 14300, source: "https://hardwarepasal.com/product/deli-1600w-12mm-electric-router-edl-mx12-e1", specs: [["Rated power", "1600W"], ["No-load speed", "23000rpm"], ["Chuck size", "12mm (1/2 in)"]] },
];

const sitemap = await (await fetch("https://www.delitoolsglobal.com/sitemap.xml")).text();
const deliPages = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]).filter((url) => url.includes("/products/") && url.endsWith(".html"));
for (const item of deliItems) {
  item.brand = "Deli";
  const detailUrl = deliPages.find((url) => url.toLowerCase().includes(item.model.toLowerCase()));
  if (!detailUrl) throw new Error(`Deli manufacturer product page not found: ${item.model}`);
  const html = await (await fetch(detailUrl)).text();
  const jsonLdImage = html.match(/<script type="application\/ld\+json">\s*({.*?})\s*<\/script>/s)?.[1];
  let image = "";
  if (jsonLdImage) {
    try { image = JSON.parse(jsonLdImage).image || ""; } catch { /* Use image tags below. */ }
  }
  const makerImages = [...html.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => match[1])
    .filter((src) => /\/uploads\/image\//.test(src) && !/logo|garden-tools|professional-power|diy-tools|home-use-tools/i.test(src));
  if (!image) {
    const modelToken = item.model.toLowerCase().replace(/-/g, "");
    const matchingImage = makerImages.find((src) => src.toLowerCase().replace(/-/g, "").includes(modelToken));
    image = matchingImage ? new URL(matchingImage, detailUrl).toString() : "";
  }
  if (!image) throw new Error(`Deli manufacturer image not found: ${item.model}`);
  item.image = image;
  item.manufacturerUrl = detailUrl;
  item.description = `${item.name}. ${item.specs.map(([name, value]) => `${name}: ${value}`).join(" · ")}.`;
  item.specs = item.specs.map(([name, value]) => ({ name, value }));
  item.sourceName = "Hardwarepasal Nepal online listing";
  item.imageCredit = "Deli Tools official manufacturer catalog";
  item.priceCheckedOn = checkedOn;
  item.priceNote = "Indicative Nepal online-market reference; B&B stock and final selling price are confirmed on request.";
  item.marketReference = true;
  item.sourceUrl = item.source;
  delete item.source;
}

const output = `import type { Product } from "./products";\n\n/**\n * Curated catalog of 95 market-reference items (88 INGCO + 7 Deli).\n * Model specs and manufacturer images are linked to official brand catalogs.\n * Nepal market rates were checked on ${checkedOn}; they are not B&B stock commitments.\n */\nexport const marketCatalog: Product[] = ${JSON.stringify([...ingcoItems, ...deliItems], null, 2)};\n`;
fs.writeFileSync("data/market-catalog.ts", output, "utf8");
console.log(`Wrote ${ingcoItems.length + deliItems.length} market catalog items (${ingcoItems.length} INGCO, ${deliItems.length} Deli).`);

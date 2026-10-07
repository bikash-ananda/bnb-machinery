import fs from "node:fs";
import path from "node:path";

const roots = ["app", "components", "lib", "src", "config", "data", "locales"];
const skip = new Set([path.join("config", "site.ts")]);
const rules = [
  [/B ?& ?B Machinery Suppliers/g, "Machinery Tools Nepal"],
  [/B ?& ?B MACHINERY/g, "MACHINERY TOOLS NEPAL"],
  [/B ?& ?B Machinery/g, "Machinery Tools Nepal"],
  [/\$\{company\.name\} Suppliers/g, "${company.name}"],
  [/^(\s*)B&B(\s*)$/gm, "$1MTN$2"],
  [/About B ?& ?B/g, "About us"],
  [/B & B \{T\(/g, "Machinery Tools {T("],
  [/\{company\.name\}\. </g, "{company.name} / {company.legalName}. <"],
];

const changed = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules" && e.name !== ".next") walk(p); continue; }
    if (!/\.(ts|tsx|json)$/.test(e.name) || skip.has(p)) continue;
    const before = fs.readFileSync(p, "utf8");
    let after = before;
    for (const [re, to] of rules) after = after.replace(re, to);
    if (after !== before) { fs.writeFileSync(p, after, "utf8"); changed.push(p); }
  }
}
roots.filter((r) => fs.existsSync(r)).forEach(walk);

const site = path.join("config", "site.ts");
const s0 = fs.readFileSync(site, "utf8");
const s1 = s0.replace(
  /name: "B & B Machinery",(\r?\n\s*)shortName: "B&B Machinery",/,
  'name: "Machinery Tools Nepal",$1shortName: "Machinery Tools Nepal",$1legalName: "B & B Machinery Suppliers",'
);
if (s1 !== s0) { fs.writeFileSync(site, s1, "utf8"); changed.push(site); }

console.log("Changed " + changed.length + " files:\n" + changed.join("\n"));

import fs from "node:fs";
const f = "lib/admin/access.ts";
let s = fs.readFileSync(f, "utf8");
const a = 'id: "pos", label: "Point of sale", group: "Finance", ready: false';
if (!s.includes(a)) console.log("NOT FOUND (pos may already be enabled)");
else { fs.writeFileSync(f, s.replace(a, 'id: "pos", label: "Point of sale", group: "Finance", ready: true'), "utf8"); console.log("POS enabled"); }

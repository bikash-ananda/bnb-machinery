import fs from "node:fs";
const f = "app/api/orders/route.ts";
let s = fs.readFileSync(f, "utf8");
if (s.includes('from "@/src/modules/sales/orders"')) { console.log("already patched"); process.exit(0); }
const edits = [
  ['import { dbRequest, hasSupabaseConfig } from "@/lib/server/supabase";',
   'import { dbRequest, hasSupabaseConfig } from "@/lib/server/supabase";\nimport { createOrder } from "@/src/modules/sales/orders";\nimport { InsufficientStockError } from "@/src/modules/inventory/service";'],
  ["const orderNo = `BB-", "let orderNo = `MTN-"],
  ["if (hasSupabaseConfig()) {", "if (!process.env.DATABASE_URL && hasSupabaseConfig()) {"],
  ["const summary = lines.map(",
   'if (process.env.DATABASE_URL) {\n    try {\n      const o = await createOrder({\n        channel: "WEB",\n        customer: { name, phone, email, address, district },\n        delivery, payment, note,\n        items: lines.map((l) => ({ slug: l.id, qty: l.qty })),\n      });\n      orderNo = o.orderNo;\n      saved = true;\n    } catch (e) {\n      if (e instanceof InsufficientStockError) return fail(e.message, 409);\n      console.error("order save failed", e);\n    }\n  }\n\n  const summary = lines.map('],
];
for (const [from, to] of edits) {
  if (!s.includes(from)) { console.log("NOT FOUND: " + from); continue; }
  s = s.replace(from, to);
}
fs.writeFileSync(f, s, "utf8");
console.log("route patched");

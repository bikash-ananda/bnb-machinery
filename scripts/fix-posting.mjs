import fs from "node:fs";
const f = "src/modules/accounting/posting.ts";
let s = fs.readFileSync(f, "utf8");
const a = s.indexOf("  if (j.sourceType && j.sourceId) {");
const b = s.indexOf("  const when = nepalToday");
const clean = [
  "  if (j.sourceType && j.sourceId) {",
  "    const done = await tx.select({ id: journalEntries.id }).from(journalEntries)",
  "      .where(and(eq(journalEntries.sourceType, j.sourceType), eq(journalEntries.sourceId, j.sourceId))).limit(1);",
  "    if (done.length) return null;",
  "  }",
  "",
  "",
].join("\n");
s = s.slice(0, a) + clean + s.slice(b);
s = s.replace('import { eq, inArray } from "drizzle-orm";', 'import { and, eq, inArray } from "drizzle-orm";');
fs.writeFileSync(f, s, "utf8");
console.log("posting.ts cleaned");

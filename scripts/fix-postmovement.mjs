import fs from "node:fs";
const f = "src/modules/inventory/service.ts";
let s = fs.readFileSync(f, "utf8");
const re = /try \{\s*await tx\s*\.insert\(stockBalances\)[\s\S]*?\r?\n\}\r?\n/;
if (!re.test(s)) { console.log("NOT FOUND"); process.exit(1); }
const fixed = [
  "try {",
  "    const updated = await tx",
  "      .update(stockBalances)",
  "      .set({ onHand: sql`${stockBalances.onHand} + ${m.qty}`, updatedAt: sql`now()` })",
  "      .where(and(eq(stockBalances.productId, m.productId), eq(stockBalances.locationId, locationId)))",
  "      .returning({ productId: stockBalances.productId });",
  "    if (updated.length === 0) {",
  '      if (m.qty < 0) throw new InsufficientStockError(m.productId, 0, "Stock cannot go below zero.");',
  "      await tx.insert(stockBalances).values({ productId: m.productId, locationId, onHand: m.qty });",
  "    }",
  "  } catch (e) {",
  "    if (e instanceof InsufficientStockError) throw e;",
  '    if (pgCode(e) === "23514") throw new InsufficientStockError(m.productId, 0, "Stock cannot go below zero.");',
  "    throw e;",
  "  }",
  "}",
  "",
].join("\n");
s = s.replace(re, () => fixed);
fs.writeFileSync(f, s, "utf8");
console.log("postMovement fixed");

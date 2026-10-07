async function main() {
  try { process.loadEnvFile(".env.local"); } catch {}
  const [target, cat] = process.argv.slice(2);
  if (!target || !["STANDARD", "EXEMPT", "ZERO"].includes(cat ?? "")) {
    console.log("Usage: pnpm db:tax <product-slug | category:<category-slug> | all> <STANDARD|EXEMPT|ZERO>");
    process.exit(1);
  }
  const { db } = await import("./client");
  const { products, categories } = await import("./schema");
  const { eq } = await import("drizzle-orm");
  const set = { taxCategory: cat };
  let rows;
  if (target === "all") rows = await db.update(products).set(set).returning({ slug: products.slug });
  else if (target.startsWith("category:")) {
    const [c] = await db.select().from(categories).where(eq(categories.slug, target.slice(9)));
    if (!c) throw new Error("Category not found");
    rows = await db.update(products).set(set).where(eq(products.categoryId, c.id)).returning({ slug: products.slug });
  } else rows = await db.update(products).set(set).where(eq(products.slug, target)).returning({ slug: products.slug });
  console.log(`${rows.length} product(s) set to ${cat}:`, rows.map((r) => r.slug).join(", "));
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });

export {};
async function main() {
  try { process.loadEnvFile(".env.local"); } catch {}
  const { db } = await import("./client");
  const s = await import("./schema");
  const { products: list } = await import("../../data/products");
  const slugify = (x: string) => x.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  await db.insert(s.stockLocations).values({ code: "MAIN", name: "Main shop", isDefault: true }).onConflictDoNothing();

  for (const name of new Set(list.map((p) => p.category))) {
    await db.insert(s.categories).values({ slug: slugify(name), nameEn: name }).onConflictDoNothing();
  }
  for (const name of new Set(list.map((p) => p.brand))) {
    await db.insert(s.brands).values({ slug: slugify(name), name }).onConflictDoNothing();
  }
  const cats = new Map((await db.select().from(s.categories)).map((c) => [c.slug, c.id]));
  const brs = new Map((await db.select().from(s.brands)).map((b) => [b.slug, b.id]));

  let added = 0;
  for (const p of list) {
    const [row] = await db.insert(s.products).values({
      sku: "MTN-" + p.id.toUpperCase(), slug: p.id, nameEn: p.name, descriptionEn: p.description,
      categoryId: cats.get(slugify(p.category)), brandId: brs.get(slugify(p.brand)),
      isPublished: true, isFeatured: !!p.featured,
    }).onConflictDoNothing().returning({ id: s.products.id });
    if (row) {
      added++;
      if (p.image) await db.insert(s.productImages).values({ productId: row.id, url: p.image });
    }
  }
  console.log("Seed done. New products:", added, "of", list.length);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });


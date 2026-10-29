import "server-only";

import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db, type Tx } from "@/src/db/client";
import { brands, categories, productImages, products } from "./schema";
import { slugify, type CatalogInput } from "./admin";

export type CatalogActor = { email: string; role: string };

function slugFor(name: string, suffix: string) {
  return slugify(name) + "-" + suffix.slice(0, 8);
}

async function resolveCategory(tx: Tx, name: string | null) {
  if (!name) return null;
  const existing = await tx.select({ id: categories.id }).from(categories).where(sql`lower(${categories.nameEn}) = lower(${name})`).limit(1);
  if (existing[0]) return existing[0].id;
  const [created] = await tx.insert(categories).values({ nameEn: name, slug: slugFor(name, crypto.randomUUID()) }).returning({ id: categories.id });
  return created.id;
}

async function resolveBrand(tx: Tx, name: string | null) {
  if (!name) return null;
  const existing = await tx.select({ id: brands.id }).from(brands).where(sql`lower(${brands.name}) = lower(${name})`).limit(1);
  if (existing[0]) return existing[0].id;
  const [created] = await tx.insert(brands).values({ name, slug: slugFor(name, crypto.randomUUID()) }).returning({ id: brands.id });
  return created.id;
}

function slugForProduct(name: string, sku: string) {
  return slugify(name) + "-" + slugify(sku).slice(0, 32);
}

export async function listCatalog(input: { q?: string; categoryId?: string; brandId?: string; status?: string; page: number; limit: number }) {
  const where = [];
  const q = input.q?.trim().slice(0, 80);
  if (q) {
    const term = "%" + q.replace(/[\\%_]/g, "\\$&") + "%";
    where.push(or(ilike(products.nameEn, term), ilike(products.nameNe, term), ilike(products.sku, term), ilike(products.barcode, term), ilike(products.model, term))!);
  }
  if (input.categoryId) where.push(eq(products.categoryId, input.categoryId));
  if (input.brandId) where.push(eq(products.brandId, input.brandId));
  if (input.status === "published") where.push(eq(products.isPublished, true));
  if (input.status === "draft") where.push(eq(products.isPublished, false));
  const condition = where.length ? and(...where) : undefined;
  const [rows, count, categoryRows, brandRows] = await Promise.all([
    db.select({
      id: products.id, sku: products.sku, barcode: products.barcode, slug: products.slug,
      nameEn: products.nameEn, nameNe: products.nameNe, model: products.model, unit: products.unit,
      categoryId: products.categoryId, category: categories.nameEn, brandId: products.brandId, brand: brands.name,
      pricePaisa: products.pricePaisa, mrpPaisa: products.mrpPaisa, costPaisa: products.costPaisa,
      reorderLevel: products.reorderLevel, trackStock: products.trackStock, isPublished: products.isPublished,
      isFeatured: products.isFeatured, vatApplicable: products.vatApplicable, taxCategory: products.taxCategory,
      createdAt: products.createdAt, updatedAt: products.updatedAt,
    }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).leftJoin(brands, eq(products.brandId, brands.id))
      .where(condition).orderBy(desc(products.updatedAt), asc(products.nameEn)).limit(input.limit).offset((input.page - 1) * input.limit),
    db.select({ count: sql<number>`count(*)::int` }).from(products).where(condition),
    db.select({ id: categories.id, name: categories.nameEn, nameNe: categories.nameNe }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.nameEn)),
    db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(asc(brands.name)),
  ]);
  const ids = rows.map((r) => r.id);
  const images = ids.length ? await db.select({ productId: productImages.productId, url: productImages.url, sortOrder: productImages.sortOrder })
    .from(productImages).where(inArray(productImages.productId, ids))
    .orderBy(asc(productImages.sortOrder)) : [];
  const byProduct = new Map<string, string[]>();
  for (const image of images) byProduct.set(image.productId, [...(byProduct.get(image.productId) ?? []), image.url]);
  return {
    items: rows.map((r) => ({
      ...r, price: r.pricePaisa === null ? "" : (Number(r.pricePaisa) / 100).toFixed(2),
      mrp: r.mrpPaisa === null ? "" : (Number(r.mrpPaisa) / 100).toFixed(2),
      cost: r.costPaisa === null ? "" : (Number(r.costPaisa) / 100).toFixed(2),
      images: byProduct.get(r.id) ?? [],
    })),
    total: count[0]?.count ?? 0, page: input.page, limit: input.limit, categories: categoryRows, brands: brandRows,
  };
}

export async function saveCatalogProduct(input: CatalogInput, actor: CatalogActor, productId?: string) {
  return db.transaction(async (tx) => {
    const categoryId = await resolveCategory(tx, input.category);
    const brandId = await resolveBrand(tx, input.brand);
    const values = {
      sku: input.sku, barcode: input.barcode, nameEn: input.nameEn, nameNe: input.nameNe,
      descriptionEn: input.descriptionEn, descriptionNe: input.descriptionNe, categoryId, brandId,
      model: input.model, unit: input.unit, pricePaisa: input.pricePaisa, mrpPaisa: input.mrpPaisa,
      costPaisa: input.costPaisa, priceIncludesVat: input.priceIncludesVat, vatApplicable: input.vatApplicable,
      taxCategory: input.taxCategory, hsCode: input.hsCode, reorderLevel: input.reorderLevel,
      trackStock: input.trackStock, isFeatured: input.isFeatured, specs: input.specs, updatedAt: new Date(),
    };
    let id: string;
    if (productId) {
      const updated = await tx.update(products).set(values).where(eq(products.id, productId)).returning({ id: products.id });
      if (!updated[0]) return null;
      id = updated[0].id;
      await tx.delete(productImages).where(eq(productImages.productId, id));
    } else {
      const [created] = await tx.insert(products).values({
        ...values, slug: slugForProduct(input.nameEn, input.sku), isPublished: false, isFeatured: input.isFeatured,
      }).returning({ id: products.id });
      id = created.id;
    }
    if (input.images.length) await tx.insert(productImages).values(input.images.map((url, sortOrder) => ({ productId: id, url, sortOrder })));
    await tx.insert((await import("@/src/modules/local-workflow/schema")).localAdminAuditEvents).values({
      actorEmail: actor.email, action: productId ? "catalog.product.updated" : "catalog.product.created",
      targetType: "product", targetId: id,
      details: { sku: input.sku, published: false },
    });
    return { id };
  });
}

export async function setCatalogPublished(productId: string, published: boolean, actor: CatalogActor) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select({ id: products.id, name: products.nameEn, trackStock: products.trackStock })
      .from(products).where(eq(products.id, productId)).for("update");
    if (!current) return null;
    const [updated] = await tx.update(products).set({ isPublished: published, updatedAt: new Date() })
      .where(eq(products.id, productId)).returning({ id: products.id, isPublished: products.isPublished });
    await tx.insert((await import("@/src/modules/local-workflow/schema")).localAdminAuditEvents).values({
      actorEmail: actor.email, action: published ? "catalog.product.published" : "catalog.product.unpublished",
      targetType: "product", targetId: productId, details: { name: current.name },
    });
    return updated;
  });
}

export async function getCatalogProduct(productId: string) {
  const [row] = await db.select({
    id: products.id, sku: products.sku, barcode: products.barcode, nameEn: products.nameEn, nameNe: products.nameNe,
    descriptionEn: products.descriptionEn, descriptionNe: products.descriptionNe, model: products.model, unit: products.unit,
    category: categories.nameEn, brand: brands.name, price: products.pricePaisa, mrp: products.mrpPaisa, cost: products.costPaisa,
    priceIncludesVat: products.priceIncludesVat, vatApplicable: products.vatApplicable, taxCategory: products.taxCategory,
    hsCode: products.hsCode, reorderLevel: products.reorderLevel, trackStock: products.trackStock, isFeatured: products.isFeatured,
    isPublished: products.isPublished, specs: products.specs,
  }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).leftJoin(brands, eq(products.brandId, brands.id))
    .where(eq(products.id, productId)).limit(1);
  if (!row) return null;
  const images = await db.select({ url: productImages.url }).from(productImages).where(eq(productImages.productId, productId)).orderBy(asc(productImages.sortOrder));
  const rupees = (p: bigint | null) => p === null ? "" : (Number(p) / 100).toFixed(2);
  return { ...row, price: rupees(row.price), mrp: rupees(row.mrp), cost: rupees(row.cost), images: images.map((i) => i.url) };
}

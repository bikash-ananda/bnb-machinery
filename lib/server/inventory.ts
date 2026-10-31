import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { ProductFields, ProductRecord, StaffSession, VerificationStatus } from "@/lib/inventory/types";
import { db } from "@/src/db/client";
import { inventoryWorkflowAuditEvents, inventoryWorkflowProductImages, inventoryWorkflowProducts } from "@/src/modules/local-workflow/schema";

type ImageRow = { id: string; productId: string; mimeType: string; sortIndex: number };
function toRecord(row: typeof inventoryWorkflowProducts.$inferSelect): ProductRecord {
  return {
    id: row.id, slug: row.slug, name: row.name, name_en: row.nameEn, name_ne: row.nameNe,
    description_en: row.descriptionEn, description_ne: row.descriptionNe, category_id: row.categoryId,
    category_name_en: row.categoryNameEn, brand_id: row.brandId, brand_name: row.brandName,
    model: row.model, part_number: row.partNumber, specifications: row.specifications as ProductRecord["specifications"],
    applications: row.applications as string[], stock_quantity: row.stockQuantity, stock_status: row.stockStatus,
    price: row.price === null ? null : Number(row.price), price_type: row.priceType,
    verification_status: row.verificationStatus as VerificationStatus, publication_status: row.publicationStatus as ProductRecord["publication_status"],
    created_by: row.createdBy, approved_by: row.approvedBy, created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(), published_at: row.publishedAt?.toISOString() ?? null,
    ai_suggestions: row.aiSuggestions as Record<string, unknown> | null,
    ai_status: row.aiStatus as ProductRecord["ai_status"],
  };
}
async function addImages(products: ProductRecord[]) {
  if (!products.length) return products;
  const images = await db.select({ id: inventoryWorkflowProductImages.id, productId: inventoryWorkflowProductImages.productId, mimeType: inventoryWorkflowProductImages.mimeType, sortIndex: inventoryWorkflowProductImages.sortIndex })
    .from(inventoryWorkflowProductImages).where(inArray(inventoryWorkflowProductImages.productId, products.map(p => p.id)))
    .orderBy(inventoryWorkflowProductImages.sortIndex);
  const grouped = new Map<string, ImageRow[]>();
  for (const image of images) grouped.set(image.productId, [...(grouped.get(image.productId) ?? []), image]);
  return products.map(p => ({ ...p, images: (grouped.get(p.id) ?? []).map(i => ({ id: i.id, mime_type: i.mimeType, sort_index: i.sortIndex })) }));
}
export async function getPublishedProducts(): Promise<ProductRecord[]> {
  const rows = await db.select().from(inventoryWorkflowProducts).where(and(eq(inventoryWorkflowProducts.publicationStatus, "PUBLISHED"), eq(inventoryWorkflowProducts.verificationStatus, "APPROVED"))).orderBy(desc(inventoryWorkflowProducts.publishedAt));
  return addImages(rows.map(toRecord));
}
export async function getPublishedProduct(slug: string) {
  const [row] = await db.select().from(inventoryWorkflowProducts).where(and(eq(inventoryWorkflowProducts.slug, slug), eq(inventoryWorkflowProducts.publicationStatus, "PUBLISHED"), eq(inventoryWorkflowProducts.verificationStatus, "APPROVED"))).limit(1);
  return row ? (await addImages([toRecord(row)]))[0] : null;
}
export async function getInventoryProduct(id: string) {
  const [row] = await db.select().from(inventoryWorkflowProducts).where(eq(inventoryWorkflowProducts.id, id)).limit(1);
  return row ? (await addImages([toRecord(row)]))[0] : null;
}
export async function getInventoryProducts(session: StaffSession, status?: VerificationStatus) {
  const filters = [];
  if (session.role === "INVENTORY_EDITOR") filters.push(eq(inventoryWorkflowProducts.createdBy, session.email));
  if (status) filters.push(eq(inventoryWorkflowProducts.verificationStatus, status));
  const rows = await db.select().from(inventoryWorkflowProducts).where(filters.length ? and(...filters) : undefined).orderBy(desc(inventoryWorkflowProducts.createdAt));
  return addImages(rows.map(toRecord));
}
export async function createInventoryDraft(actor: string, slug: string, images: { storage_path: string; mime_type: string; sort_index: number }[]) {
  const email = actor.trim().toLowerCase();
  if (email !== "bhattaraibikash38@gmail.com") throw new Error("unauthorized");
  return db.transaction(async tx => {
    const [product] = await tx.insert(inventoryWorkflowProducts).values({ slug, createdBy: email, verificationStatus: "DRAFT", publicationStatus: "PRIVATE" }).returning({ id: inventoryWorkflowProducts.id });
    if (images.length) await tx.insert(inventoryWorkflowProductImages).values(images.map(i => ({ productId: product.id, storagePath: i.storage_path, mimeType: i.mime_type, sortIndex: i.sort_index })));
    await tx.insert(inventoryWorkflowAuditEvents).values({ productId: product.id, actorEmail: email, action: "STOCK_UPLOADED", toStatus: "DRAFT" });
    return product.id;
  });
}
export async function saveInventoryProduct(session: StaffSession, productId: string, fields: ProductFields) {
  return db.transaction(async tx => {
    const [row] = await tx.select().from(inventoryWorkflowProducts).where(eq(inventoryWorkflowProducts.id, productId)).limit(1);
    if (!row) return false;
    const editable = session.role === "INVENTORY_EDITOR"
      ? row.createdBy === session.email && ["DRAFT", "STAFF_REVIEW", "NEEDS_CORRECTION"].includes(row.verificationStatus)
      : row.verificationStatus === "OWNER_REVIEW";
    if (!editable) return false;
    await tx.update(inventoryWorkflowProducts).set({
      nameEn: fields.name_en, nameNe: fields.name_ne,
      name: fields.name_en || fields.name_ne || null,
      descriptionEn: fields.description_en, descriptionNe: fields.description_ne,
      categoryNameEn: fields.category_name_en, brandName: fields.brand_name,
      model: fields.model, partNumber: fields.part_number, stockQuantity: fields.stock_quantity,
      specifications: fields.specifications, applications: fields.applications, updatedAt: new Date(),
    }).where(eq(inventoryWorkflowProducts.id, productId));
    await tx.insert(inventoryWorkflowAuditEvents).values({ productId, actorEmail: session.email, action: "PRODUCT_EDITED", fromStatus: row.verificationStatus, toStatus: row.verificationStatus });
    return true;
  });
}
export async function submitInventoryProduct(session: StaffSession, productId: string) {
  if (session.role !== "INVENTORY_EDITOR" || session.email !== "bhattaraibikash38@gmail.com") return false;
  return db.transaction(async tx => {
    const [row] = await tx.select().from(inventoryWorkflowProducts).where(eq(inventoryWorkflowProducts.id, productId)).limit(1);
    if (!row || row.createdBy !== session.email || !["DRAFT", "STAFF_REVIEW", "NEEDS_CORRECTION"].includes(row.verificationStatus) || !(row.nameEn?.trim() || row.nameNe?.trim())) return false;
    await tx.update(inventoryWorkflowProducts).set({ verificationStatus: "OWNER_REVIEW", publicationStatus: "PRIVATE", updatedAt: new Date() }).where(eq(inventoryWorkflowProducts.id, productId));
    await tx.insert(inventoryWorkflowAuditEvents).values({ productId, actorEmail: session.email, action: "SUBMITTED_FOR_OWNER_APPROVAL", fromStatus: row.verificationStatus, toStatus: "OWNER_REVIEW" });
    return true;
  });
}
export async function reviewInventoryProduct(session: StaffSession, productId: string, action: "approve" | "reject" | "correction", note?: string) {
  if (session.role !== "OWNER" || session.email === "bhattaraibikash38@gmail.com") return false;
  return db.transaction(async tx => {
    const [row] = await tx.select().from(inventoryWorkflowProducts).where(eq(inventoryWorkflowProducts.id, productId)).limit(1);
    if (!row || row.verificationStatus !== "OWNER_REVIEW") return false;
    if (action === "approve" && !(row.nameEn?.trim() || row.nameNe?.trim())) return false;
    const next = action === "approve" ? "APPROVED" : action === "reject" ? "REJECTED" : "NEEDS_CORRECTION";
    const audit = action === "approve" ? "APPROVED_AND_PUBLISHED" : action === "reject" ? "REJECTED" : "CORRECTION_REQUESTED";
    const now = new Date();
    await tx.update(inventoryWorkflowProducts).set({
      verificationStatus: next, publicationStatus: action === "approve" ? "PUBLISHED" : "PRIVATE",
      approvedBy: action === "approve" ? session.email : row.approvedBy,
      publishedAt: action === "approve" ? now : null, updatedAt: now,
    }).where(eq(inventoryWorkflowProducts.id, productId));
    await tx.insert(inventoryWorkflowAuditEvents).values({ productId, actorEmail: session.email, action: audit, fromStatus: row.verificationStatus, toStatus: next, details: note ? { note: note.slice(0, 1000) } : {} });
    return true;
  });
}

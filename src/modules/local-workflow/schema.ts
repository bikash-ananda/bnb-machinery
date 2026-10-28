import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "../../db/columns";

/**
 * Local Contabo-only inventory workflow. These tables intentionally use a
 * separate prefix so they never collide with the existing commerce catalog.
 */
export const inventoryWorkflowProducts = pgTable("inventory_workflow_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name"),
  nameEn: text("name_en"),
  nameNe: text("name_ne"),
  descriptionEn: text("description_en"),
  descriptionNe: text("description_ne"),
  categoryId: uuid("category_id"),
  categoryNameEn: text("category_name_en"),
  brandId: uuid("brand_id"),
  brandName: text("brand_name"),
  model: text("model"),
  partNumber: text("part_number"),
  specifications: jsonb("specifications").notNull().default([]),
  applications: jsonb("applications").notNull().default([]),
  stockQuantity: integer("stock_quantity"),
  stockStatus: text("stock_status"),
  price: text("price"),
  priceType: text("price_type"),
  verificationStatus: text("verification_status").notNull().default("DRAFT"),
  publicationStatus: text("publication_status").notNull().default("PRIVATE"),
  createdBy: text("created_by").notNull(),
  approvedBy: text("approved_by"),
  aiSuggestions: jsonb("ai_suggestions"),
  aiStatus: text("ai_status").notNull().default("NOT_REQUESTED"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
}, (t) => [
  index("inventory_workflow_products_queue_idx").on(t.verificationStatus, t.createdBy, t.createdAt),
  index("inventory_workflow_products_public_idx").on(t.publicationStatus, t.verificationStatus, t.publishedAt),
]);

export const inventoryWorkflowProductImages = pgTable("inventory_workflow_product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => inventoryWorkflowProducts.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull().unique(),
  mimeType: text("mime_type").notNull(),
  sortIndex: integer("sort_index").notNull().default(0),
  createdAt: createdAt(),
}, (t) => [index("inventory_workflow_product_images_product_idx").on(t.productId, t.sortIndex)]);

export const inventoryWorkflowAuditEvents = pgTable("inventory_workflow_audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => inventoryWorkflowProducts.id, { onDelete: "cascade" }),
  actorEmail: text("actor_email").notNull(),
  action: text("action").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  details: jsonb("details").notNull().default({}),
  createdAt: createdAt(),
}, (t) => [index("inventory_workflow_audit_events_product_idx").on(t.productId, t.createdAt)]);

export const inventoryLoginOtps = pgTable("inventory_login_otps", {
  email: text("email").primaryKey(),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  requestCount: integer("request_count").notNull().default(1),
  requestWindowStartedAt: timestamp("request_window_started_at", { withTimezone: true }).notNull().defaultNow(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  updatedAt: updatedAt(),
});

export const inventoryStaffSessions = pgTable("inventory_staff_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull().unique(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  createdAt: createdAt(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (t) => [index("inventory_staff_sessions_expiry_idx").on(t.expiresAt)]);

export const localAdminUsers = pgTable("local_admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  passwordHash: text("password_hash").notNull(),
  active: boolean("active").notNull().default(true),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const localAdminSessions = pgTable("local_admin_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: uuid("user_id").notNull().references(() => localAdminUsers.id, { onDelete: "cascade" }),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: createdAt(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (t) => [index("local_admin_sessions_expiry_idx").on(t.expiresAt)]);

export const localAdminAuditEvents = pgTable("local_admin_audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: uuid("actor_user_id"),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  details: jsonb("details").notNull().default({}),
  createdAt: createdAt(),
}, (t) => [index("local_admin_audit_events_created_idx").on(t.createdAt)]);

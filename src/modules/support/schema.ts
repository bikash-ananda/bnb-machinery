import { sql } from "drizzle-orm";
import { bigserial, check, index, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "../../db/columns";
import { customers } from "../customers/schema";
import { products } from "../catalog/schema";

export const supportConversations = pgTable("support_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionHash: text("session_hash").unique(),
  externalId: text("external_id"),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  channel: text("channel").notNull().default("WEB"),
  language: text("language").notNull().default("en"),
  status: text("status").notNull().default("OPEN"),
  assignedTo: text("assigned_to"),
  handoffReason: text("handoff_reason"),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  retentionExpiresAt: timestamp("retention_expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("support_conversations_queue_idx").on(t.status, t.lastMessageAt),
  index("support_conversations_retention_idx").on(t.retentionExpiresAt),
  check("support_conversations_channel_check", sql`${t.channel} in ('WEB', 'WHATSAPP', 'PHONE')`),
  check("support_conversations_language_check", sql`${t.language} in ('en', 'ne', 'hi')`),
  check("support_conversations_status_check", sql`${t.status} in ('OPEN', 'NEEDS_HUMAN', 'RESOLVED', 'CLOSED')`),
]);

export const supportMessages = pgTable("support_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sequence: bigserial("sequence", { mode: "number" }).notNull().unique(),
  conversationId: uuid("conversation_id").notNull().references(() => supportConversations.id, { onDelete: "cascade" }),
  clientMessageId: text("client_message_id"),
  role: text("role").notNull(),
  content: text("content").notNull(),
  language: text("language").notNull().default("en"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
}, (t) => [
  uniqueIndex("support_messages_idempotency_uq").on(t.conversationId, t.clientMessageId),
  index("support_messages_conversation_idx").on(t.conversationId, t.createdAt),
  check("support_messages_role_check", sql`${t.role} in ('USER', 'ASSISTANT', 'STAFF', 'SYSTEM')`),
  check("support_messages_language_check", sql`${t.language} in ('en', 'ne', 'hi')`),
  check("support_messages_content_check", sql`length(${t.content}) between 1 and 4000`),
]);

export const quotationRequests = pgTable("quotation_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  reference: text("reference").notNull().unique(),
  clientRequestId: text("client_request_id").unique(),
  conversationId: uuid("conversation_id").references(() => supportConversations.id, { onDelete: "set null" }),
  customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  customerType: text("customer_type").notNull().default("RETAIL"),
  deliveryDistrict: text("delivery_district"),
  deliveryAddress: text("delivery_address"),
  notes: text("notes"),
  channel: text("channel").notNull().default("WEB"),
  status: text("status").notNull().default("NEW"),
  assignedTo: text("assigned_to"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  index("quotation_requests_status_created_idx").on(t.status, t.createdAt),
  index("quotation_requests_phone_idx").on(t.phone),
  check("quotation_requests_customer_type_check", sql`${t.customerType} in ('RETAIL', 'WHOLESALE', 'DEALER', 'BUSINESS', 'OTHER')`),
  check("quotation_requests_channel_check", sql`${t.channel} in ('WEB', 'CHAT', 'WHATSAPP', 'PHONE', 'POS')`),
  check("quotation_requests_status_check", sql`${t.status} in ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')`),
]);

export const quotationRequestLines = pgTable("quotation_request_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id").notNull().references(() => quotationRequests.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  sku: text("sku"),
  quantity: numeric("quantity", { precision: 14, scale: 3, mode: "number" }).notNull().default(1),
  createdAt: createdAt(),
}, (t) => [
  index("quotation_request_lines_request_idx").on(t.requestId),
  check("quotation_request_lines_quantity_check", sql`${t.quantity} > 0 and ${t.quantity} <= 9999`),
]);

export const supportActivityEvents = pgTable("support_activity_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorType: text("actor_type").notNull(),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  conversationId: uuid("conversation_id").references(() => supportConversations.id, { onDelete: "set null" }),
  quotationRequestId: uuid("quotation_request_id").references(() => quotationRequests.id, { onDelete: "set null" }),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
}, (t) => [
  index("support_activity_events_conversation_idx").on(t.conversationId, t.createdAt),
  index("support_activity_events_quote_idx").on(t.quotationRequestId, t.createdAt),
  check("support_activity_events_actor_check", sql`${t.actorType} in ('CUSTOMER', 'STAFF', 'SYSTEM')`),
]);


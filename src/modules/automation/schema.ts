import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "../../db/columns";

/** Staff-managed switches for safe, predefined business workflows. */
export const automationRules = pgTable("automation_rules", {
  code: text("code").primaryKey(),
  area: text("area").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  trigger: text("trigger").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  updatedBy: text("updated_by"),
  updatedAt: updatedAt(),
});

/** Durable domain-event queue. Events are written in the same transaction as the business change. */
export const automationEvents = pgTable(
  "automation_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: text("event_type").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    dedupeKey: text("dedupe_key").unique(),
    status: text("status").notNull().default("PENDING"), // PENDING | PROCESSING | PROCESSED | FAILED
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: createdAt(),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [index("automation_events_queue_idx").on(t.status, t.availableAt, t.createdAt), index("automation_events_aggregate_idx").on(t.aggregateType, t.aggregateId)],
);

/** Every email / WhatsApp message to send. dedupeKey stops the same message being queued twice. */
export const outbox = pgTable(
  "outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channel: text("channel").notNull(), // EMAIL | WHATSAPP
    toAddress: text("to_address").notNull(),
    subject: text("subject"),
    body: text("body").notNull(),
    kind: text("kind").notNull(),
    dedupeKey: text("dedupe_key").unique(),
    status: text("status").notNull().default("PENDING"), // EMAIL: PENDING/SENDING/SENT/BLOCKED/FAILED
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: createdAt(),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [index("outbox_status_idx").on(t.channel, t.status, t.availableAt)],
);

export const jobRuns = pgTable("job_runs", {
  name: text("name").primaryKey(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }).notNull().defaultNow(),
  lastStatus: text("last_status").notNull().default("OK"),
  lastDetail: text("last_detail"),
});

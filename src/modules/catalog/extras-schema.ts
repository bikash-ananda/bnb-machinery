import { check, index, jsonb, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createdAt, updatedAt } from "../../db/columns";

export const productExtras = pgTable("product_extras", {
  productSlug: text("product_slug").primaryKey(),
  mrp: numeric("mrp", { precision: 14, scale: 2 }),
  videoUrls: jsonb("video_urls").$type<string[]>().notNull().default([]),
  updatedAt: updatedAt(),
});

export const productReviews = pgTable("product_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  productSlug: text("product_slug").notNull(),
  name: text("name").notNull(),
  rating: numeric("rating", { precision: 1, scale: 0, mode: "number" }).notNull(),
  comment: text("comment").notNull(),
  status: text("status").notNull().default("PENDING"),
  createdAt: createdAt(),
}, (t) => [
  index("product_reviews_public_idx").on(t.productSlug, t.status, t.createdAt),
  check("product_reviews_rating_check", sql`${t.rating} between 1 and 5`),
  check("product_reviews_status_check", sql`${t.status} in ('PENDING', 'APPROVED', 'REJECTED')`),
  check("product_reviews_name_check", sql`length(trim(${t.name})) between 2 and 60`),
  check("product_reviews_comment_check", sql`length(trim(${t.comment})) between 5 and 1000`),
]);

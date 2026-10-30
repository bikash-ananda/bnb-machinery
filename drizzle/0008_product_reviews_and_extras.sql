CREATE TABLE "product_extras" (
  "product_slug" text PRIMARY KEY NOT NULL,
  "mrp" numeric(14, 2),
  "video_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_slug" text NOT NULL,
  "name" text NOT NULL,
  "rating" numeric(1, 0) NOT NULL,
  "comment" text NOT NULL,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "product_reviews_rating_check" CHECK ("product_reviews"."rating" between 1 and 5),
  CONSTRAINT "product_reviews_status_check" CHECK ("product_reviews"."status" in ('PENDING', 'APPROVED', 'REJECTED')),
  CONSTRAINT "product_reviews_name_check" CHECK (length(trim("product_reviews"."name")) between 2 and 60),
  CONSTRAINT "product_reviews_comment_check" CHECK (length(trim("product_reviews"."comment")) between 5 and 1000)
);
--> statement-breakpoint
CREATE INDEX "product_reviews_public_idx" ON "product_reviews" USING btree ("product_slug", "status", "created_at");

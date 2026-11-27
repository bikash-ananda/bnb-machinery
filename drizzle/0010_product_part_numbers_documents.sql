ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "part_number" text;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "applications" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_part_number_idx" ON "products" ("part_number");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "storage_path" text NOT NULL UNIQUE,
  "mime_type" text NOT NULL,
  "visibility" text DEFAULT 'PRIVATE' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_documents_product_idx" ON "product_documents" ("product_id", "sort_order");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_documents_visibility_idx" ON "product_documents" ("visibility");

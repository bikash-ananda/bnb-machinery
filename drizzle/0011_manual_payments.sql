CREATE TABLE IF NOT EXISTS "payment_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "label" text NOT NULL,
  "method" text DEFAULT 'QR' NOT NULL,
  "payee_name" text NOT NULL,
  "account_no" text,
  "instructions" text,
  "qr_mime" text,
  "qr_data" text,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "updated_by" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "payment_accounts_method_check" CHECK ("method" in ('QR','BANK','ESEWA','KHALTI')),
  CONSTRAINT "payment_accounts_label_check" CHECK (length(trim("label")) between 2 and 60)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL REFERENCES "orders"("id"),
  "account_id" uuid REFERENCES "payment_accounts"("id"),
  "method" text NOT NULL,
  "txn_id" text NOT NULL,
  "status" text DEFAULT 'PENDING' NOT NULL,
  "received_paisa" bigint,
  "reviewed_by" text,
  "reviewed_at" timestamp with time zone,
  "reject_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "payment_sub_status_check" CHECK ("status" in ('PENDING','VERIFIED','REJECTED')),
  CONSTRAINT "payment_sub_method_check" CHECK ("method" in ('QR','BANK','ESEWA','KHALTI'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_sub_txn_uq" ON "payment_submissions" ("txn_id") WHERE "status" in ('PENDING','VERIFIED');
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_sub_order_idx" ON "payment_submissions" ("order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_sub_queue_idx" ON "payment_submissions" ("status", "created_at");

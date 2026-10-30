ALTER TABLE "local_admin_users" ADD COLUMN IF NOT EXISTS "failed_attempts" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "local_admin_users" ADD COLUMN IF NOT EXISTS "locked_until" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "local_admin_users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "local_admin_users" ADD COLUMN IF NOT EXISTS "created_by" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "local_admin_login_otps" (
  "email" text PRIMARY KEY NOT NULL,
  "code_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "request_count" integer DEFAULT 0 NOT NULL,
  "request_window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "consumed_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

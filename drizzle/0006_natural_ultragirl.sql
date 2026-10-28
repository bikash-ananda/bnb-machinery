CREATE TABLE "inventory_login_otps" (
	"email" text PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"request_window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consumed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_staff_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "inventory_staff_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "inventory_workflow_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"actor_email" text NOT NULL,
	"action" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_workflow_product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_workflow_product_images_storage_path_unique" UNIQUE("storage_path")
);
--> statement-breakpoint
CREATE TABLE "inventory_workflow_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text,
	"name_en" text,
	"name_ne" text,
	"description_en" text,
	"description_ne" text,
	"category_id" uuid,
	"category_name_en" text,
	"brand_id" uuid,
	"brand_name" text,
	"model" text,
	"part_number" text,
	"specifications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"applications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stock_quantity" integer,
	"stock_status" text,
	"price" text,
	"price_type" text,
	"verification_status" text DEFAULT 'DRAFT' NOT NULL,
	"publication_status" text DEFAULT 'PRIVATE' NOT NULL,
	"created_by" text NOT NULL,
	"approved_by" text,
	"ai_suggestions" jsonb,
	"ai_status" text DEFAULT 'NOT_REQUESTED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "inventory_workflow_products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "local_admin_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"actor_email" text,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "local_admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "local_admin_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "local_admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"password_hash" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "local_admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "quotation_request_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"product_id" uuid,
	"product_name" text NOT NULL,
	"sku" text,
	"quantity" numeric(14, 3) DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_request_lines_quantity_check" CHECK ("quotation_request_lines"."quantity" > 0 and "quotation_request_lines"."quantity" <= 9999)
);
--> statement-breakpoint
CREATE TABLE "quotation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"client_request_id" text,
	"conversation_id" uuid,
	"customer_id" uuid,
	"customer_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"customer_type" text DEFAULT 'RETAIL' NOT NULL,
	"delivery_district" text,
	"delivery_address" text,
	"notes" text,
	"channel" text DEFAULT 'WEB' NOT NULL,
	"status" text DEFAULT 'NEW' NOT NULL,
	"assigned_to" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotation_requests_reference_unique" UNIQUE("reference"),
	CONSTRAINT "quotation_requests_client_request_id_unique" UNIQUE("client_request_id"),
	CONSTRAINT "quotation_requests_customer_type_check" CHECK ("quotation_requests"."customer_type" in ('RETAIL', 'WHOLESALE', 'DEALER', 'BUSINESS', 'OTHER')),
	CONSTRAINT "quotation_requests_channel_check" CHECK ("quotation_requests"."channel" in ('WEB', 'CHAT', 'WHATSAPP', 'PHONE', 'POS')),
	CONSTRAINT "quotation_requests_status_check" CHECK ("quotation_requests"."status" in ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'))
);
--> statement-breakpoint
CREATE TABLE "support_activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" text NOT NULL,
	"actor_email" text,
	"action" text NOT NULL,
	"conversation_id" uuid,
	"quotation_request_id" uuid,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_activity_events_actor_check" CHECK ("support_activity_events"."actor_type" in ('CUSTOMER', 'STAFF', 'SYSTEM'))
);
--> statement-breakpoint
CREATE TABLE "support_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_hash" text,
	"external_id" text,
	"customer_id" uuid,
	"channel" text DEFAULT 'WEB' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"assigned_to" text,
	"handoff_reason" text,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retention_expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_conversations_session_hash_unique" UNIQUE("session_hash"),
	CONSTRAINT "support_conversations_channel_check" CHECK ("support_conversations"."channel" in ('WEB', 'WHATSAPP', 'PHONE')),
	CONSTRAINT "support_conversations_language_check" CHECK ("support_conversations"."language" in ('en', 'ne', 'hi')),
	CONSTRAINT "support_conversations_status_check" CHECK ("support_conversations"."status" in ('OPEN', 'NEEDS_HUMAN', 'RESOLVED', 'CLOSED'))
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"client_message_id" text,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_messages_role_check" CHECK ("support_messages"."role" in ('USER', 'ASSISTANT', 'STAFF', 'SYSTEM')),
	CONSTRAINT "support_messages_language_check" CHECK ("support_messages"."language" in ('en', 'ne', 'hi')),
	CONSTRAINT "support_messages_content_check" CHECK (length("support_messages"."content") between 1 and 4000)
);
--> statement-breakpoint
ALTER TABLE "inventory_workflow_audit_events" ADD CONSTRAINT "inventory_workflow_audit_events_product_id_inventory_workflow_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."inventory_workflow_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_workflow_product_images" ADD CONSTRAINT "inventory_workflow_product_images_product_id_inventory_workflow_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."inventory_workflow_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "local_admin_sessions" ADD CONSTRAINT "local_admin_sessions_user_id_local_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."local_admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_request_lines" ADD CONSTRAINT "quotation_request_lines_request_id_quotation_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."quotation_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_request_lines" ADD CONSTRAINT "quotation_request_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_requests" ADD CONSTRAINT "quotation_requests_conversation_id_support_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."support_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_requests" ADD CONSTRAINT "quotation_requests_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_activity_events" ADD CONSTRAINT "support_activity_events_conversation_id_support_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."support_conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_activity_events" ADD CONSTRAINT "support_activity_events_quotation_request_id_quotation_requests_id_fk" FOREIGN KEY ("quotation_request_id") REFERENCES "public"."quotation_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_conversations" ADD CONSTRAINT "support_conversations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_conversation_id_support_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."support_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_staff_sessions_expiry_idx" ON "inventory_staff_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "inventory_workflow_audit_events_product_idx" ON "inventory_workflow_audit_events" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_workflow_product_images_product_idx" ON "inventory_workflow_product_images" USING btree ("product_id","sort_index");--> statement-breakpoint
CREATE INDEX "inventory_workflow_products_queue_idx" ON "inventory_workflow_products" USING btree ("verification_status","created_by","created_at");--> statement-breakpoint
CREATE INDEX "inventory_workflow_products_public_idx" ON "inventory_workflow_products" USING btree ("publication_status","verification_status","published_at");--> statement-breakpoint
CREATE INDEX "local_admin_audit_events_created_idx" ON "local_admin_audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "local_admin_sessions_expiry_idx" ON "local_admin_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "quotation_request_lines_request_idx" ON "quotation_request_lines" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "quotation_requests_status_created_idx" ON "quotation_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "quotation_requests_phone_idx" ON "quotation_requests" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "support_activity_events_conversation_idx" ON "support_activity_events" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "support_activity_events_quote_idx" ON "support_activity_events" USING btree ("quotation_request_id","created_at");--> statement-breakpoint
CREATE INDEX "support_conversations_queue_idx" ON "support_conversations" USING btree ("status","last_message_at");--> statement-breakpoint
CREATE INDEX "support_conversations_retention_idx" ON "support_conversations" USING btree ("retention_expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "support_messages_idempotency_uq" ON "support_messages" USING btree ("conversation_id","client_message_id");--> statement-breakpoint
CREATE INDEX "support_messages_conversation_idx" ON "support_messages" USING btree ("conversation_id","created_at");
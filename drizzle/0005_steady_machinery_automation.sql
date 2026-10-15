ALTER TABLE "outbox" ADD COLUMN "available_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "outbox_status_idx";
--> statement-breakpoint
CREATE INDEX "outbox_status_idx" ON "outbox" USING btree ("channel","status","available_at");
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"code" text PRIMARY KEY NOT NULL,
	"area" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"trigger" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dedupe_key" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "automation_events_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE INDEX "automation_events_queue_idx" ON "automation_events" USING btree ("status","available_at","created_at");
--> statement-breakpoint
CREATE INDEX "automation_events_aggregate_idx" ON "automation_events" USING btree ("aggregate_type","aggregate_id");
--> statement-breakpoint
INSERT INTO "automation_rules" ("code", "area", "name", "description", "trigger", "enabled") VALUES
	('customer_welcome', 'Customers', 'Welcome new customers', 'Send a warm welcome when a customer profile is created from a purchase.', 'CUSTOMER_CREATED', true),
	('order_confirmation', 'Commerce', 'Confirm new orders', 'Email the buyer an order summary as soon as checkout is saved.', 'ORDER_CREATED', true),
	('new_order_alert', 'Operations', 'Alert the order desk', 'Notify the business inbox when a website or counter order needs attention.', 'ORDER_CREATED', true),
	('order_progress', 'Commerce', 'Share order progress', 'Keep the buyer informed when staff confirm, dispatch, prepare or complete an order.', 'ORDER_STATUS_CHANGED', true),
	('invoice_email', 'Finance', 'Deliver issued invoices', 'Send the buyer a printable invoice link after the sale and ledger posting commit.', 'INVOICE_ISSUED', true),
	('payment_receipt', 'Finance', 'Confirm payments', 'Email a receipt and remaining balance after a payment is recorded.', 'PAYMENT_RECEIVED', true),
	('payment_reminder', 'Finance', 'Remind about unpaid orders', 'Send one polite reminder after an order balance remains open for 24 hours.', 'PAYMENT_DUE', true),
	('reorder_alert', 'Inventory', 'Flag reorder levels', 'Notify the business inbox when sellable stock reaches a product reorder level.', 'STOCK_CHANGED', true),
	('customer_followup', 'Customers', 'Check in after delivery', 'Ask how the purchase is working seven days after an order is completed.', 'POST_PURCHASE_FOLLOWUP', true),
	('finance_daily_digest', 'Finance', 'Send daily business summary', 'Send a Nepal-time digest of sales, collections, open balances and low stock.', 'DAILY_FINANCE_SUMMARY', true)
ON CONFLICT ("code") DO NOTHING;

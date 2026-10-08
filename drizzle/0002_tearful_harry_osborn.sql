CREATE TABLE "purchase_bill_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"qty" numeric(14, 3) NOT NULL,
	"unit_paisa" bigint NOT NULL,
	"tax_category" text DEFAULT 'STANDARD' NOT NULL,
	"net_paisa" bigint NOT NULL,
	"vat_paisa" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bill_no" text NOT NULL,
	"fiscal_year" text NOT NULL,
	"supplier_id" uuid NOT NULL,
	"supplier_invoice_no" text NOT NULL,
	"supplier_invoice_date" date NOT NULL,
	"bs_date" text NOT NULL,
	"net_paisa" bigint NOT NULL,
	"vat_paisa" bigint NOT NULL,
	"total_paisa" bigint NOT NULL,
	"status" text DEFAULT 'POSTED' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_bills_bill_no_unique" UNIQUE("bill_no"),
	CONSTRAINT "pb_supplier_invoice_uq" UNIQUE("supplier_id","supplier_invoice_no")
);
--> statement-breakpoint
CREATE TABLE "supplier_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"bill_id" uuid,
	"method" text NOT NULL,
	"amount_paisa" bigint NOT NULL,
	"reference" text,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"address" text,
	"pan_no" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journal_lines" ADD COLUMN "supplier_id" uuid;--> statement-breakpoint
ALTER TABLE "purchase_bill_items" ADD CONSTRAINT "purchase_bill_items_bill_id_purchase_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."purchase_bills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_bill_items" ADD CONSTRAINT "purchase_bill_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD CONSTRAINT "purchase_bills_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_bill_id_purchase_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."purchase_bills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pb_fy_idx" ON "purchase_bills" USING btree ("fiscal_year");--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;
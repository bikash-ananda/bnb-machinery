ALTER TABLE "support_messages" ADD COLUMN "sequence" bigserial NOT NULL;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_sequence_unique" UNIQUE("sequence");
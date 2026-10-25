ALTER TABLE "conversation" ADD COLUMN "started_by" text;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversation_member" ADD COLUMN "opened_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "client_id" uuid;--> statement-breakpoint
CREATE INDEX "conversation_started_by_at_idx" ON "conversation" ("started_by","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "message_sender_client_uniq" ON "message" ("sender_id","client_id") WHERE client_id IS NOT NULL;--> statement-breakpoint
UPDATE "conversation" c SET "started_by" = f."sender_id", "started_at" = f."created_at" FROM (SELECT DISTINCT ON ("conversation_id") "conversation_id", "sender_id", "created_at" FROM "message" ORDER BY "conversation_id", "id") f WHERE f."conversation_id" = c."id" AND c."started_by" IS NULL;

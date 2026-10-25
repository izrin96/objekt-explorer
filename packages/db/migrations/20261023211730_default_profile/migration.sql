ALTER TABLE "user_address" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "user_address" a SET "is_default" = true FROM "message_pref" p WHERE p."chat_as" = a."address" AND a."user_id" = p."user_id";--> statement-breakpoint
ALTER TABLE "message_pref" DROP COLUMN "chat_as";--> statement-breakpoint
CREATE UNIQUE INDEX "user_address_default_idx" ON "user_address" ("user_id") WHERE is_default;--> statement-breakpoint
ALTER TABLE "user_address" ADD CONSTRAINT "user_address_default_linked" CHECK (NOT "is_default" OR "user_id" IS NOT NULL);
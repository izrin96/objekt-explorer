ALTER TABLE "lists" ADD COLUMN "list_type_new" varchar(20) DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "is_profile_bind" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "show_serial" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "linked_list_id" integer;--> statement-breakpoint
CREATE INDEX "lists_linked_list_id_idx" ON "lists" ("linked_list_id") WHERE linked_list_id IS NOT NULL;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_linked_list_id_lists_id_fkey" FOREIGN KEY ("linked_list_id") REFERENCES "lists"("id") ON DELETE SET NULL;

-- Data migration: set is_profile_bind only for actual profile-bound lists (enforces ownership)
-- Normal lists with profileAddress are just "display in profile" — no ownership enforcement
UPDATE "lists" SET "is_profile_bind" = true WHERE "list_type" = 'profile';

-- Data migration: set list_type_new based on currency presence
UPDATE "lists" SET "list_type_new" = 'sale' WHERE "currency" IS NOT NULL;
UPDATE "lists" SET "list_type_new" = 'general' WHERE "currency" IS NULL;
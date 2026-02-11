ALTER TABLE "profile_list_entries" DROP CONSTRAINT "profile_list_entries_list_id_profile_list_id_fk";--> statement-breakpoint
DROP TABLE "profile_list_entries";--> statement-breakpoint
DROP TABLE "profile_list";--> statement-breakpoint
ALTER TABLE "list_entries" ADD COLUMN "objekt_id" varchar(255);--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "list_type" varchar(20) DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "profile_address" citext;--> statement-breakpoint
ALTER TABLE "list_entries" ALTER COLUMN "collection_slug" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "list_entries_objekt_idx" ON "list_entries" ("objekt_id");--> statement-breakpoint
CREATE INDEX "lists_profile_address_idx" ON "lists" ("profile_address");
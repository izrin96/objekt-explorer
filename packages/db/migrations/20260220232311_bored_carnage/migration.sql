ALTER TABLE "profile_list_entries" DROP CONSTRAINT "profile_list_entries_list_id_profile_list_id_fk";--> statement-breakpoint
DROP TABLE "profile_list_entries";--> statement-breakpoint
DROP TABLE "profile_list";--> statement-breakpoint
ALTER TABLE "list_entries" ADD COLUMN "objekt_id" varchar(255);--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "list_type" varchar(20) DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "profile_address" citext;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "profile_slug" varchar(100);--> statement-breakpoint
ALTER TABLE "list_entries" ALTER COLUMN "collection_slug" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lists" ALTER COLUMN "slug" SET DATA TYPE varchar(100) USING "slug"::varchar(100);--> statement-breakpoint
CREATE INDEX "list_entries_objekt_idx" ON "list_entries" ("objekt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "list_entries_list_objekt_uniq" ON "list_entries" ("list_id","objekt_id") WHERE objekt_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "lists_profile_slug_idx" ON "lists" ("profile_address","profile_slug") WHERE profile_address IS NOT NULL AND profile_slug IS NOT NULL;--> statement-breakpoint
CREATE INDEX "lists_profile_address_idx" ON "lists" ("profile_address");
ALTER TABLE "lists" ADD COLUMN "display_profile_address" citext;--> statement-breakpoint
ALTER TABLE "lists" ALTER COLUMN "slug" SET DATA TYPE varchar(100) USING "slug"::varchar(100);--> statement-breakpoint
DROP INDEX "lists_slug_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "lists_slug_idx" ON "lists" ("slug") WHERE list_type = 'normal';--> statement-breakpoint
CREATE UNIQUE INDEX "lists_profile_slug_idx" ON "lists" ("profile_address","slug") WHERE list_type = 'profile';--> statement-breakpoint
CREATE INDEX "lists_display_profile_address_idx" ON "lists" ("display_profile_address");
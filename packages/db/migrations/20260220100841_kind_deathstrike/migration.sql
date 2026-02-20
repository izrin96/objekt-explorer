ALTER TABLE "lists" ADD COLUMN "profile_slug" varchar(100);--> statement-breakpoint
DROP INDEX "lists_slug_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "lists_slug_idx" ON "lists" ("slug");--> statement-breakpoint
DROP INDEX "lists_profile_slug_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "lists_profile_slug_idx" ON "lists" ("profile_address","profile_slug") WHERE profile_address IS NOT NULL AND profile_slug IS NOT NULL;
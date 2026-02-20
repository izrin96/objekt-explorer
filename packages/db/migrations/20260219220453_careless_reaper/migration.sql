DROP INDEX "lists_display_profile_address_idx";--> statement-breakpoint
ALTER TABLE "lists" DROP COLUMN "display_profile_address";--> statement-breakpoint
DROP INDEX "lists_slug_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "lists_slug_idx" ON "lists" ("slug") WHERE list_type = 'normal' AND profile_address IS NULL;--> statement-breakpoint
DROP INDEX "lists_profile_slug_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "lists_profile_slug_idx" ON "lists" ("profile_address","slug") WHERE profile_address IS NOT NULL;
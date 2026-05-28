DROP INDEX "lists_profile_address_idx";--> statement-breakpoint
CREATE INDEX "lists_profile_address_idx" ON "lists" ("profile_address") WHERE profile_address IS NOT NULL;
DROP INDEX "lists_slug_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "lists_slug_idx" ON "lists" USING btree ("slug");
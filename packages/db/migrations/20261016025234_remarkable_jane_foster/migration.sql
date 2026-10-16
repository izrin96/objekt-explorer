ALTER TABLE "lists" ADD COLUMN "match_have" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_open_to_something" CHECK ("match_sale" OR "match_have");
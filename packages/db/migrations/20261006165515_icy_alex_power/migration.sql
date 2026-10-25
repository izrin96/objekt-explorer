ALTER TABLE "lists" ADD COLUMN "show_on_trade" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "bumped_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "lists_trade_feed_idx" ON "lists" ("bumped_at" DESC NULLS LAST,"id") WHERE show_on_trade;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_trade_needs_discoverable" CHECK (NOT "show_on_trade" OR "discoverable");
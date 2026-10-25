DROP INDEX "lists_trade_feed_idx";--> statement-breakpoint
ALTER TABLE "lists" DROP CONSTRAINT "lists_trade_needs_discoverable";--> statement-breakpoint
ALTER TABLE "lists" DROP COLUMN "show_on_trade";--> statement-breakpoint
CREATE INDEX "lists_trade_feed_idx" ON "lists" ("bumped_at" DESC NULLS LAST,"id") WHERE discoverable;

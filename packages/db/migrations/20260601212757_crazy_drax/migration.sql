DROP INDEX "lists_trade_active_idx";--> statement-breakpoint
CREATE INDEX "lists_trade_discoverable_idx" ON "lists" ("list_type_new") WHERE list_type_new IN ('have', 'want') AND discoverable = true;
-- A lock this migration waits on would queue every later reader of trade_post behind it, so give
-- up after 3 s instead (the setting lasts to the end of the migrate transaction); rerun at a quiet time.
SELECT set_config('lock_timeout', '3s', true);--> statement-breakpoint
ALTER TABLE "trade_post" ADD COLUMN "lead_on_trade" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_post" ADD COLUMN "want_on_trade" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_post" ADD COLUMN "lead_bumped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "trade_post" ADD COLUMN "want_bumped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "trade_post" ADD COLUMN "match_have" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_post" ADD COLUMN "match_sale" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_post" ADD COLUMN "takes_swaps" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_post" ADD CONSTRAINT "trade_post_open_to_something" CHECK ("match_have" OR "match_sale");--> statement-breakpoint
-- Each row's state from its lists, by `postStateOf` (packages/api/src/lib/trade-post-rows.ts). The
-- build live while this runs writes lists only, so trade_post_state_reconcile runs it again once
-- the build that writes both is live.
UPDATE "trade_post" tp SET
  "lead_on_trade" = o."discoverable",
  "lead_bumped_at" = o."bumped_at",
  "want_on_trade" = coalesce(w."discoverable", false),
  "want_bumped_at" = w."bumped_at",
  "match_have" = CASE
    WHEN w."id" IS NOT NULL THEN w."match_have"
    WHEN o."list_type" = 'want' THEN o."match_have"
    ELSE true
  END,
  "match_sale" = CASE
    WHEN w."id" IS NOT NULL THEN w."match_sale"
    WHEN o."list_type" = 'want' THEN o."match_sale"
    ELSE true
  END,
  "takes_swaps" = o."list_type" = 'sale' AND o."takes_swaps"
FROM "trade_post" r
JOIN "lists" o ON o."id" = r."lead_list_id"
LEFT JOIN "lists" w ON w."id" = r."want_list_id"
WHERE tp."id" = r."id";

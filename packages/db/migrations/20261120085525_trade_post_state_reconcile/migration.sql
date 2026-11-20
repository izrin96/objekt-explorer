-- A lock this migration waits on would queue every later writer of lists behind it, so give up
-- after 3 s instead (the setting lasts to the end of the migrate transaction); rerun at a quiet time.
SELECT set_config('lock_timeout', '3s', true);--> statement-breakpoint
-- Freezes the lists values the UPDATE reads. Every trade_post writer starts with lockTradeLists
-- (FOR UPDATE, ROW SHARE), so EXCLUSIVE waits for those in flight and stops new ones before they
-- touch trade_post. SHARE would deadlock: deleteList holds its lists rows and has written its
-- trade_post rows, then its DELETE waits on this lock while the UPDATE waits on its rows.
LOCK TABLE "lists" IN EXCLUSIVE MODE;--> statement-breakpoint
-- trade_post_state's backfill again: the build live during that migration wrote lists only. While
-- a list is in at most one row, a row's state is a function of its lists, so this is right for
-- every row, whoever wrote it.
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

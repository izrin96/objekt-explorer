-- A lock this migration waits on would queue every later writer of lists behind it, so give up
-- after 3 s instead (the setting lasts to the end of the migrate transaction); rerun at a quiet time.
SELECT set_config('lock_timeout', '3s', true);--> statement-breakpoint
-- Records that schema.ts no longer has lists.match_have, match_sale or takes_swaps, nor the checks
-- lists_open_to_something and lists_takes_swaps_sale_only. The columns, their values and both
-- checks stay in the database on purpose: the build live while this runs still writes the columns,
-- and their defaults (true, true, false) satisfy both checks for the new build's inserts. A later
-- migration, drop_list_open_to, drops them once no live build reads them.
--
-- From here the trade_post rows are the only copy of a post's Open to, read off Trade too, so each
-- list's own value goes into its off-Trade sides first: list.edit wrote only the list off Trade,
-- so there the list is the newer copy. The build live now reads an off side from the list and an
-- on side from the row, so this changes nothing it reads.
--
-- Freezes the lists values the UPDATEs read. Every trade_post writer starts with lockTradeLists
-- (FOR UPDATE, ROW SHARE), and the live build's list.edit writes lists before anything else, so
-- EXCLUSIVE waits for those in flight and stops new ones before they touch trade_post; taking
-- lists first, it cannot deadlock against them.
LOCK TABLE "lists" IN EXCLUSIVE MODE;--> statement-breakpoint
-- A want side off Trade takes its list's Open to. A pair's want side keeps swaps: a want list whose
-- own value is Buying only (a pair saved before pairs had to take swaps) keeps the row's.
UPDATE "trade_post" tp SET "match_have" = l."match_have", "match_sale" = l."match_sale"
FROM "lists" l
WHERE l."id" = tp."want_list_id" AND NOT tp."want_on_trade" AND l."match_have"
  AND (tp."match_have", tp."match_sale") IS DISTINCT FROM (l."match_have", l."match_sale");--> statement-breakpoint
-- A Buy post's want lead off Trade takes its list's Open to.
UPDATE "trade_post" tp SET "match_have" = l."match_have", "match_sale" = l."match_sale"
FROM "lists" l
WHERE l."id" = tp."lead_list_id" AND l."list_type" = 'want' AND NOT tp."lead_on_trade"
  AND (tp."match_have", tp."match_sale") IS DISTINCT FROM (l."match_have", l."match_sale");--> statement-breakpoint
-- A sale lead off Trade takes its list's takes_swaps. A paired sale lead keeps swaps: one whose
-- own value is Sell only keeps the row's.
UPDATE "trade_post" tp SET "takes_swaps" = l."takes_swaps"
FROM "lists" l
WHERE l."id" = tp."lead_list_id" AND l."list_type" = 'sale' AND NOT tp."lead_on_trade"
  AND (l."takes_swaps" OR tp."want_list_id" IS NULL)
  AND tp."takes_swaps" IS DISTINCT FROM l."takes_swaps";

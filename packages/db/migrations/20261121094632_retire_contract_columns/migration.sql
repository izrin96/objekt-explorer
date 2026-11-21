-- A lock this migration waits on would queue every later reader of lists behind it, so give up
-- after 3 s instead (the setting lasts to the end of the migrate transaction); rerun at a quiet time.
SELECT set_config('lock_timeout', '3s', true);--> statement-breakpoint
-- Records that schema.ts no longer has lists.bumped_at, hidden_trade_post.list_id or
-- hidden_trade_post_list_id_idx. Both columns, that index and their values stay in the database on
-- purpose: the build live while this runs still writes both columns. A later migration drops them,
-- with hidden_trade_post_fill_post_id and its function, once no live build does; the hide index
-- goes with its column then.
--
-- lists_trade_feed_idx goes with bumped_at's last reader, and lists_trade_discoverable_idx now
-- covers every list on Trade, sale lists included, so the Marketplace and want alerts read through it.
DROP INDEX IF EXISTS "lists_trade_feed_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "lists_trade_discoverable_idx";--> statement-breakpoint
CREATE INDEX "lists_trade_discoverable_idx" ON "lists" ("list_type") WHERE discoverable;

-- While this waits for lists, every later reader and writer of lists queues behind it, so give up
-- after 1 s (the setting lasts to the end of the migrate transaction); rerun at a quiet time.
SELECT set_config('lock_timeout', '1s', true);--> statement-breakpoint
-- Take lists first, holding nothing, then hidden_trade_post at once or fail: a read that names
-- hidden_trade_post before lists (fetchHiddenPosts, the worker's unhidePosts) can hold it while
-- queued behind this, and waiting for it would deadlock. NOWAIT makes the migration fail; rerun it.
LOCK TABLE "lists" IN ACCESS EXCLUSIVE MODE;--> statement-breakpoint
LOCK TABLE "hidden_trade_post" IN ACCESS EXCLUSIVE MODE NOWAIT;--> statement-breakpoint
-- Safe now: no live build reads or writes either column, since web and the worker both run step 1
-- (20261121094632_retire_contract_columns) or later. The trigger and its function go by hand, as
-- drizzle's snapshot does not track them, and first: the function reads NEW.list_id, which
-- Postgres does not track, so the column drop alone would leave a trigger that fails every hide.
DROP TRIGGER IF EXISTS "hidden_trade_post_fill_post_id" ON "hidden_trade_post";--> statement-breakpoint
DROP FUNCTION IF EXISTS "hidden_trade_post_fill_post_id"();--> statement-breakpoint
-- Dropping list_id takes hidden_trade_post_list_id_idx with it. IF EXISTS: a database may already
-- lack either column.
ALTER TABLE "hidden_trade_post" DROP COLUMN IF EXISTS "list_id";--> statement-breakpoint
ALTER TABLE "lists" DROP COLUMN IF EXISTS "bumped_at";

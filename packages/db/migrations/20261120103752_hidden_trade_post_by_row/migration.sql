-- While this waits for lists, every later reader and writer of lists queues behind it, so give up
-- after 1 s (the setting lasts to the end of the migrate transaction); rerun at a quiet time.
SELECT set_config('lock_timeout', '1s', true);--> statement-breakpoint
-- Dropping the list_id key takes ACCESS EXCLUSIVE on lists, so take it first, holding nothing:
-- every writer locks lists before trade_post and hides, so none can be waiting on this. Then take
-- every later lock at once or fail: a statement that names hidden_trade_post before lists
-- (fetchHiddenPosts, the worker's unhidePosts) can hold it while queued behind us, and waiting
-- for it would deadlock. NOWAIT makes the migration the side that fails; rerun it.
-- SHARE ROW EXCLUSIVE on trade_post covers the new key without blocking reads of trade_post.
LOCK TABLE "lists" IN ACCESS EXCLUSIVE MODE;--> statement-breakpoint
LOCK TABLE "trade_post" IN SHARE ROW EXCLUSIVE MODE NOWAIT;--> statement-breakpoint
LOCK TABLE "hidden_trade_post" IN ACCESS EXCLUSIVE MODE NOWAIT;--> statement-breakpoint
ALTER TABLE "hidden_trade_post" DROP CONSTRAINT "hidden_trade_post_list_id_lists_id_fkey";--> statement-breakpoint
ALTER TABLE "hidden_trade_post" ADD COLUMN "post_id" integer;--> statement-breakpoint
-- each hide's row by postRowSql: the lowest row its list leads, else the lowest it is the want list of
UPDATE "hidden_trade_post" hp SET "post_id" = coalesce(
  (SELECT min("id") FROM "trade_post" WHERE "lead_list_id" = hp."list_id"),
  (SELECT min("id") FROM "trade_post" WHERE "want_list_id" = hp."list_id"));--> statement-breakpoint
-- two hides of one person on one row become the newer, before the primary key moves to the row
DELETE FROM "hidden_trade_post" older USING "hidden_trade_post" newer
WHERE older."user_id" = newer."user_id" AND older."post_id" = newer."post_id"
  AND (older."created_at", older."list_id") < (newer."created_at", newer."list_id");--> statement-breakpoint
-- a hide on a list in no row hides nothing on Trade, and has no post to name
DELETE FROM "hidden_trade_post" WHERE "post_id" IS NULL;--> statement-breakpoint
ALTER TABLE "hidden_trade_post" DROP CONSTRAINT "hidden_trade_post_pkey";--> statement-breakpoint
ALTER TABLE "hidden_trade_post" ALTER COLUMN "list_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hidden_trade_post" ALTER COLUMN "post_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "hidden_trade_post" ADD CONSTRAINT "hidden_trade_post_pkey" PRIMARY KEY ("user_id","post_id");--> statement-breakpoint
CREATE INDEX "hidden_trade_post_post_id_idx" ON "hidden_trade_post" ("post_id");--> statement-breakpoint
ALTER TABLE "hidden_trade_post" ADD CONSTRAINT "hidden_trade_post_post_id_trade_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "trade_post"("id") ON DELETE CASCADE;--> statement-breakpoint
-- For the build before this change, which writes hides without post_id: the row by the same rule
-- as the backfill, and no hide for a list in no row. Dropped with list_id by the contract change.
CREATE FUNCTION "hidden_trade_post_fill_post_id"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.post_id := coalesce(
    (SELECT min(id) FROM trade_post WHERE lead_list_id = NEW.list_id),
    (SELECT min(id) FROM trade_post WHERE want_list_id = NEW.list_id));
  IF NEW.post_id IS NULL THEN RETURN NULL; END IF;
  RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER "hidden_trade_post_fill_post_id" BEFORE INSERT ON "hidden_trade_post"
  FOR EACH ROW WHEN (NEW.post_id IS NULL) EXECUTE FUNCTION "hidden_trade_post_fill_post_id"();

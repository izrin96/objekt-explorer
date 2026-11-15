-- A lock this migration waits on would queue every later reader of offer behind it, so give up
-- after 3 s instead (the setting lasts to the end of the migrate transaction); rerun at a quiet time.
SELECT set_config('lock_timeout', '3s', true);--> statement-breakpoint
-- deleteList locks trade_post rows before offer rows, so taking trade_post first keeps this
-- migration from waiting on it while it holds offer.
LOCK TABLE "trade_post" IN SHARE ROW EXCLUSIVE MODE;--> statement-breakpoint
ALTER TABLE "offer" ADD COLUMN "post_id" integer;--> statement-breakpoint
CREATE INDEX "offer_post_id_idx" ON "offer" ("post_id") WHERE post_id IS NOT NULL;--> statement-breakpoint
ALTER TABLE "offer" ADD CONSTRAINT "offer_post_id_trade_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "trade_post"("id") ON DELETE SET NULL;--> statement-breakpoint
-- Same rule as createOffer: the lowest row the list leads. Offers created by the old build after
-- this migration keep NULL until the first reader's reconcile.
UPDATE "offer" o SET "post_id" = p.id
FROM (SELECT "lead_list_id", min("id") AS id FROM "trade_post" GROUP BY "lead_list_id") p
WHERE o."post_list_id" = p."lead_list_id";

-- While this waits for lists, every later reader and writer of lists queues behind it, so give up
-- after 1 s (the setting lasts to the end of the migrate transaction); rerun at a quiet time.
SELECT set_config('lock_timeout', '1s', true);--> statement-breakpoint
-- lists first, holding nothing, then trade_post at once or fail, as hidden_trade_post_by_row does:
-- a read holding trade_post while queued behind us on lists would deadlock a wait.
LOCK TABLE "lists" IN ACCESS EXCLUSIVE MODE;--> statement-breakpoint
LOCK TABLE "trade_post" IN ACCESS EXCLUSIVE MODE NOWAIT;--> statement-breakpoint
CREATE TABLE "trade_post_number" (
	"user_id" text PRIMARY KEY,
	"last" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "post_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_post_only_trade_side" CHECK (NOT "post_only" OR "list_type" IN ('have', 'sale', 'want'));--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_post_only_no_profile_slug" CHECK (NOT "post_only" OR "profile_slug" IS NULL);--> statement-breakpoint
ALTER TABLE "trade_post" ADD COLUMN "number" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- each owner's rows by creation, so the oldest post is #P-001
UPDATE "trade_post" tp SET "number" = r."n"
FROM (
  SELECT "id", row_number() OVER (PARTITION BY "user_id" ORDER BY "created_at", "id") AS "n"
  FROM "trade_post"
) r
WHERE tp."id" = r."id";--> statement-breakpoint
INSERT INTO "trade_post_number" ("user_id", "last")
SELECT "user_id", max("number") FROM "trade_post" GROUP BY "user_id";--> statement-breakpoint
CREATE UNIQUE INDEX "trade_post_user_number_uniq" ON "trade_post" ("user_id","number");--> statement-breakpoint
-- The counter row's lock orders one owner's inserts, and every writer, an older build included, gets a number.
CREATE FUNCTION "trade_post_number_fill"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO trade_post_number (user_id, last) VALUES (NEW.user_id, 1)
  ON CONFLICT (user_id) DO UPDATE SET last = trade_post_number.last + 1
  RETURNING last INTO NEW.number;
  RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER "trade_post_number_fill" BEFORE INSERT ON "trade_post"
  FOR EACH ROW EXECUTE FUNCTION "trade_post_number_fill"();

CREATE TABLE "trade_cancel_request" (
	"id" serial PRIMARY KEY,
	"trade_id" integer NOT NULL,
	"asked_by" text NOT NULL,
	"asked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"answered_at" timestamp with time zone,
	CONSTRAINT "trade_cancel_request_status" CHECK ("status" IN ('pending', 'accepted', 'declined', 'withdrawn'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "trade_cancel_request_pending_uniq" ON "trade_cancel_request" ("trade_id") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX "trade_cancel_request_trade_id_idx" ON "trade_cancel_request" ("trade_id","asked_at");--> statement-breakpoint
ALTER TABLE "trade_cancel_request" ADD CONSTRAINT "trade_cancel_request_trade_id_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trade"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trade_cancel_request" ADD CONSTRAINT "trade_cancel_request_asked_by_user_id_fkey" FOREIGN KEY ("asked_by") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trade" DROP CONSTRAINT "trade_cancel_reason", ADD CONSTRAINT "trade_cancel_reason" CHECK ("cancel_reason" IN ('party', 'token_moved', 'expired', 'not_transferable', 'agreed')) NOT VALID;--> statement-breakpoint
ALTER TABLE "trade" VALIDATE CONSTRAINT "trade_cancel_reason";
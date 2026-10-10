CREATE TABLE "trade_feedback" (
	"trade_id" integer,
	"from_user_id" text,
	"to_user_id" text NOT NULL,
	"rating" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trade_feedback_pkey" PRIMARY KEY("trade_id","from_user_id"),
	CONSTRAINT "trade_feedback_rating" CHECK ("rating" IN ('positive', 'neutral', 'negative')),
	CONSTRAINT "trade_feedback_not_self" CHECK ("from_user_id" <> "to_user_id")
);
--> statement-breakpoint
ALTER TABLE "report" ADD COLUMN "trade_id" integer;--> statement-breakpoint
ALTER TABLE "trade" ADD COLUMN "reminded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "trade_leg" ADD COLUMN "transfer_id" uuid;--> statement-breakpoint
CREATE INDEX "report_trade_id_idx" ON "report" ("trade_id") WHERE trade_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "trade_feedback_to_user_id_idx" ON "trade_feedback" ("to_user_id");--> statement-breakpoint
CREATE INDEX "trade_leg_open_idx" ON "trade_leg" ("trade_id") WHERE open;--> statement-breakpoint
CREATE UNIQUE INDEX "trade_leg_transfer_id_uniq" ON "trade_leg" ("transfer_id");--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_trade_id_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trade"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "trade_feedback" ADD CONSTRAINT "trade_feedback_trade_id_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trade"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trade_feedback" ADD CONSTRAINT "trade_feedback_from_user_id_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trade_feedback" ADD CONSTRAINT "trade_feedback_to_user_id_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "trade_substitute" ADD COLUMN "accept_by" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "trade_substitute" ADD COLUMN "reminded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "trade_substitute" ADD COLUMN "auto_accepted" boolean DEFAULT false NOT NULL;
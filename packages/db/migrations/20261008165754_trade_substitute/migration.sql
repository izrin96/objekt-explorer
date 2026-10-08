CREATE TABLE "trade_substitute" (
	"id" serial PRIMARY KEY,
	"trade_leg_id" integer NOT NULL,
	"tx_hash" text NOT NULL,
	"objekt_id" varchar(255) NOT NULL,
	"transferred_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trade_substitute_status" CHECK ("status" IN ('pending', 'accepted', 'declined'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "trade_leg_transfer_uniq" ON "trade_leg" ("tx_hash","verified_objekt_id") WHERE tx_hash IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "trade_substitute_transfer_uniq" ON "trade_substitute" ("trade_leg_id","tx_hash","objekt_id");--> statement-breakpoint
ALTER TABLE "trade_substitute" ADD CONSTRAINT "trade_substitute_trade_leg_id_trade_leg_id_fkey" FOREIGN KEY ("trade_leg_id") REFERENCES "trade_leg"("id") ON DELETE CASCADE;
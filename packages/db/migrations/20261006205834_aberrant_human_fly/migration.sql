CREATE TABLE "offer" (
	"id" serial PRIMARY KEY,
	"conversation_id" integer NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"parent_id" integer,
	"status" text DEFAULT 'open' NOT NULL,
	"cancel_reason" text,
	"topup_amount" numeric(12,2),
	"topup_currency" varchar(10),
	"topup_payer" text,
	"note" text,
	"caution" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '7 days' NOT NULL,
	"responded_at" timestamp with time zone,
	CONSTRAINT "offer_status" CHECK ("status" IN ('open', 'accepted', 'declined', 'withdrawn', 'countered', 'cancelled', 'expired')),
	CONSTRAINT "offer_cancel_reason" CHECK ("cancel_reason" IN ('reserved', 'blocked', 'sanction', 'token_moved')),
	CONSTRAINT "offer_topup_payer" CHECK ("topup_payer" IN ('from', 'to')),
	CONSTRAINT "offer_topup_complete" CHECK (("topup_amount" IS NULL) = ("topup_currency" IS NULL) AND ("topup_amount" IS NULL) = ("topup_payer" IS NULL)),
	CONSTRAINT "offer_topup_positive" CHECK ("topup_amount" > 0),
	CONSTRAINT "offer_note_length" CHECK (char_length("note") BETWEEN 1 AND 280),
	CONSTRAINT "offer_parties_differ" CHECK ("from_user_id" <> "to_user_id")
);
--> statement-breakpoint
CREATE TABLE "offer_item" (
	"id" serial PRIMARY KEY,
	"offer_id" integer NOT NULL,
	"side" text NOT NULL,
	"collection_slug" varchar(255) NOT NULL,
	"objekt_id" varchar(255),
	"list_id" integer,
	CONSTRAINT "offer_item_side" CHECK ("side" IN ('give', 'get')),
	CONSTRAINT "offer_item_give_specific" CHECK ("side" <> 'give' OR "objekt_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "trade" (
	"id" serial PRIMARY KEY,
	"offer_id" integer NOT NULL,
	"user_a" text NOT NULL,
	"user_b" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"cancelled_by" text,
	"cancel_reason" text,
	CONSTRAINT "trade_status" CHECK ("status" IN ('in_progress', 'completed', 'cancelled', 'failed')),
	CONSTRAINT "trade_cancel_reason" CHECK ("cancel_reason" IN ('party', 'token_moved'))
);
--> statement-breakpoint
CREATE TABLE "trade_leg" (
	"id" serial PRIMARY KEY,
	"trade_id" integer NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"from_addresses" text[] NOT NULL,
	"to_addresses" text[] NOT NULL,
	"collection_slug" varchar(255) NOT NULL,
	"objekt_id" varchar(255),
	"open" boolean DEFAULT true NOT NULL,
	"verified_at" timestamp with time zone,
	"tx_hash" text,
	"verified_objekt_id" varchar(255)
);
--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "offer_id" integer;--> statement-breakpoint
CREATE INDEX "message_offer_id_idx" ON "message" ("offer_id") WHERE offer_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "offer_one_open" ON "offer" ("conversation_id") WHERE status = 'open';--> statement-breakpoint
CREATE INDEX "offer_conversation_id_idx" ON "offer" ("conversation_id","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "offer_from_user_idx" ON "offer" ("from_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "offer_to_user_idx" ON "offer" ("to_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "offer_parent_id_idx" ON "offer" ("parent_id") WHERE parent_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "offer_item_offer_id_idx" ON "offer_item" ("offer_id");--> statement-breakpoint
CREATE INDEX "offer_item_objekt_id_idx" ON "offer_item" ("objekt_id") WHERE objekt_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "offer_item_list_id_idx" ON "offer_item" ("list_id") WHERE list_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "trade_offer_id_uniq" ON "trade" ("offer_id");--> statement-breakpoint
CREATE INDEX "trade_user_a_idx" ON "trade" ("user_a","accepted_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "trade_user_b_idx" ON "trade" ("user_b","accepted_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "trade_leg_trade_id_idx" ON "trade_leg" ("trade_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trade_leg_reserved" ON "trade_leg" ("objekt_id") WHERE open AND objekt_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "trade_leg_from_user_id_idx" ON "trade_leg" ("from_user_id");--> statement-breakpoint
CREATE INDEX "trade_leg_to_user_id_idx" ON "trade_leg" ("to_user_id");--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_offer_id_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "offer" ADD CONSTRAINT "offer_conversation_id_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "offer" ADD CONSTRAINT "offer_from_user_id_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "offer" ADD CONSTRAINT "offer_to_user_id_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "offer" ADD CONSTRAINT "offer_parent_id_offer_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "offer"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "offer_item" ADD CONSTRAINT "offer_item_offer_id_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "offer_item" ADD CONSTRAINT "offer_item_list_id_lists_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "trade" ADD CONSTRAINT "trade_offer_id_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trade" ADD CONSTRAINT "trade_user_a_user_id_fkey" FOREIGN KEY ("user_a") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trade" ADD CONSTRAINT "trade_user_b_user_id_fkey" FOREIGN KEY ("user_b") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trade" ADD CONSTRAINT "trade_cancelled_by_user_id_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trade_leg" ADD CONSTRAINT "trade_leg_trade_id_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trade"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trade_leg" ADD CONSTRAINT "trade_leg_from_user_id_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trade_leg" ADD CONSTRAINT "trade_leg_to_user_id_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "message" DROP CONSTRAINT "message_has_content", ADD CONSTRAINT "message_has_content" CHECK ("body" IS NOT NULL OR "card" IS NOT NULL OR "offer_id" IS NOT NULL);
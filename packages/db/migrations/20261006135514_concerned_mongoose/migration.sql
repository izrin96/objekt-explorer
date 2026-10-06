CREATE TABLE "hidden_trade_partner" (
	"user_id" text,
	"hidden_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hidden_trade_partner_pkey" PRIMARY KEY("user_id","hidden_user_id")
);
--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "hidden_trade_partner_hidden_user_id_idx" ON "hidden_trade_partner" ("hidden_user_id");--> statement-breakpoint
ALTER TABLE "hidden_trade_partner" ADD CONSTRAINT "hidden_trade_partner_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "hidden_trade_partner" ADD CONSTRAINT "hidden_trade_partner_hidden_user_id_user_id_fkey" FOREIGN KEY ("hidden_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
UPDATE "lists" AS l SET "updated_at" = greatest(l."created_at", (SELECT max(e."created_at") FROM "list_entries" AS e WHERE e."list_id" = l."id"));
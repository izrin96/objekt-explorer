CREATE TABLE "hidden_trade_post" (
	"user_id" text,
	"list_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hidden_trade_post_pkey" PRIMARY KEY("user_id","list_id")
);
--> statement-breakpoint
CREATE INDEX "hidden_trade_post_list_id_idx" ON "hidden_trade_post" ("list_id");--> statement-breakpoint
ALTER TABLE "hidden_trade_post" ADD CONSTRAINT "hidden_trade_post_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "hidden_trade_post" ADD CONSTRAINT "hidden_trade_post_list_id_lists_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE;
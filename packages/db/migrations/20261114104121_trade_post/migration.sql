SET LOCAL lock_timeout = '5s';--> statement-breakpoint
CREATE TABLE "trade_post" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trade_post_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1000000 CACHE 1),
	"user_id" text NOT NULL,
	"lead_list_id" integer NOT NULL,
	"want_list_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trade_post_want_not_lead" CHECK ("want_list_id" <> "lead_list_id")
);
--> statement-breakpoint
CREATE INDEX "trade_post_user_id_idx" ON "trade_post" ("user_id");--> statement-breakpoint
CREATE INDEX "trade_post_lead_list_id_idx" ON "trade_post" ("lead_list_id");--> statement-breakpoint
CREATE INDEX "trade_post_want_list_id_idx" ON "trade_post" ("want_list_id") WHERE want_list_id IS NOT NULL;--> statement-breakpoint
ALTER TABLE "trade_post" ADD CONSTRAINT "trade_post_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trade_post" ADD CONSTRAINT "trade_post_lead_list_id_lists_id_fkey" FOREIGN KEY ("lead_list_id") REFERENCES "lists"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trade_post" ADD CONSTRAINT "trade_post_want_list_id_lists_id_fkey" FOREIGN KEY ("want_list_id") REFERENCES "lists"("id") ON DELETE SET NULL;
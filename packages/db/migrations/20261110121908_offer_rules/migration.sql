ALTER TABLE "offer" ADD COLUMN "post_list_id" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "only_wanted_offers" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "one_post_offers" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "allow_collection_asks" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "offer" ADD CONSTRAINT "offer_post_list_id_lists_id_fkey" FOREIGN KEY ("post_list_id") REFERENCES "lists"("id") ON DELETE SET NULL;
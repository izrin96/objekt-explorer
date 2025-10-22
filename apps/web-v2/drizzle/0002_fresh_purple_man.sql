ALTER TABLE "list_entries" ADD COLUMN "collection_slug" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "list_entries" DROP COLUMN "collection_id";
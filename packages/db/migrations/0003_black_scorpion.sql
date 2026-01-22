ALTER TABLE "list_entries" ADD COLUMN "created_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "created_at" timestamp with time zone NOT NULL;
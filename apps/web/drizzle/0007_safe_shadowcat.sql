ALTER TABLE "list_entries" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "lists" ALTER COLUMN "created_at" SET DEFAULT now();
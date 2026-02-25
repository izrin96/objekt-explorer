ALTER TABLE "list_entries" ADD COLUMN "price" real;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "currency" varchar(10);
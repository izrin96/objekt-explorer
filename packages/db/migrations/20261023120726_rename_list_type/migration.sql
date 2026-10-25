ALTER TYPE "list_type_new" RENAME TO "list_type";--> statement-breakpoint
ALTER TABLE "lists" RENAME COLUMN "list_type_new" TO "list_type";

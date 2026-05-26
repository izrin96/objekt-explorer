CREATE TYPE "list_type_new" AS ENUM('general', 'sale', 'have', 'want');--> statement-breakpoint
ALTER TABLE "lists" ALTER COLUMN "list_type_new" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "lists" ALTER COLUMN "list_type_new" SET DATA TYPE "list_type_new" USING "list_type_new"::"list_type_new";--> statement-breakpoint
ALTER TABLE "lists" ALTER COLUMN "list_type_new" SET DEFAULT 'general'::"list_type_new";
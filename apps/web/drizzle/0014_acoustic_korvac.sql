ALTER TABLE "user" ADD COLUMN "display_username" "citext";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "discord" "citext";--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");
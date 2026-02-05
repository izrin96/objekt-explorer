ALTER TABLE "lists" ALTER COLUMN "hide_user" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_address" ALTER COLUMN "hide_user" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_address" ALTER COLUMN "private_profile" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_address" ALTER COLUMN "private_serial" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "show_social" boolean DEFAULT false;
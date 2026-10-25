ALTER TABLE "message" ADD COLUMN "unsent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "message_pref" ADD COLUMN "show_activity" boolean DEFAULT true NOT NULL;
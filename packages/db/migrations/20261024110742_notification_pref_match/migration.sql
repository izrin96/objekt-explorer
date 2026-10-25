ALTER TABLE "notification_pref" ADD COLUMN "match" text;--> statement-breakpoint
ALTER TABLE "notification_pref" ADD CONSTRAINT "notification_pref_match_chk" CHECK ("match" IN ('any', 'mutual'));
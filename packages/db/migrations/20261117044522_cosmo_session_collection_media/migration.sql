CREATE TABLE "collection_media" (
	"slug" varchar(255) PRIMARY KEY,
	"front_media" varchar(1024),
	"band_image_url" varchar(1024),
	"front_media_copy" varchar(255),
	"front_media_failed_at" timestamp with time zone,
	"has_voice" boolean DEFAULT false NOT NULL,
	"back_image" text,
	"accent_color" text,
	"text_color" text,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cosmo_session" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"cosmo_address" citext NOT NULL,
	"cosmo_nickname" text NOT NULL,
	"cookie_sealed" text,
	"cookie_expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_sync_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sync_cursor" jsonb,
	"last_used_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"sync_requested_at" timestamp with time zone,
	"dead_at" timestamp with time zone,
	"last_error" text,
	"last_sync" jsonb,
	"expiry_notified_at" timestamp with time zone,
	CONSTRAINT "cosmo_session_cookie_live" CHECK (("dead_at" IS NULL) = ("cookie_sealed" IS NOT NULL)),
	CONSTRAINT "cosmo_session_last_error_chk" CHECK ("last_error" IN ('session_dead', 'session_expired', 'cosmo_unavailable', 'unexpected_response', 'key_unreadable'))
);
--> statement-breakpoint
CREATE INDEX "cosmo_session_user_id_idx" ON "cosmo_session" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cosmo_session_address_idx" ON "cosmo_session" ("cosmo_address");--> statement-breakpoint
CREATE INDEX "cosmo_session_next_sync_idx" ON "cosmo_session" ("next_sync_at") WHERE dead_at IS NULL;--> statement-breakpoint
ALTER TABLE "cosmo_session" ADD CONSTRAINT "cosmo_session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
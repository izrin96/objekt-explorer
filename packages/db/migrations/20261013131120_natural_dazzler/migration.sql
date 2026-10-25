CREATE TABLE "address_link_event" (
	"id" bigserial PRIMARY KEY,
	"address" citext NOT NULL,
	"user_id" text NOT NULL,
	"event" text NOT NULL,
	"reason" text NOT NULL,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "address_link_event_event" CHECK ("event" IN ('linked', 'unlinked')),
	CONSTRAINT "address_link_event_reason" CHECK ("reason" IN ('verified', 'user', 'account_deleted', 'staff_move', 'staff_unlink', 'backfill')),
	CONSTRAINT "address_link_event_actor" CHECK (("reason" IN ('staff_move', 'staff_unlink')) = ("actor_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX "address_link_event_address_idx" ON "address_link_event" ("address","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "address_link_event_user_idx" ON "address_link_event" ("user_id","created_at" DESC NULLS LAST);
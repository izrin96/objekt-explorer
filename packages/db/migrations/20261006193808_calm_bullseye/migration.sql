CREATE TABLE "message_flag" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"message_id" bigint NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_flag_category" CHECK ("category" IN ('send_first', 'outside_payment'))
);
--> statement-breakpoint
CREATE TABLE "mod_audit" (
	"id" serial PRIMARY KEY,
	"actor_id" text,
	"action" text NOT NULL,
	"target_user_id" text,
	"report_ids" integer[],
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" serial PRIMARY KEY,
	"reporter_id" text NOT NULL,
	"target_user_id" text NOT NULL,
	"conversation_id" integer,
	"reason" text NOT NULL,
	"note" text,
	"excerpt" jsonb,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_by" text,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "report_reason" CHECK ("reason" IN ('scam', 'harassment', 'spam', 'impersonation', 'other')),
	CONSTRAINT "report_status" CHECK ("status" IN ('open', 'dismissed', 'actioned')),
	CONSTRAINT "report_note_length" CHECK (char_length("note") <= 500)
);
--> statement-breakpoint
CREATE TABLE "user_block" (
	"blocker_id" text,
	"blocked_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_block_pkey" PRIMARY KEY("blocker_id","blocked_id"),
	CONSTRAINT "user_block_not_self" CHECK ("blocker_id" <> "blocked_id")
);
--> statement-breakpoint
CREATE TABLE "user_sanction" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"reason" text NOT NULL,
	"expires_at" timestamp with time zone,
	"issued_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" text,
	CONSTRAINT "user_sanction_type" CHECK ("type" IN ('warn', 'chat_mute', 'trade_block', 'ban'))
);
--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "caution" text[];--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
CREATE INDEX "message_flag_user_category_idx" ON "message_flag" ("user_id","category");--> statement-breakpoint
CREATE INDEX "mod_audit_target_created_idx" ON "mod_audit" ("target_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "report_status_target_idx" ON "report" ("status","target_user_id");--> statement-breakpoint
CREATE INDEX "report_target_user_id_idx" ON "report" ("target_user_id");--> statement-breakpoint
CREATE INDEX "report_reporter_target_idx" ON "report" ("reporter_id","target_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "user_block_blocked_id_idx" ON "user_block" ("blocked_id");--> statement-breakpoint
CREATE INDEX "user_sanction_user_id_idx" ON "user_sanction" ("user_id");--> statement-breakpoint
CREATE INDEX "user_sanction_active_idx" ON "user_sanction" ("user_id","type") WHERE revoked_at IS NULL;--> statement-breakpoint
ALTER TABLE "message_flag" ADD CONSTRAINT "message_flag_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "mod_audit" ADD CONSTRAINT "mod_audit_actor_id_user_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "mod_audit" ADD CONSTRAINT "mod_audit_target_user_id_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_id_user_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_target_user_id_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_conversation_id_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_resolved_by_user_id_fkey" FOREIGN KEY ("resolved_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "user_block" ADD CONSTRAINT "user_block_blocker_id_user_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_block" ADD CONSTRAINT "user_block_blocked_id_user_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_sanction" ADD CONSTRAINT "user_sanction_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_sanction" ADD CONSTRAINT "user_sanction_issued_by_user_id_fkey" FOREIGN KEY ("issued_by") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "user_sanction" ADD CONSTRAINT "user_sanction_revoked_by_user_id_fkey" FOREIGN KEY ("revoked_by") REFERENCES "user"("id") ON DELETE SET NULL;
CREATE TABLE "conversation" (
	"id" serial PRIMARY KEY,
	"user_low" text NOT NULL,
	"user_high" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_id" bigint,
	"last_message_at" timestamp with time zone,
	CONSTRAINT "conversation_pair_ordered" CHECK ("user_low" COLLATE "C" < "user_high"),
	CONSTRAINT "conversation_created_by_member" CHECK ("created_by" IN ("user_low", "user_high"))
);
--> statement-breakpoint
CREATE TABLE "conversation_member" (
	"conversation_id" integer,
	"user_id" text,
	"request" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"muted_until" timestamp with time zone,
	"last_read_message_id" bigint,
	CONSTRAINT "conversation_member_pkey" PRIMARY KEY("conversation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" bigserial PRIMARY KEY,
	"conversation_id" integer NOT NULL,
	"sender_id" text NOT NULL,
	"body" text,
	"card" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_has_content" CHECK ("body" IS NOT NULL OR "card" IS NOT NULL),
	CONSTRAINT "message_body_length" CHECK (char_length("body") BETWEEN 1 AND 2000)
);
--> statement-breakpoint
CREATE TABLE "message_pref" (
	"user_id" text PRIMARY KEY,
	"allow" text DEFAULT 'anyone' NOT NULL,
	"allow_hidden" boolean DEFAULT false NOT NULL,
	CONSTRAINT "message_pref_allow" CHECK ("allow" IN ('anyone', 'nobody'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_pair_uniq" ON "conversation" ("user_low","user_high");--> statement-breakpoint
CREATE INDEX "conversation_user_high_idx" ON "conversation" ("user_high");--> statement-breakpoint
CREATE INDEX "conversation_member_user_id_idx" ON "conversation_member" ("user_id");--> statement-breakpoint
CREATE INDEX "message_conversation_id_idx" ON "message" ("conversation_id","id" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_user_low_user_id_fkey" FOREIGN KEY ("user_low") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_user_high_user_id_fkey" FOREIGN KEY ("user_high") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "conversation_member" ADD CONSTRAINT "conversation_member_conversation_id_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "conversation_member" ADD CONSTRAINT "conversation_member_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_conversation_id_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "message_pref" ADD CONSTRAINT "message_pref_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
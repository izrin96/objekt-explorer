CREATE TABLE "notification" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"group_key" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_pref" (
	"user_id" text,
	"type" text,
	"enabled" boolean NOT NULL,
	CONSTRAINT "notification_pref_pkey" PRIMARY KEY("user_id","type")
);
--> statement-breakpoint
CREATE TABLE "want_alert_sent" (
	"want_list_id" integer,
	"source_list_id" integer,
	"collection_slug" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "want_alert_sent_pkey" PRIMARY KEY("want_list_id","source_list_id","collection_slug")
);
--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "match_alerts" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX "notification_user_created_idx" ON "notification" ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "notification_unread_group_uniq" ON "notification" ("user_id","group_key") WHERE read_at IS NULL;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notification_pref" ADD CONSTRAINT "notification_pref_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
CREATE TABLE "list_rule" (
	"id" serial PRIMARY KEY,
	"list_id" integer NOT NULL,
	"kind" text NOT NULL,
	"artist" text NOT NULL,
	"season" text,
	"collection_no" text,
	"class" text,
	"editions" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"members" text[] DEFAULT '{}'::text[] NOT NULL,
	"prio" text[] DEFAULT '{}'::text[] NOT NULL,
	"skip_owned" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "list_rule_kind_chk" CHECK ("kind" IN ('collection', 'set'))
);
--> statement-breakpoint
ALTER TABLE "list_entries" ADD COLUMN "rule_id" integer;--> statement-breakpoint
CREATE INDEX "list_entries_rule_idx" ON "list_entries" ("rule_id") WHERE rule_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "list_rule_list_idx" ON "list_rule" ("list_id");--> statement-breakpoint
ALTER TABLE "list_entries" ADD CONSTRAINT "list_entries_rule_id_list_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "list_rule"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "list_rule" ADD CONSTRAINT "list_rule_list_id_lists_id_fkey" FOREIGN KEY ("list_id") REFERENCES "lists"("id") ON DELETE CASCADE;
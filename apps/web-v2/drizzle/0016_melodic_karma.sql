CREATE TABLE "profile_list_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"list_id" integer NOT NULL,
	"token_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_list" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"slug" varchar(12) NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile_list_entries" ADD CONSTRAINT "profile_list_entries_list_id_profile_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."profile_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_list_entries_list_idx" ON "profile_list_entries" USING btree ("list_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_list_slug_idx" ON "profile_list" USING btree ("slug");
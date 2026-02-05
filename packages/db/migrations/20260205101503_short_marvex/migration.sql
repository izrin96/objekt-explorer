ALTER TABLE "profile_list_entries" ADD COLUMN "objekt_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_list" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_list" ADD COLUMN "grid_columns" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "profile_list_entries_objekt_id_unique" ON "profile_list_entries" ("list_id","objekt_id");--> statement-breakpoint
ALTER TABLE "profile_list" ADD CONSTRAINT "profile_list_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "profile_list_entries" ADD COLUMN "objekt_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_list" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_list" ADD COLUMN "grid_columns" integer;--> statement-breakpoint
ALTER TABLE "profile_list" ADD CONSTRAINT "profile_list_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
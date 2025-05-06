ALTER TABLE "user_address" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "user_address" ADD COLUMN "linked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_address" ADD CONSTRAINT "user_address_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_address_user_id_idx" ON "user_address" USING btree ("user_id");
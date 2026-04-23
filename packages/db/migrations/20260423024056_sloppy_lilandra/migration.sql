ALTER TABLE "list_entries" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lists" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pins" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at"::timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_address" ALTER COLUMN "linked_at" SET DATA TYPE timestamp with time zone USING "linked_at"::timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_address" ALTER COLUMN "last_cosmo_check" SET DATA TYPE timestamp with time zone USING "last_cosmo_check"::timestamp with time zone;
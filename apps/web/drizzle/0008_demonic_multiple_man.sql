CREATE TABLE "pins" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" "citext" NOT NULL,
	"token_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"order" integer
);
--> statement-breakpoint
ALTER TABLE "list_entries" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "list_entries" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "lists" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "lists" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_address" ALTER COLUMN "linked_at" SET DATA TYPE timestamp;--> statement-breakpoint
CREATE INDEX "pins_address_idx" ON "pins" USING btree ("address");
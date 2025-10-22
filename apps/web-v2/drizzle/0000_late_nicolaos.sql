CREATE EXTENSION IF NOT EXISTS "citext";

CREATE TABLE "access_token" (
	"id" serial PRIMARY KEY NOT NULL,
	"access_token" varchar NOT NULL,
	"refresh_token" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_address" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" "citext" NOT NULL,
	"nickname" "citext" NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_address_address_idx" ON "user_address" USING btree ("address");--> statement-breakpoint
CREATE INDEX "user_address_nickname_idx" ON "user_address" USING btree ("nickname");--> statement-breakpoint
CREATE UNIQUE INDEX "user_address_address_nickname_idx" ON "user_address" USING btree ("address","nickname");
CREATE TABLE "locked_objekts" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" "citext" NOT NULL,
	"tokenId" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX "locked_objekts_address_idx" ON "locked_objekts" USING btree ("address");
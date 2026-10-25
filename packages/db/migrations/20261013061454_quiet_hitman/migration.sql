CREATE TABLE "collection_price_history" (
	"collection_slug" varchar(255),
	"date" date,
	"floor_usd" real NOT NULL,
	"median_usd" real NOT NULL,
	"listing_count" integer NOT NULL,
	"priced_count" integer NOT NULL,
	CONSTRAINT "collection_price_history_pkey" PRIMARY KEY("collection_slug","date")
);
--> statement-breakpoint
CREATE INDEX "collection_price_history_date_idx" ON "collection_price_history" ("date");
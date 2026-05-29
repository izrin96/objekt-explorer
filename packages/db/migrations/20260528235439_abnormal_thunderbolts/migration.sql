CREATE TABLE "currency_rates" (
	"code" varchar(10) PRIMARY KEY,
	"rate" real NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "list_entries_collection_slug_idx" ON "list_entries" ("collection_slug");
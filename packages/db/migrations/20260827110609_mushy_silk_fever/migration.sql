ALTER TABLE "account" ADD COLUMN "issuer" text;--> statement-breakpoint
UPDATE "account" SET "issuer" = 'local:credential', "account_id" = "user_id" WHERE "provider_id" = 'credential';--> statement-breakpoint
UPDATE "account" SET "issuer" = 'local:oauth:' || "provider_id" WHERE "provider_id" <> 'credential';--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "account_issuer_accountId_idx" ON "account" ("issuer","account_id");

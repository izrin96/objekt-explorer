-- 20261007090544_drop_hide_user had its drop edited out to keep these until the trade branch was
-- live, and production recorded it as applied; schema.ts and the snapshots already lack both.
-- IF EXISTS: a database that ran that migration before the edit has neither column.
ALTER TABLE "lists" DROP COLUMN IF EXISTS "hide_user";--> statement-breakpoint
ALTER TABLE "user_address" DROP COLUMN IF EXISTS "hide_user";

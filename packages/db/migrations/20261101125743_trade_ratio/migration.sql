-- the checks scan each table under an exclusive lock; give up rather than queue behind a long read
SET LOCAL lock_timeout = '5s';--> statement-breakpoint
ALTER TABLE "list_entries" ADD COLUMN "ratio" smallint;--> statement-breakpoint
ALTER TABLE "list_rule" ADD COLUMN "ratio" smallint;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "ratio" smallint;--> statement-breakpoint
ALTER TABLE "list_entries" ADD CONSTRAINT "list_entries_ratio_range" CHECK ("ratio" BETWEEN 2 AND 5);--> statement-breakpoint
ALTER TABLE "list_rule" ADD CONSTRAINT "list_rule_ratio_range" CHECK ("ratio" BETWEEN 2 AND 5);--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_ratio_range" CHECK ("ratio" BETWEEN 2 AND 5);
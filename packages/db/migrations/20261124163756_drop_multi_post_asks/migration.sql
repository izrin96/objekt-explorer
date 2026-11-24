-- auth-schema.ts lost user.multi_post_asks in 20261115202725_retire_multi_post_asks, and no live
-- build reads it. DROP COLUMN takes "user" ACCESS EXCLUSIVE, which every signed-in request queues
-- behind, so give up after 3 s; rerun at a quiet time. IF EXISTS: a database may already lack the column.
SELECT set_config('lock_timeout', '3s', true);--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "multi_post_asks";

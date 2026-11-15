-- A lock this migration waits on would queue every later reader of lists behind it, so give up
-- after 3 s instead (the setting lasts to the end of the migrate transaction); rerun at a quiet time.
SELECT set_config('lock_timeout', '3s', true);--> statement-breakpoint
-- trade_post holds every post's pairing, and no build since 20261115092944_retire_linked_list_id
-- reads or writes this column. Dropping it takes its index lists_linked_list_id_idx and its
-- foreign key lists_linked_list_id_lists_id_fkey with it. IF EXISTS: a database may already lack it.
ALTER TABLE "lists" DROP COLUMN IF EXISTS "linked_list_id";

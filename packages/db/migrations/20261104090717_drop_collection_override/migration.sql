-- A lock this migration waits on would queue every later reader of the table behind it, so give up
-- after 3 s instead (the setting lasts to the end of the migrate transaction); rerun at a quiet time.
SELECT set_config('lock_timeout', '3s', true);--> statement-breakpoint
-- Staff colours now live on the indexer's collection row. Each override becomes an audit entry,
-- the history the replay script reads to put it on the row, then the table goes. Guarded, so a
-- database that never had the table runs this as a no-op.
DO $$
BEGIN
  IF to_regclass('public.collection_override') IS NOT NULL THEN
    INSERT INTO "mod_audit" ("actor_id", "action", "target_user_id", "detail", "created_at")
    SELECT "updated_by", 'collection_override', NULL,
      jsonb_build_object('slug', "slug",
        'before', jsonb_build_object('textColor', NULL, 'backgroundColor', NULL),
        'after', jsonb_build_object('textColor', "text_color", 'backgroundColor', "background_color")),
      now()
    FROM "collection_override";
    DROP TABLE "collection_override";
  END IF;
END $$;

-- Staff colour fixes live on the row; a non-null source holds the value the staff colour replaced.
-- Every ALTER sits behind an existence check: ALTER TABLE takes ACCESS EXCLUSIVE before it looks
-- at IF NOT EXISTS, and drizzle reruns a file applied by hand, so an unguarded rerun would still
-- queue every collection read behind it. The lock wait is capped at 5 s for the same reason; the
-- indexer then exits and its restart retries.
DO $$
BEGIN
  PERFORM set_config('lock_timeout', '5s', true);
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'collection' AND column_name = 'source_text_color'
  ) THEN
    ALTER TABLE "collection" ADD COLUMN "source_text_color" text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'collection' AND column_name = 'source_background_color'
  ) THEN
    ALTER TABLE "collection" ADD COLUMN "source_background_color" text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'collection_staff_colors' AND conrelid = '"collection"'::regclass
  ) THEN
    ALTER TABLE "collection" ADD CONSTRAINT "collection_staff_colors" CHECK (
      ("source_text_color" IS NULL OR "text_color" ~ '^#[0-9a-f]{6}$')
      AND ("source_background_color" IS NULL OR "background_color" ~ '^#[0-9a-f]{6}$')
    );
  END IF;
END $$;

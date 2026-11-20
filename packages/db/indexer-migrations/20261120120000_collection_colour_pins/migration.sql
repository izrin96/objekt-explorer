-- Staff colour pins: true keeps a staff colour over Cosmo's, null or false makes it a fill the
-- worker drops once Cosmo's colour equals it. Nullable, since the indexer's upsert writes NULL for
-- a field it never sets. Guarded and capped at a 5 s lock wait for the reasons given in
-- 20261104150000_collection_colour_source.
DO $$
BEGIN
  PERFORM set_config('lock_timeout', '5s', true);
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'collection' AND column_name = 'text_color_pinned'
  ) THEN
    ALTER TABLE "collection" ADD COLUMN "text_color_pinned" boolean;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'collection' AND column_name = 'background_color_pinned'
  ) THEN
    ALTER TABLE "collection" ADD COLUMN "background_color_pinned" boolean;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'collection_staff_pins' AND conrelid = '"collection"'::regclass
  ) THEN
    ALTER TABLE "collection" ADD CONSTRAINT "collection_staff_pins" CHECK (
      ("text_color_pinned" IS NOT TRUE OR "source_text_color" IS NOT NULL)
      AND ("background_color_pinned" IS NOT TRUE OR "source_background_color" IS NOT NULL)
    );
  END IF;
END $$;

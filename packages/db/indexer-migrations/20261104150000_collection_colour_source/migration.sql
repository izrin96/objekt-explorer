-- Staff colour fixes live on the row; a non-null source holds the value the staff colour replaced.
-- Idempotent, so a run by hand in production (with SET lock_timeout) leaves this a no-op on start.
ALTER TABLE "collection" ADD COLUMN IF NOT EXISTS "source_text_color" text;--> statement-breakpoint
ALTER TABLE "collection" ADD COLUMN IF NOT EXISTS "source_background_color" text;--> statement-breakpoint
DO $$
BEGIN
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

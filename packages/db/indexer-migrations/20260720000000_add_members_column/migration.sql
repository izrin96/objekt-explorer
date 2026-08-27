ALTER TABLE "collection" ADD COLUMN "members" text[] NOT NULL DEFAULT '{}';
UPDATE "collection" SET "members" = ARRAY["member"] WHERE "members" = '{}';
CREATE INDEX "idx_collection_members" ON "collection" USING gin ("members");

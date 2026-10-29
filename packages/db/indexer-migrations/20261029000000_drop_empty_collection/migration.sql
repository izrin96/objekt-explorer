-- the indexer no longer files objekts without metadata under this placeholder; a row that still
-- has objekts or transfers stays, so the cascade never removes them
DELETE FROM "collection" c
WHERE c."slug" = 'empty-collection'
  AND NOT EXISTS (SELECT 1 FROM "objekt" o WHERE o."collection_id" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "transfer" t WHERE t."collection_id" = c."id");

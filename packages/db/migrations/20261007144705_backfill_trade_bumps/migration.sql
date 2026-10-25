-- a list already discoverable joins Browse ordered by its last change
UPDATE "lists" SET "bumped_at" = "updated_at"
WHERE "discoverable" AND "bumped_at" IS NULL AND "list_type_new" IN ('have', 'want', 'sale');

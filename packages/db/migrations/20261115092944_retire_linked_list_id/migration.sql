-- Records only that schema.ts no longer has lists.linked_list_id, its index
-- lists_linked_list_id_idx and its foreign key. The column, its index and its values stay in the
-- database on purpose: the build live while this runs still writes the column. A later migration
-- drops it (DROP COLUMN IF EXISTS) once no live build does.
SELECT 1;

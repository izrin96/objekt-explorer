-- Records only that auth-schema.ts no longer has user.multi_post_asks. The column and its values
-- stay in the database on purpose: the build live while this runs still reads it, and its
-- NOT NULL DEFAULT true keeps Better Auth's insert of a new user working. A later migration
-- drops it (DROP COLUMN IF EXISTS) once no live build reads it.
SELECT 1;

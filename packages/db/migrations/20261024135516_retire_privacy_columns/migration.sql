-- Records only that schema.ts no longer has user_address.private_profile, private_serial,
-- hide_transfer and hide_nickname. The columns and their values stay in the database on purpose,
-- until the owner approves a later migration that drops them (DROP COLUMN IF EXISTS).
SELECT 1;

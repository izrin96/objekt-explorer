# @repo/db

Two databases, two schemas:

- **App** (`DATABASE_URL`): `src/schema.ts`, `src/auth-schema.ts`, `src/relation.ts`; migrations in `migrations/` from `db:generate`.
- **Indexer** (`INDEXER_DATABASE_URL`): `src/indexer/` mirrors the tables `apps/indexer` owns. Read from this side, written by the indexer and the worker; the web's one write is staff colours on `collection` (Collection colours). Its Drizzle-owned changes are **hand-written SQL** in `indexer-migrations/`, applied by the indexer on start after the Subsquid migrations (`apps/indexer/src/migrate-drizzle.ts`). `drizzle-kit generate` against `drizzle-indexer.config.ts` would diff against tables the indexer owns, so write those folders by hand.

## Production

The root `.env` is production for both databases. `.env.local` points `DATABASE_URL` at the local compose Postgres and `INDEXER_DATABASE_URL` at production with `default_transaction_read_only=on`; there is no local indexer. The `guard-prod-db` hook blocks `db:migrate` / `db:push` unless `.env.local` points `DATABASE_URL` at a local host, and blocks indexer schema writes always: those the user runs.

## Migrations run before the deploy

Pending migrations run before the new code is live: on the VPS, `docker compose run --build --rm migrate` (`--build`, or a stale image applies an old migration set and still exits 0), then bring up web and worker. The `migrate` service sits behind a compose profile, so `up` never starts it. It connects directly, never through pgbouncer: to the compose `postgres` by default, or to `MIGRATE_DATABASE_URL` when set. So each migration must work with the code still running from `main`: **expand, deploy, then contract**. Add a column, deploy the code that uses it, and drop the old column in a later migration once nothing live reads it. Drizzle v1 runs every migration folder whose name is not recorded, in any order, without a hash check, so a migration written after a column already left `schema.ts` needs `drizzle-kit generate --custom` (a plain generate finds no diff). Make such drops `IF EXISTS`, since a local database may already lack the column.

A column can leave `schema.ts` before it leaves the database: generate the migration so its snapshot drops the column, then replace its SQL with a no-op (`20261024135516_retire_privacy_columns`). Otherwise the next `db:generate` writes the `DROP COLUMN` into whatever change comes next. `user_address.private_profile`, `private_serial`, `hide_transfer` and `hide_nickname` are kept that way, values intact, until the owner approves their drop.

## Serial columns

`collection.serial_batches`, `serial_anchors` and `grid_fitted_at` are Drizzle-owned columns the worker writes (see `apps/worker/AGENTS.md`, Offline serials). `grid_fitted_at` (`20261108000000_add_grid_fitted_at`) is set while a collection's stored ranges come from a fitted grid and cleared when a rewrite no longer fits; the API's serial estimate reads it.

## Collection colours

Staff colour fixes live on the indexer's `collection` row: `text_color` and `background_color` hold the colour shown, and `source_text_color` / `source_background_color` (Drizzle-owned, `20261104150000_collection_colour_source`) hold the value a staff colour replaced, as the source gave it, null where the source applies. `collection_staff_colors` requires a staff-set colour to be lowercase `#` and six hex digits; a source stays unchecked, since 20 production rows hold malformed ones. The history is the app's `mod_audit` (`collection_override` entries); the worker's `replay-collection-colours.ts` puts it back on the rows after a resync. `.env.local`'s read-only indexer is what stops a local save from reaching production: it fails at the row lock and writes nothing, so keep `default_transaction_read_only=on` there.

## Link history

`address_link_event` is append-only and has no foreign key on `user_id` or `actor_id`: an event outlives its account. `user_address` stays the authority for the current holder. The backfill has two gaps: links made between its migration and the deploy, and past holders who never traded (only trade snapshots name them). `holdersOf` adds the current holder to cover the first.

## Indexer data

- `transfer` is the complete ownership history. A mint has `from` = the null address; a spin has `to` = the spin address.
- Ownership of address X at time T: `DISTINCT ON (objekt_id) … WHERE timestamp <= T AND (from = X OR to = X) ORDER BY objekt_id, timestamp DESC`, then keep the rows where `to = X`. Mints and spins need no special case.
- Production `transfer` also holds legacy Polygon-era rows from before Cosmo moved to Abstract, so it outnumbers any Abstract-only resync. Scope local-versus-production diffs to the Abstract era.
- `indexer` is `drizzle-orm/node-postgres`, so `indexer.execute(sql…)` returns `{ rows }`. Use it for Postgres-only SQL such as `DISTINCT ON`.

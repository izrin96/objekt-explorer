# @repo/db

Two databases, two schemas:

- **App** (`DATABASE_URL`): `src/schema.ts`, `src/auth-schema.ts`, `src/relation.ts`; migrations in `migrations/` from `db:generate`.
- **Indexer** (`INDEXER_DATABASE_URL`): `src/indexer/` mirrors the tables `apps/indexer` owns. Read from this side, written by the indexer and the worker. Its Drizzle-owned changes are **hand-written SQL** in `indexer-migrations/`, applied by the indexer on start after the Subsquid migrations (`apps/indexer/src/migrate-drizzle.ts`). `drizzle-kit generate` against `drizzle-indexer.config.ts` would diff against tables the indexer owns, so write those folders by hand.

## Production

The root `.env` is production for both databases. `.env.local` points `DATABASE_URL` at the local compose Postgres and `INDEXER_DATABASE_URL` at production with `default_transaction_read_only=on`; there is no local indexer. The `guard-prod-db` hook blocks `db:migrate` / `db:push` unless `.env.local` points `DATABASE_URL` at a local host, and blocks indexer schema writes always: those the user runs.

## Migrations run before the deploy

Pending migrations run before the new code is live, so each one must work with the code still running from `main`: **expand, deploy, then contract**. Add a column, deploy the code that uses it, and drop the old column in a later migration once nothing live reads it. Drizzle v1 runs every migration folder whose name is not recorded, in any order, without a hash check, so a migration written after a column already left `schema.ts` needs `drizzle-kit generate --custom` (a plain generate finds no diff). Make such drops `IF EXISTS`, since a local database may already lack the column.

## Link history

`address_link_event` is append-only and has no foreign key on `user_id` or `actor_id`: an event outlives its account. `user_address` stays the authority for the current holder. The backfill has two gaps: links made between its migration and the deploy, and past holders who never traded (only trade snapshots name them). `holdersOf` adds the current holder to cover the first.

## Indexer data

- `transfer` is the complete ownership history. A mint has `from` = the null address; a spin has `to` = the spin address.
- Ownership of address X at time T: `DISTINCT ON (objekt_id) … WHERE timestamp <= T AND (from = X OR to = X) ORDER BY objekt_id, timestamp DESC`, then keep the rows where `to = X`. Mints and spins need no special case.
- Production `transfer` also holds legacy Polygon-era rows from before Cosmo moved to Abstract, so it outnumbers any Abstract-only resync. Scope local-versus-production diffs to the Abstract era.
- `indexer` is `drizzle-orm/node-postgres`, so `indexer.execute(sql…)` returns `{ rows }`. Use it for Postgres-only SQL such as `DISTINCT ON`.

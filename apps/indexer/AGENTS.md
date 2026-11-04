# indexer

Subsquid processor that writes production data, so changes here are small, targeted, and agreed with the user before they are made. Proposals for broad refactors go to the user as optional, low-priority items. Known and deliberately left alone: the per-event `ctx.store.get` lookups in `src/main.ts`, and COMO self-transfers (`from === to`) adding the value when the owner is not already buffered in the chunk.

## Missing metadata

`collection`, `objekt` and `transfer` hold only metadata-backed rows. When Cosmo's metadata fetch fails for a token with no objekt, its transfer goes to `pending_transfer` (same id, plus block and log position), and every later transfer of a held token follows it there, even when its own fetch succeeds, so the mint replays first (`src/hold.ts`). A known objekt keeps its collection on a failed fetch; one with no collection is held like a new token. Held transfers get no outbox row and no live publish; the worker's `fix-collection` job replays them (`apps/worker/AGENTS.md`, Held transfers). A resync always fetches metadata: there is no flag to skip it.

## Schema changes

1. `schema.graphql`, then the matching TypeORM model in `src/model/generated/`.
2. A Subsquid migration in `db/migrations/` (`<timestamp>-Data.js`), written by hand.
3. Anything Drizzle-owned (columns or indexes the app adds on top) goes in `packages/db/indexer-migrations/` as hand-written SQL; see `packages/db/AGENTS.md`.
4. Mirror the result in `packages/db/src/indexer/schema.ts`.

The indexer applies both migration sets on start (`start` runs `squid-typeorm-migration apply`, then `migrate-drizzle`).

## Staff colours on `collection`

The web writes staff colours onto `collection` (`text_color`, `background_color` and their Drizzle-owned `source_*` columns; `packages/db/AGENTS.md`, Collection colours), under a row lock, while `handleCollection`'s upsert writes every model column back with the values it loaded. A staff save survives that only because each batch runs SERIALIZABLE (`TypeormDatabase` with no isolation level): a row changed after the batch began fails the upsert with 40001, and Subsquid reruns the batch, reloading the staff colour. Keep the batch SERIALIZABLE or REPEATABLE READ. The `source_*` columns are in `schema.graphql` and the model, like the `processed*` columns, so a generated Subsquid migration never drops them; nothing in the indexer sets them. Never write `text_color` or `background_color` of an existing row whose source column is set (for example by adding a colour to `collectionFields`): `collection_staff_colors` would fail that batch on every retry. After a resync from scratch, run the worker's `script/replay-collection-colours.ts` (`apps/worker/AGENTS.md`), or every collection shows its source colours.

## Resync scope

`START_BLOCK` (`src/env.ts`) sits tens of millions of blocks behind the tip, and early 2025 is dense (566,500 mints in one day). A from-scratch resync takes about a day; budget for that and read the current `START_BLOCK` rather than an earlier estimate.

## Production database

Postgres 18 on a Dokploy swarm service with its data on a named volume: **Reload** is safe, **Rebuild** is not. `pg_stat_statements` is installed; read it before any index decision. Build production indexes `CONCURRENTLY` by hand, then record the same change in `packages/db/indexer-migrations/` as `CREATE INDEX IF NOT EXISTS` or `DROP INDEX IF EXISTS`, so it is a no-op there and a fresh database gets the same index set (`20261104000000_match_prod_indexes` holds those made before).

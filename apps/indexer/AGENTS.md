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

## Resync scope

`START_BLOCK` (`src/env.ts`) sits tens of millions of blocks behind the tip, and early 2025 is dense (566,500 mints in one day). A from-scratch resync takes about a day; budget for that and read the current `START_BLOCK` rather than an earlier estimate.

## Production database

Postgres 18 on a Dokploy swarm service with its data on a named volume: **Reload** is safe, **Rebuild** is not. `pg_stat_statements` is installed; read it before any index decision. Build production indexes `CONCURRENTLY`. The spin partial indexes (`idx_objekt_spin_transferable` and its siblings) exist only in the database, with no migration.

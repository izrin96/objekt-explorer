# Proposal

## Why

When Cosmo's metadata API fails during a mint, the indexer files the objekt under a fake collection, `empty-collection`, and the worker moves it out hourly. That fake row leaks into every read: about 30 queries across `packages/api` and `apps/worker` carry `ne(collections.slug, "empty-collection")`, and any new query that forgets it shows a blank collection. Parking unresolved tokens in their own table keeps `collection`, `objekt` and `transfer` holding real data only.

## What Changes

- New indexer table `pending_transfer`: a transfer whose token has no metadata yet is held there with everything needed to replay it (transfer id, from, to, time, hash, block and log position).
- The indexer no longer creates an objekt or transfer without metadata. A failed fetch on a **new** token parks the transfer; every later transfer of a parked token is parked too, even if its own fetch succeeds, so the mint stays first. A failed fetch on a **known** objekt keeps its collection, as today.
- The worker's `fix-collection` job becomes a replay job: hourly and on startup it fetches metadata for parked tokens whose rows are final, then creates the collection if needed, inserts the objekt, its transfers and the outbox rows, applies any held transferability update, and deletes the parked rows, in one transaction.
- The trade verifier's view of how far the indexer has read stops just before the oldest parked transfer, so a held transfer never lets a deadline or expiry pass.
- `emptyMetadata`, the `SKIP_METADATA` flag, the stale-transfer fix and every `empty-collection` filter are removed, and the `empty-collection` collection row is deleted.
- **BREAKING (data):** objekts whose metadata never arrived are absent from `objekt` and `transfer` until replayed, instead of present under `empty-collection`. Every read already hid them, so nothing visible changes.

## Capabilities

### New Capabilities

- `indexer-objekts`: how the indexer and worker record objekts and transfers when Cosmo metadata is missing, and how held transfers are replayed.

### Modified Capabilities

- `web-verified-trades`: the Indexer delay requirement measures "read up to" as the moment before the oldest held transfer, not only the newest block.

## Routes

No route changes. Every route that reads objekts, collections or transfers (`/`, `/@{nickname}`, `/activity`, `/trade`, `/collection/{slug}`, `/api/v1/*`) shows the same data. The trade pages (`/trade/{id}`) can show the existing "indexer behind" strip while Cosmo is down and a held transfer is waiting.

## Non-goals

- No retry of the metadata fetch inside the indexer beyond today's 2 retries; the worker does the waiting.
- No change to how often metadata is fetched for transfers of known objekts.
- No backfill: production has 0 objekts and 0 transfers under `empty-collection` today, and no app-database row names that slug.
- No change to the realtime `transfers` channel: replayed transfers are not published, and the verifier sees them on its next 2-minute rescan.
- The `transfer` table gets no ordering column; only parked rows carry a log position.

## Impact

- `apps/indexer`: `schema.graphql`, a new model, a hand-written Subsquid migration, `src/main.ts`, `src/metadata.ts`, `src/parser.ts`, `src/env.ts`.
- `packages/db`: the indexer schema mirror and a data migration under `indexer-migrations/` deleting the `empty-collection` row.
- `apps/worker`: `job/collection.ts` rewritten, `trade-verifier/indexer-head.ts`, and the `empty-collection` filters in jobs and scripts.
- `packages/api`: the filters in the objekt, collection, owned, rarity, transfers, activity, trade-feed and offer-picker services.
- `packages/cosmo`: `emptyMetadata` removed.
- Deploy order matters: indexer with the table, then worker, then a check for 0 parked rows, then the filter removal and the row delete.

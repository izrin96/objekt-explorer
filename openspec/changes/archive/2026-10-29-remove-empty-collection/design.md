# Design

## Context

The indexer (`apps/indexer/src/main.ts`) fetches Cosmo metadata for every transfer in a chunk. `fetchMetadata` never throws: on failure it returns `emptyMetadata`, so `handleCollection` files a new token under the slug `empty-collection` and `handleObjekt` creates it with serial 0. A known objekt keeps its collection (`main.ts:77`). The worker's `fix-collection` job (`apps/worker/src/job/collection.ts`, hourly and on startup) refetches v3 metadata for objekts in `empty-collection`, creates missing collections, and moves the objekt and its transfers.

Constraints that shape the design:

- The processor runs with `supportHotBlocks: true` and `RPC_FINALITY` 60. Rows written through `ctx.store` roll back on a reorg; rows the worker writes do not.
- Subsquid writes each batch in one `SERIALIZABLE` transaction. The worker already writes `objekt`, `transfer` and `collection` beside it.
- Transfers carry no chain position: `parser.ts` gives each a UUIDv7 id in log order, but `transfer` has no block or log column.
- Pending transferability changes live in `transferability_update` with `applied_at` null, applied only by `applyPendingTransferabilityUpdates` when the indexer creates an objekt. The Drizzle mirror (`packages/db/src/indexer/schema.ts`) does not list that table.
- The trade verifier treats `squid_processor` height as `seenUntil` (`trade-verifier/indexer-head.ts`), and matches legs by collection id, so a transfer filed under `empty-collection` today is equally invisible to it.
- Production today: 0 objekts and 0 transfers in `empty-collection`, 0 outbox rows naming it, 0 app-database rows with that `collection_slug`, 1 unapplied `transferability_update`.

## Goals / Non-Goals

**Goals:**
- `collection`, `objekt` and `transfer` hold only metadata-backed rows; the ~30 read filters go.
- No transfer is lost or reordered while Cosmo is down.
- The verifier never counts a held transfer as seen.

**Non-Goals:**
- Fewer metadata fetches for known objekts.
- A live `transfers` publish for replayed transfers.

## Decisions

### 1. A Subsquid entity `PendingTransfer`, not a Drizzle table
Held rows are written inside the indexer's batch transaction, so they must roll back with a reorg. Only a Subsquid entity (`schema.graphql`, generated-style model, hand-written migration in `apps/indexer/db/migrations/`) gets that. Columns: `id` (the parsed transfer's UUIDv7, reused as the replayed `transfer.id` so the outbox `transferId` stays stable), `tokenId` (indexed), `from`, `to`, `timestamp`, `hash`, `blockNumber`, `logIndex`. The Drizzle mirror adds `pendingTransfers` and `transferabilityUpdates` for the worker.

Alternative: reuse `transferability_update`'s pattern on `transfer` with a nullable collection. Rejected by the user in favour of a separate table.

### 2. Parser carries chain position
`parseTransferEvent` adds `log.block.height` and `log.logIndex`. `parseBlocks` returns them beside each `Transfer` (the `Transfer` model gets no new columns), and `main.ts` uses them only when parking.

### 3. The indexer's hold rule
Per chunk, one batched `ctx.store.find(PendingTransfer, { tokenId: In(...) })`, plus a set of tokens parked earlier in the same chunk. For each transfer, in order:
1. Token held (in DB or parked this chunk) → park, whatever the fetch returned.
2. Objekt exists with a collection → record as today; on a failed fetch keep its collection, replacing the `EMPTY_COLLECTION` check. An objekt with no collection counts as unknown.
3. No objekt and the fetch failed → park.
4. Otherwise → record as today.

`fetchMetadata` returns `null` on failure instead of the fallback. Parked transfers write no outbox row and are not published. This adds one indexed query per chunk, not per event, so the known per-event `ctx.store.get` pattern stays as is.

### 4. The worker replays, only final rows
`fix-collection` keeps its tag, schedule, lock and `indexerWrites` gate; its body is replaced. Each run:
1. Reads tokens whose every pending row has `block_number <= max(squid_processor.status.height)` (hot rows excluded, since a reorg could undo them).
2. Fetches v3 metadata per token (`safeFetchMetadataV3`), batches of 50 as today.
3. For each resolved token, in one transaction: create the collection if missing (the existing `enrichUpdateMetadata` insert with `onConflictDoNothing` and re-select, kept), insert the objekt if missing with `mintedAt` from its mint row, set `owner`/`receivedAt` from the newest held row when newer than the objekt's, insert the transfers ordered by `(blockNumber, logIndex)`, insert outbox rows for non-mint transfers, apply the latest unapplied `transferability_update` and stamp all of them applied, delete the held rows.
4. Logs one `info` with the count replayed, one `warn` with the count still unresolved.

Each run also settles leftover transferability changes: a final, unapplied `transferability_update` whose objekt now exists (the indexer can record one while a replay of that token commits) is applied, unless a newer change is already applied, and stamped either way. Like held transfers, transferability changes are written by the worker only once final: the replay skips a change in a hot block, and the leftover pass skips a token with any change still hot.

Handling "objekt already exists" in step 3 makes the replay converge if the indexer parks one more transfer while a replay runs: the leftover row replays on top next run.

Alternative: the worker only stores fetched metadata and the indexer applies it on its next batch, keeping the indexer the sole writer. Rejected: the indexer would need a second code path run on every batch, and the worker already writes these tables today.

### 5. The verifier's head stops before the oldest held transfer
`readIndexerHead` caps `seenUntil` at one second before `min(pending_transfer.timestamp)` when any row exists. This keeps the `web-verified-trades` Indexer delay rule honest: while Cosmo is down, trade pages show the existing "behind" strip and expiries wait.

### 6. `SKIP_METADATA` and `emptyMetadata` are removed
The flag fed `emptyMetadata` to every transfer for fast diagnostic resyncs; under this design it would park the whole chain. It goes from `env.ts` and `docker-compose.yml`, and `emptyMetadata` from `packages/cosmo`.

### 7. Filters drop, the fake row goes last
Every `ne(collections.slug, "empty-collection")` and the `activity-batch.ts` skip are removed; the reads already inner-join `collection`, so nothing else changes. `fixStaleTransfers` is removed. A Drizzle-owned data migration in `packages/db/indexer-migrations/` deletes the `empty-collection` collection row only when no objekt or transfer still references it (a guarded `DELETE ... WHERE NOT EXISTS`), so a run against a database that still has some leaves the row and the cascade never fires.

## Risks / Trade-offs

- [Held objekts are invisible for up to an hour after Cosmo recovers, longer than today's "visible under a blank collection"] → Every read hid them already; the verifier cap keeps trades safe.
- [A long Cosmo outage holds `seenUntil` back and shows the "behind" strip on every trade page] → The strip already says nothing sent is lost; this is the honest state.
- [Worker and indexer write the same tables under different isolation] → The replay is idempotent and converges (Decision 4); a `SERIALIZABLE` conflict in the indexer restarts the processor, which resumes from its last committed block.
- [A token minted in a hot block and replayed before finality] → Only final rows replay (Decision 4).
- [Removing `SKIP_METADATA` slows diagnostic resyncs] → It was diagnostic-only; a resync with metadata is the supported path.

## Migration Plan

1. Deploy the indexer with the `pending_transfer` migration and the hold rule. Old worker keeps fixing any `empty-collection` rows already there.
2. Deploy the worker with the replay job and the head cap.
3. Read-only check: 0 objekts and 0 transfers under `empty-collection` (as done 2026-10-29).
4. Deploy `packages/api` and worker with the filters removed, and apply the guarded delete migration (needs approval).

Rollback: before step 4, redeploying the old indexer and worker is safe; held rows stay until the new worker returns. After step 4, the old indexer would recreate `empty-collection` and the filters would be gone, so roll back the whole set together.

# Tasks

## 1. Pending table

- [x] 1.1 Add `PendingTransfer` to `apps/indexer/schema.graphql` and its model in `src/model/generated/` (id varchar(36), token_id indexed, from, to, timestamp, hash, block_number, log_index), export it from `model/index.ts`; verify lint + typecheck + build pass for `indexer`
- [x] 1.2 Write the Subsquid migration `apps/indexer/db/migrations/<timestamp>-Data.js` creating `pending_transfer` and its `token_id` index, with a `down`; verify it applies on a local indexer database (local only, needs approval) and lint passes
- [x] 1.3 Mirror `pending_transfer` and `transferability_update` in `packages/db/src/indexer/schema.ts`; verify lint + typecheck pass for `@repo/db` and `worker`

## 2. Indexer holds transfers without metadata

- [x] 2.1 Carry `blockNumber` and `logIndex` from `parseTransferEvent` through `parseBlocks` beside each `Transfer` (no new `Transfer` column); verify lint + typecheck + build pass for `indexer`
- [x] 2.2 Put the hold decision (held token → park; known objekt → record, keep collection on failure; no objekt and no metadata → park; else record) in a pure module `apps/indexer/src/hold.ts` with `hold.test.ts` covering each spec scenario of "A held token stays held until replayed" and "Known objekts keep their collection"; verify `bun test` passes
- [x] 2.3 Make `fetchMetadata` return `null` on failure; in `main.ts` load held tokens per chunk with one `ctx.store.find`, track tokens parked in the chunk, park through `hold.ts` (insert `PendingTransfer` with the transfer's own id), skip outbox and publish for parked rows, and drop the `EMPTY_COLLECTION` check; verify lint + typecheck + build pass for `indexer`
- [x] 2.4 Remove `SKIP_METADATA` from `apps/indexer/src/env.ts` and `docker-compose.yml`, and `emptyMetadata` from `packages/cosmo/src/server/metadata.ts`; verify `grep -rn "emptyMetadata\|SKIP_METADATA"` finds nothing outside `openspec/` and lint + typecheck pass for `indexer` and `@repo/cosmo`
- [x] 2.5 Read-only verify against a local indexer run with metadata forced to fail for one token: the mint lands in `pending_transfer`, no objekt or `empty-collection` row is created (local only)

## 3. Worker replays held transfers

- [x] 3.1 Put the replay plan (order rows by block and log index; `mintedAt` from the mint row; `owner`/`receivedAt` from the newest row only when newer than an existing objekt; outbox rows for non-mint rows only; latest transferability change wins) in a pure module `apps/worker/src/lib/pending-replay.ts` with `pending-replay.test.ts` covering the "Held transfers are replayed" and "Replay applies held transferability" scenarios; verify `bun test` passes
- [x] 3.2 Rewrite `apps/worker/src/job/collection.ts` as the replay job: select tokens whose every held row is at or below `max(squid_processor.status.height)`, fetch v3 metadata in batches of 50, and per resolved token in one transaction create the collection (existing insert kept), upsert the objekt, insert transfers and outbox rows, stamp transferability updates applied, delete the held rows; one `info` for replayed, one `warn` for still unresolved; remove `fixStaleTransfers`; verify lint + typecheck + build pass for `worker`
- [x] 3.3 Rename the export and its registration in `apps/worker/src/index.ts` (tag stays `fix-collection`, hourly + startup, under `indexerWrites`); verify lint + typecheck pass for `worker`
- [x] 3.4 Cap `seenUntil` in `trade-verifier/indexer-head.ts` at one second before `min(pending_transfer.timestamp)` when rows exist; verify lint + typecheck pass for `worker`, and read-only verify the query returns the uncapped head on production (0 held rows)
- [x] 3.5 Read-only verify the replay against a local indexer database holding one parked mint and send: objekt, both transfers, one outbox row created, held rows gone (local only)

## 4. Remove the empty-collection filters

- [x] 4.1 Remove every `ne(collections.slug, "empty-collection")` and the `activity-batch.ts` skip in `packages/api/src/services/`; verify `grep -rn "empty-collection" packages/api` finds nothing and lint + typecheck + test pass for `@repo/api`, and build passes for `web`
- [x] 4.2 Remove the filters in `apps/worker/src/job/` (`populate-serial`, `populate-rarity`, `process-collection-images`, `verify-batch-boundaries`) and `src/script/` (`serial-anchor`, `backfill-offline-serials`, `refine-serial-batches`, `check-serial-order`); verify `grep -rn "empty-collection" apps/worker` finds nothing and lint + typecheck + build pass for `worker`
- [x] 4.3 Add `packages/db/indexer-migrations/<timestamp>_drop_empty_collection/migration.sql` deleting the `empty-collection` collection row only when no objekt or transfer references it; verify it applies on a local indexer database (local only, needs approval) and lint passes for `@repo/db`

## 5. Docs and integration

- [x] 5.1 Read-only verify production before rollout: 0 objekts and 0 transfers under `empty-collection`, and 0 app-database rows with `collection_slug = 'empty-collection'`
- [x] 5.2 Update `apps/indexer/AGENTS.md` (hold rule, `pending_transfer`, no `SKIP_METADATA`), `apps/worker/AGENTS.md` (replay job, finality rule, head cap), and `packages/db/AGENTS.md` if the mirror note changes; state that `packages/api/AGENTS.md` and `packages/cosmo` need no change unless they mention the slug; verify `bun run check` passes

## Workflow follow-up

- Deploy in the order of design.md's Migration Plan; migrations on staging and production need explicit approval.
- Archive the change after the browser and production checks.

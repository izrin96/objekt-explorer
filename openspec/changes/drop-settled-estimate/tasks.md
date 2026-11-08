# Tasks

## 1. Schema

- [x] 1.1 Add `gridFittedAt: timestamp("grid_fitted_at", { withTimezone: true, mode: "string" })` (nullable) to `collections` in `packages/db/src/indexer/schema.ts`, with a one-line comment that it is Drizzle-owned and set once by the worker. Add `gridFittedAt: DateTime` to `apps/indexer/schema.graphql` and the TypeORM model in `src/model/generated/collection.model.ts`, as `serialAnchors` is, so a generated Subsquid migration never drops it. Write `packages/db/indexer-migrations/<timestamp>_add_grid_fitted_at/migration.sql` by hand (`ADD COLUMN IF NOT EXISTS`). Do not apply it. Verify that `bun run lint`, `typecheck` and `build` pass for `@repo/db`.

## 2. Shared open-drop rule

- [x] 2.1 Move `isGridDrop` into `packages/lib/src/serial.ts` and re-export it from the worker's `job/serial-batches.ts` so existing imports still work. Verify that `bun run check` passes for `@repo/lib` and `worker`.
- [x] 2.2 Add `OPEN_DROP_DAYS = 7` and `dropStillMinting({ fitted, firstCreatedAt, now })` to `@repo/lib/serial`, plus an optional `open` input on `estimateSerials` that ignores the ceiling, so `min` is the stored ranges' total (floored by the top serial) and `max` is null. Cover both in `serial.test.ts`: under 7 days and unfitted is open, fitted is closed, exactly 7 days is closed, and `open` drops the ceiling rounding. Verify that `bun run check` passes for `@repo/lib`.

## 3. Worker: record the fit

- [x] 3.1 Add the start pin to `loadDrop` in `job/serial-batches.ts` (`pinned`: true when token `start - 1` is minted and belongs to a collection outside the drop; its region read starts one token earlier, the way `loadMemberRuns` reads its runs). Verify with a read-only one-off against production that Cream02 356A (start 29549511) is pinned and Atom02 350A (start 14410334) is not, and that `bun run check` passes for `worker`.
- [x] 3.2 Change `applyGrids` to return `{ batches, fitted }` (a start-pinned drop fit or a run fit). Update `job/populate-serial.ts`, `job/verify-batch-boundaries.ts` and `script/refine-serial-batches.ts` to mark the written collection only (`grid_fitted_at = now()` where null) or clear it, in the same transaction as its ranges (`storeRanges`). Verify that `bun run check` passes for `worker`.
- [x] 3.3 Move the write that `script/drop-grid.ts`'s `review()` makes (merged ranges, serial updates, one transaction per drop or run) into `planGridWrites` / `applyGridWrites` in `job/serial-batches.ts`, which also sets the mark on every collection of a start-pinned drop or a fitted run where it is null, even with 0 changes. Make the script call it under `APPLY=1`, and add "not start-pinned" to the report of fitted drops that fail the pin. Verify that a read-only dry run of `script/drop-grid.ts Cream02 356A triples` (with `.env.local`) prints the same report as before, and that `bun run check` passes for `worker`.
- [x] 3.4 Add the open-drop step to `populateSerialOffline`. Run one grouped query for A drops of block seasons with `min(created_at)` under `OPEN_DROP_DAYS` and at least one unmarked collection, then `loadDrop` + `fitDropGrid` once each, then `applyGridWrites` on a fit whose drop is `pinned`. Put the drop-selection rule in a pure, tested helper if it carries any logic beyond the SQL. Verify that a read-only run of the selection query against production lists Cream02 355A triples, and that the step against the read-only `.env.local` reports 355A unfitted and writes nothing. Also verify that `bun run check` passes for `worker`.

## 4. API: read the mark

- [x] 4.1 In `fetchCollectionMetadata` (`packages/api/src/services/collection.ts`), select `collectionNo` and `artist` with the row. For a collection where `isGridDrop` holds, read `min(created_at)` and `bool_and(grid_fitted_at is not null)` over its drop's offline rows, and pass `open: dropStillMinting(...)` to `estimateSerials`. Check the query plan against production read-only (`EXPLAIN ANALYZE` with `default_transaction_read_only=on`) and record its time (2026-11-08: 0.27 ms on the `collection_no` index, Cream02 355A). Update the `serialEstimate` `.meta` description in `schemas/collections.ts` to say a drop still minting reads "at least". Verify that `bun run check` passes for `@repo/api`.

## 5. Docs

- [x] 5.1 Update `apps/worker/AGENTS.md` (Offline serials: the `grid_fitted_at` mark, the start pin and why it gates only the mark (Atom02 350A), the open-drop step, and that a write that loses the fit clears that collection's mark while the API needs every member marked), `packages/db/AGENTS.md` (the Drizzle-owned `grid_fitted_at` column beside the staff colour columns) and `packages/api/AGENTS.md` only if the estimate gets a section there (otherwise state that none changed). Verify that `bun run lint` and `bun run format` leave no diff.

## Workflow follow-up

- Deploy order is strict: the indexer first (it applies the migration on start; needs the user's approval), confirm `grid_fitted_at` exists with a read-only `\d collection`, and only then deploy the worker and the web. A web without the column fails every drawer open on an A drop, and a worker without it fails `settleOpenDrops` (non-fatal) and every range write.
- After the deploy, `settleOpenDrops` marks Cream02 356A on its first run (it is under 7 days old). `APPLY=1 src/script/drop-grid.ts` (with approval) then only adds marks to fitted member runs and older drops, which no reader needs yet.
- Done 2026-11-08 after the migration, in the local dev app (read-only production indexer): `cream02-sullin-355a` reads "Max serial (est.) ≥ 222", `cream02-kaede-348a` "≈ 3,400"; `cream02-yooyeon-356a` reads "≥ 400" until the worker marks it. Post-migration check (was task 4.2; it can't run before the column exists, since the dev server reads the production indexer): Verify in the running dev app (local web, read-only production indexer) that the drawer of `cream02-sullin-355a` shows "≥ N" under "Max serial (est.)" and that `cream02-yooyeon-356a` still shows its exact estimate. That 356A check only holds once 356A is marked, so before the backfill, check a drop older than 7 days instead. Also verify that `bun run build --filter=web` passes.
- Read-only check after deploy: Cream02 356A collections carry a mark, and 355A gains one within a populate run of its last member and a closing foreign mint.
- Archive with `/opsx:archive drop-settled-estimate`.

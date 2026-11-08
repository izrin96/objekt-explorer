# Design

## Context

See proposal.md (Why). The current state that shapes the approach:

- `estimateSerials` (`packages/lib/src/serial.ts`) already returns `max: null` for "at least min", and the drawer (`features/objekt/drawer/serials.tsx`) renders it as "≥ N". Only the API needs to choose it.
- `fetchCollectionMetadata` (`packages/api/src/services/collection.ts`) runs on every drawer open, so whatever it reads has to be cheap. Fitting a drop is not: `loadDrop` reads every token from the drop's start to up to `n × 5000 + 5000` above it.
- `applyGrids` (`apps/worker/src/job/serial-batches.ts`) is the single place a stored range picks up a grid. Populate calls it only when it rediscovers a collection (a token outside the stored ranges). The verifier calls it only on drift. A drop that becomes fittable without any member being rediscovered gets its grid only through `script/drop-grid.ts`.
- Grids are not sticky (`apps/worker/AGENTS.md`): a rediscovery that no longer fits goes back to the discovered ranges.
- A collection row appears at its first mint, so missing members can't be counted (production has 0 offline collections with no mint).

## Goals / Non-Goals

**Goals:**

- The drawer API answers "is this drop still minting?" with one indexed read over the drop's own collection rows.
- A drop's grid lands within one populate run of the drop becoming fittable.

**Non-Goals:**

- Marking member-major drops (Cream02 334A–337A) as settled through the new populate step. Their member runs are marked only when an existing write path applies the member grid, and otherwise read "≥ N" for 7 days.

## Decisions

### A stored fit time, not a live fit in the API

`collection.grid_fitted_at timestamptz` (nullable) is written by the worker and read by the API. The alternative, fitting the drop in `collections.metadata`, would read thousands of tokens on every drawer open and duplicate worker logic in `@repo/api`. A boolean was also considered. The timestamp costs the same and records when the drop closed, which helps when reviewing fits later.

The column is Drizzle-owned like `serial_anchors`: a hand-written `ALTER TABLE "collection" ADD COLUMN IF NOT EXISTS "grid_fitted_at" timestamptz;` in `packages/db/indexer-migrations/`, never `drizzle-kit generate`.

### The mark is written only together with grid ranges

The mark means "these stored ranges came from a fitted grid". It is written in the same transaction as the ranges, so a reader never sees the mark before the ranges it vouches for. `applyGrids` returns `{ batches, fitted }`. A caller that stores one collection's ranges (`storeRanges`) marks that collection when `fitted` (keeping an existing time) and clears it otherwise, in the same transaction. It never marks the rest of the drop: only this collection now holds its slot, and marking the others would vouch for ranges still discovered (a code review found that hole in an earlier draft). Writes that store every member's slot at once (`applyGridWrites`, from the open-drop step and `script/drop-grid.ts`) mark them all.

Clearing is per collection, since a rediscovery only knows the collection it rewrote. The other members keep their grid slots and marks until their own next write. So the API reads a drop as finished only when **every** collection of it is marked (`bool_and`). One cleared member puts the whole drop back to "≥ N", and the open-drop step selects it again while it's under 7 days old. The same rule makes a member-major drop read finished only once each member's run has been marked.

The verifier's per-run `dropSpanOf` cache already knows which drops fit. It was considered as a marking source, but it fits from stored ranges that may predate the grid, so marking from it could vouch for ranges that are still the discovered ones.

### A start pin before a drop is marked

A drop grid starts at its first minted member's first token, and nothing checks what sits before that start. When the member whose slot comes first has not minted, the grid can fit the rest and look complete. A read-only test on 2026-11-08 removed the first member's mints from each of the 43 fitted drops. Binary02 304A and 306A still fit from the second member's first mint, and 8 more fit from its stored start.

A drop is **start-pinned** when the token right before its start is a minted token of another collection. On the 43 fitted drops, 42 are pinned by a Z token. The pin rejects every false fit from the test except Atom02 328A in the stored-start case, where a separator sits right before the second member's slot (fitted slot 3997, real 4000); the first-mint case, which is how an open drop looks, does not hit it. The member grid already uses the same pin for its runs (`MemberRun.pinned`).

The pin gates only the mark and the open-drop step, never `fitDropGrid` itself. Atom02 350A is fitted with an unminted token before its start: putting the pin into the grid would send its ranges back to the discovered ones. It's old, so it needs no mark. `loadDrop` returns `pinned`, reading the owner of `start - 1` with its region, as `loadMemberRuns` does for runs.

### A roster check beside the pin

A review after the deploy showed the pin only catches a missing first member. When a middle member has not minted, the minted members can fit a single wrong slot size (a 3-member drop with B missing fits slot 150 for A and C instead of 100), and the open-drop step would write it to every member and mark them. So a drop is also required to be roster-complete: at least as many minted members as the largest other A drop of its season and artist, counting collection rows, which appear at a member's first mint. The season's own drops are the reference because rosters change between seasons (idntt went 7, 20, 15). A drop with no sibling in its season, and a subunit drop, never pass; they keep their discovered or rediscovered ranges, carry no mark and read "at least" until they are 7 days old, which is the safe failure. Like the pin, the check gates only the mark and the open-drop step, never `fitDropGrid`. A season whose only other A drops are subunits can still pass a full drop with a member missing; no such season exists today.

### An open-drop step in the populate job

`populateSerialOffline` gains a step before the per-collection loop:

1. List the A drops of block seasons with `min(created_at) > now() - 7 days` and `bool_or(grid_fitted_at IS NULL)`. This is one grouped query over `collection`, and it returns a handful of drops.
2. For each, `loadDrop` + `fitDropGrid` once. On a fit that is start-pinned, for each member, merge its slot (`mergeGridRanges`, as `script/drop-grid.ts` does), compute serial updates with its anchors (`computeOfflineSerialUpdates`) and write ranges, serials and the mark in one transaction per drop.

The write is the one `script/drop-grid.ts`'s `review()` makes, so it moves into `job/serial-batches.ts` as `planGridWrites` (ranges and serial updates per member) and `applyGridWrites` (one transaction, with the marks), which both call. That keeps a single source of truth for what "apply a fitted drop" writes.

The step uses only the drop grid. Adding member runs would mean `loadMemberRuns` for every member of every open drop on every run, about 24 times the reads for the rare member-major layout.

### The open-drop rule in `@repo/lib/serial`

A pure `dropStillMinting({ fitted, firstCreatedAt, now })` sits in `@repo/lib/serial` beside `estimateSerials`, with `OPEN_DROP_DAYS = 7`, and is tested. `isGridDrop` moves there from the worker (the worker re-exports it, as it already does `preBlockSeasons`), so the API and the worker share one definition of an A drop. `estimateSerials` takes an optional `open` flag that drops `max` to null. `fetchCollectionMetadata` reads `collection_no` and `artist` with the row it already loads and, for a grid drop only, runs one query: `min(created_at)` and `bool_and(grid_fitted_at IS NOT NULL)` over the offline rows of that season, collection number and artist. These are served by the existing `season` and `collection_no` indexes, and a drop has at most 24 rows.

### Seven days

Over the last 60 days, the last member minted at most 53 hours after the first (356A). Seven days leaves room for a slower drop, and limits how long a drop that never fits (single-member, interleaved) reads "≥ N".

## Risks / Trade-offs

- [The grid fits a drop that is still open] → A member missing in the middle shifts every later member a slot off, so the drop fails to fit. Missing members at the tail leave unminted tokens after the end, so the drop can't close. A missing first member is caught by the start pin. The 355A dry run today reports unfitted.
- [A false fit the pin misses: a separator right before the second member's slot, with the second member's first mint at its slot start (the Atom02 328A shape)] → The mark would then show the estimate as exact while a member is still to mint. This didn't occur in the first-mint test. The grid's ranges are written on rediscovery today whether or not this change lands.
- [Single-member and interleaved drops read "≥ N" for 7 days, even where today's estimate is right (artms 361A–365A are single-member)] → That's accepted as more honest than a wrong exact number. A one-member drop might still gain members.
- [The open-drop step writes production serials without an operator] → It's the same write rediscovery makes today after deploy, limited to drops under 7 days old with no known serials to contradict. Populate's `shiftedSerials` warning still logs moved serials.
- [A lost fit on a drop 7 days old or more] → The mark clears, but the API applies the open-drop rule only to drops under 7 days old, so the estimate comes from the discovered ranges as it does today. The worker's `shiftedSerials` warning shows the shift.
- [Member-major drops refit by the open-drop step every run for 7 days, though the drop grid never fits them] → That's one `loadDrop` per such drop per run, a handful of drops at most.
- [Old tabs] → No shape change; see the `api-serial-estimate` spec.

## Migration Plan

1. Merge. Deploy the indexer first: it applies `indexer-migrations/` on start (`gridFittedAt` is also in `schema.graphql` and the TypeORM model, so a generated Subsquid migration keeps it). Confirm the column read-only before the next step. This needs the user's approval for the production migration.
2. Deploy the worker and the web.
3. Backfill: `APPLY=1 bun run --env-file=../../.env src/script/drop-grid.ts` marks every currently fitted drop and run (0 serials expected to change). This needs the user's approval. Only drops younger than 7 days are affected by a missing mark, and `settleOpenDrops` marks those itself on its first run (Cream02 356A), so the backfill only adds marks no reader needs yet.
4. Rollback: deploy the previous worker and web. The column is nullable and unread by older code, so it can stay.

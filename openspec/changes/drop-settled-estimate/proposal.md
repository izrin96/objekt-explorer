# Proposal

## Why

While an A drop is still minting, the objekt drawer's "Max serial (est.)" shows a number that later turns out wrong. The indexer only learns a member's collection at its first mint, so a drop with members still to mint has reserved slots nobody can see. Each minted member's last range ends at its own newest mint, and the estimate rounds it to a block that may be wrong. Cream02 355A tripleS is the live case: 21 of 24 members minted 3.5 hours in.

A fixed time window doesn't fit. Over the last 60 days, the last member of a drop minted between 0.9 hours (348A) and 53 hours (356A) after the first. The drop grid already knows when a drop is complete: it fits only once every member has a mint in its slot and a minted foreign token closes the drop's end (355A is unfitted today).

## What Changes

- The worker records when a collection's reserved ranges were first written from a fitted grid (the drop grid or the member grid), in a new nullable `collection.grid_fitted_at` on the indexer database. The paths that already write grid ranges set it: the populate job, the daily verifier's rediscovery and `script/drop-grid.ts` under `APPLY=1`. A rewrite that no longer fits clears it.
- Each populate run also re-fits every A drop younger than 7 days that carries no mark. Today a drop gets its grid only when one of its members is rediscovered, so a drop closed by a foreign mint after its last member's mint waits for a drift fix. When it fits and the token right before it is a minted foreign token (so its first member has minted), the run writes the grid ranges and serials (as `APPLY=1` would) and marks the drop. The same start check gates every mark.
- `collections.metadata` returns `serialEstimate.max` as null ("at least min") for a collection of an A drop in a block season while any member of its drop lacks the mark and the drop's first collection is less than 7 days old. Older drops, Z collections, online collections and pre-block seasons keep today's estimate.
- No response shape changes. The drawer already renders `max: null` as "≥ N".

## Capabilities

### New Capabilities

- `api-serial-estimate`: the "Max serial (est.)" figure that `collections.metadata` returns (on `/rpc` and `/api/v1`), starting with how it reads for a drop that is still minting.

### Modified Capabilities

- `worker-offline-serials`: a grid fit is recorded on the collections it sets, so readers can tell a complete drop from one still minting; the populate job re-fits recent unmarked drops each run.

## Impact

- Route: `/` and every page that opens the objekt drawer (Serials tab), plus `/api/v1` `collections.metadata`.
- `packages/db`: a new column in `src/indexer/schema.ts` and a hand-written `indexer-migrations/` folder, applied by the indexer on start. Applying it to production needs the user's approval.
- `apps/worker`: `applyGrids` reports which collections its fit covers; `job/populate-serial.ts`, `job/verify-batch-boundaries.ts` and `script/drop-grid.ts` store the mark; `populateSerialOffline` gains the open-drop step, which writes production serials automatically once deployed, as rediscovery already does.
- `packages/api`: `fetchCollectionMetadata` in `services/collection.ts` reads the drop's mark and age.
- Deploy order: indexer (migration), then the worker and web. Backfill: one `APPLY=1` run of `script/drop-grid.ts` marks drops that are already fitted (needs approval).

## Non-goals

- Changing any serial or reserved range. The mark only records a fit that already happens.
- Z drops, online collections and pre-block seasons.
- New copy explaining "≥".
- Single-member drops: the grid never fits them, so they read "≥ N" for their first 7 days.

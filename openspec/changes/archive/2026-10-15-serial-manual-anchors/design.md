## Context

`computeOfflineSerials` (`apps/worker/src/lib/serial-math.ts`) already pins each stored batch with every pre-cutoff objekt that has a v1 serial: the nearest such anchor by tokenId gives `serial = anchor.serial + (tid - anchor.tid)`, and a batch without one chains from the previous batch's end. A manual anchor only has to join that list.

Offline serials are written from four places, each calling `computeOfflineSerials` or `computeOfflineSerialUpdates`:

- `job/populate-serial.ts` `processCollectionOffline`: every 5 minutes, only for collections holding an objekt with serial 0. It recomputes every post-cutoff serial of the collection.
- `job/verify-batch-boundaries.ts`: weekly. It probes unanchored batches and, on drift, rediscovers the collection and rewrites its serials.
- `script/refine-serial-batches.ts`: writes refined batches and serials, and measures the block rules with v1 anchors hidden.
- `script/backfill-offline-serials.ts`: full rediscovery for collections without stored batches.

Batches live in `collection.serial_batches` (indexer database, jsonb, hand-written migration `20260711000000_add_serial_batches`).

## Goals / Non-Goals

**Goals:**
- A caller that forgets the anchors fails to type-check rather than silently reverting serials.
- Adding an anchor is one operator command, with a dry run that shows the effect first.

**Non-Goals:**
- Changing how batches are discovered or refined. An anchor corrects numbering inside the batches we already have. It never moves a batch boundary.

## Decisions

**Store anchors as `collection.serial_anchors jsonb`, beside `serial_batches`.** Shape: `{ tokenId: number; serial: number; note: string; addedAt: string }[]`. Every write path already reads the collection row for its batches, so the anchors come with the same select. A collection gets a handful of reports at most.
- *Alternative: a table in the app database.* Rejected. The worker computes serials from the indexer database only, and serial state already lives there.
- *Alternative: a new indexer table.* Rejected. It needs a join for a few rows per collection, and its own migration and schema mirror, with no gain over the column.

**Make the anchors a required argument.** `computeOfflineSerials(objekts, batches, cutoffMs, manualAnchors)` and `computeOfflineSerialUpdates(rows, batches, manualAnchors)` take `{ tokenId: number; serial: number }[]` with no default. Type-checking then lists every caller, which is the spec's "no serial write reverts an anchor" requirement. The refine script's holdout measurement passes `[]` on purpose, because it scores the block rules with all ground truth hidden.
- *Alternative: an optional parameter defaulting to `[]`.* Rejected. A missed caller would quietly undo a correction on its next run.

**Manual anchors merge into the existing per-batch anchor lists.** A manual anchor in no stored batch is ignored by the computation, and the script refuses to add one. On the same token, the v1 serial wins. The script refuses that case too, so it only matters as a guard. Nothing else changes: nearest-anchor numbering, the chaining of anchorless batches, and the `serial > 0` filter.

**The verifier counts a manual anchor as an anchor.** `isAnchored` in `verify-batch-boundaries.ts` checks the collection's manual anchors as well as v1 objekts. When it does rediscover a collection, it passes the anchors to the recompute.

**One script, `apps/worker/src/script/serial-anchor.ts`, with subcommands.**
- `add <tokenId> <serial> <note…>` adds an anchor, or replaces the one already on that token.
- `remove <tokenId>` removes one.
- `list [slug]` prints anchors for one collection, or for every collection that has any.

It follows the scripts that already exist. It runs with `bun run --env-file=../../.env src/script/serial-anchor.ts …`, is a dry run by default and writes only with `APPLY=1`. The dry run prints:
- the collection slug, the objekt's current serial, and the anchor already on that token if there is one;
- how many serials would change, with the minimum and maximum change;
- the first few changes as `tokenId: old → new`.

With `APPLY=1`, the anchor update and the serial rewrite happen in one indexer transaction. `writeSerialUpdates` gets an optional transaction argument so the script can share its transaction; the existing callers keep their own. The script loads every objekt of the collection with no mint delay, because an operator runs it on purpose. After the write it reads the collection back and confirms there are zero remaining differences.

**Refusals are checked before anything is written.** The script refuses:
- a token not in the indexer;
- a token in a collection that is neither offline nor pre-assigned;
- a token minted before the cutoff;
- a serial below 1;
- a collection with no stored batches yet ("wait for the populate job");
- a token outside every stored batch;
- any objekt in the anchored batch whose computed serial would fall below 1.

These are pure checks against the rows already loaded. Each one lives in `lib/serial-math.ts` beside a test, so the script stays thin.

## Risks / Trade-offs

- **The populate job runs without a lock.** A run that read the collection before the anchor was committed could write serials that ignore it. → It only touches collections with new mints, and on its next run it recomputes every serial with the anchor, so the race fixes itself within 5 minutes. The script's read-back after applying shows a revert if one happens.
- **Anchors are the one serial input that can't be rediscovered.** If the indexer database were rebuilt, `serial_batches` can be rediscovered from Cosmo but the anchors would be lost. → `list` prints anchors as ready-to-run `add` commands, so they can be kept and replayed.
- **A wrong report propagates to the whole batch.** → The dry run shows the full effect before anything is written, and `remove` undoes it in one run.
- **A collection whose stored batch wrongly spans a foreign gap.** An anchor still corrects the side of the gap it sits on. Objekts on the other side take the nearest anchor, which may be across the gap. → That is the same exposure v1 anchors already have, and refine and verify keep fixing batch shapes independently.

## Migration Plan

1. Hand-written `packages/db/indexer-migrations/<timestamp>_add_serial_anchors/migration.sql`: `ALTER TABLE "collection" ADD COLUMN IF NOT EXISTS "serial_anchors" jsonb;`, and the column in `src/indexer/schema.ts`. Indexer schema writes are blocked by the `guard-prod-db` hook: the user applies it, and it runs when the indexer starts.
2. Deploy the worker only after the column exists. The indexer applies the migration on start, so deploy the indexer first, or at the latest together with the worker. Every serial job selects `serial_anchors`, so a worker running before the migration fails each 5-minute populate run until the migration lands. Once the column exists, a null value reads as `[]`.
3. The user runs the script for the confirmed report (`add 29519351 38 "<source>"`): dry run first, then `APPLY=1`.

Rollback: removing anchors with the script restores the estimates. The column can stay, because nothing else reads it.

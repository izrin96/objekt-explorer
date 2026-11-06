# Proposal

## Why

Some block-season A drops are reserved member by member: one member's collections of the drop (Cream02 334A, 335A, 336A, 337A) sit back to back in equal slots, then the next member's. The drop grid groups by collection number, so it never fits these drops. Discovery cannot see where one of a member's collections ends and the next begins, so the slack moves into the later collections' heads and their serials come out too high. Cream02 334A–337A has no v1 serial, and a read-only dry run puts 2,366 of its 9,688 serials 1 to 92 too high.

The same layout exists before the v1 cutoff (Cream02 304A–307A at 250, Binary02 339A–340A at 1350, Winter26 205A–208A at 200, Atom02 305A–308A at 370), which makes a holdout possible. On 140 member runs (62,530 v1 serials hidden), round slots with end slack get 55,991 exact, against 54,382 for the stored ranges. The three runs it broke all start right after a neighbouring A slot whose last copy is unminted; a run that starts right after a minted Z-collection token starts exactly in 643 of 654 first batches.

## What Changes

- A **member run** is one member's A collections of one block season whose minted tokens sit back to back, with no other A collection's minted token between them. Each collection gets an equal slot in token order, with foreign minted tokens skipped.
- The slot size is a multiple of 10. Up to 9 unseen tokens may follow the last slot before the first minted foreign token. A run fits only when exactly one size passes every rule.
- A run is fitted only when the token right before its start is a minted token of a Z collection.
- A collection in a grid-fitted drop is never part of a fitted member run; the drop grid keeps precedence.
- Every process that writes offline ranges applies the member grid after the drop grid. The verifier skips Cosmo edge probes inside a fitted run.
- `script/drop-grid.ts` reports member runs beside drops and applies them only under `APPLY=1`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `worker-offline-serials`: adds the member-run grid, its fit rules and start guard, its precedence below the drop grid, and its place in every range write, the verifier's probe skip and the review script.

## Impact

- Routes: none. The change is in `apps/worker` only. The web reads the rewritten serials as before.
- Code: `apps/worker/src/lib/drop-grid.ts` (the pure fit, beside `fitDropGrid`), `job/serial-batches.ts` (loading a run and applying it), `job/populate-serial.ts`, `job/verify-batch-boundaries.ts`, `script/refine-serial-batches.ts` and `script/drop-grid.ts`.
- Data: on production, only the `APPLY=1` run writes `collection.serial_batches` and `objekt.serial` (indexer database). Deploying the worker also applies every fitted run the next time a collection's ranges are rewritten, so the dry run is reviewed before the deploy.
- No migration and no new dependency.

## Non-goals

- Drops reserved by collection number but split across token regions (Cream02 334A–337A's second November region, JiWoo to HaYeon). These need the drop grid fitted per region, which is a separate change.
- Runs whose start follows a neighbouring A slot (Cream02 304A–307A's interleaved members, Cream02 DaHyun 334A–337A). A slot-stream model that pins each start from the previous slot's end is left for later.
- Pre-block seasons and Atom01.
- The printed-estimate stat in the objekt drawer. It reads the stored ranges and will pick up the corrected ones, but it ships on its own.

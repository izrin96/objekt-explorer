# Proposal

## Why

Unanchored offline serials, meaning every post-cutoff drop with no reported serial, are estimated per collection. A member with few mints gets a range that starts right after its neighbour's last mint, so its serials come out far too high. Example: `cream02-yooyeon-356a` token 29551197 shows #353, and the collector reports #87.

Modhaus reserves an "A" drop as one equal-sized slot per member, laid out in member order. Using that drop-wide shape fixes every member at once, before anyone reports a serial.

The shape was measured in a read-only holdout over all 100 A drops from Atom02 onward, with known serials hidden. On the 42 drops where exactly one slot size fits, it got 84,104 of 84,105 known serials right. The current method got 79,349, and the grid was worse on none of them. The single miss is Cream02 348A HaYeon (−6), which the current method also misses. The grid also predicts YooYeon #87 without using the report.

## What Changes

- A **drop grid** step works out the reserved slot of every member of an A drop from indexer data. It runs only when exactly one slot size fits, and the drop is then called **grid-fitted**:
  - every minted member token lands in its own member's slot;
  - every member has at least one mint in its slot;
  - the token right after the drop's end is a minted token of another collection.
- For a grid-fitted drop, each member's batches inside the drop are replaced by its slot. Batches outside the drop (restocks) are kept as discovered. Every drop that does not fit keeps today's batches.
- Every path that writes `serial_batches` applies the grid after `refineBatches`: the populate job, the weekly verifier, and the refine script. A rediscovery therefore cannot undo it.
- The weekly verifier skips its Cosmo API edge probes for batches set by a grid-fitted drop: foreign tokens on both sides of the drop already confirm those edges. Its indexer check for a foreign token minted inside a stored range still runs on them.
- v1 serials and manual anchors keep pinning their batch exactly as today. The grid only moves batch ranges.
- A dry-run-first script, `script/drop-grid.ts`, reports each drop's verdict, holdout score and the serials that would change, and writes only with `APPLY=1`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `worker-offline-serials`: unanchored batches of an A drop are taken from the drop grid when it fits, and an operator can review and apply the grid per drop.

## Impact

- `apps/worker`: a new pure module `lib/drop-grid.ts` with its test, a drop-level step in `job/serial-batches.ts`, its callers (`job/populate-serial.ts`, `job/verify-batch-boundaries.ts`, `script/refine-serial-batches.ts`), and the new script `script/drop-grid.ts`.
- Indexer database: there is no schema change. Writes to `collection.serial_batches` and `objekt.serial` happen in production only through the script's `APPLY=1` run or the job after deploy, each needing the user's approval.
- Routes: none change; serials on objekt pages, profiles and the market do.
- The fitted drops whose serials change have no known serial to check: Cream02 348A (apart from its HaYeon anchor), 351A, 352A and 356A, and Summer26 211A.

## Non-goals

- Drops where more than one slot size fits, or none does: one-member drops, drops whose members are mixed into each other (Summer25 210–214A, Winter26 203/205/206A), and drops whose members hold many separate ranges (Atom02 301–308A, Binary02 301A). These keep the current method.
- Explaining the Cream02 348A HaYeon offset; its anchor stays the fix.
- "Z" drops, online collections, pre-block seasons, and marking estimated serials in the UI.
- Anchoring 29551197 = #87 (user said hold off).

# Design

## Context

Offline reserved ranges are worked out one collection at a time:

1. `discoverBatches` (`job/serial-batches.ts`) probes the Cosmo API.
2. `refineBatches` claims reserved gaps and snaps lengths to 100-blocks.
3. `computeOfflineSerials` (`lib/serial-math.ts`) chains serials from the ranges, pinned by v1 serials and manual anchors.

The populate job, the weekly verifier and `script/refine-serial-batches.ts` all store ranges through this pipeline.

Cosmo's API answers 404 for an unminted token, so discovery cannot tell which collection owns one. When a member has few mints, its backward scan runs through the unminted tokens until it reaches the previous member's last mint. Its range therefore starts too low and its serials come out too high: 356A YooYeon shows #353 where the truth is #87.

The read-only holdout behind this design (proposal, Why) scored the grid against hidden v1 serials. Its fit rules are the ones specified here.

## Goals / Non-Goals

**Goals:** set each member's range from the drop-wide grid whenever exactly one slot size fits, through every path that writes ranges, with a dry-run report before any production write.

**Non-Goals:** see the proposal. No schema change, and no change to how serials are computed from ranges.

## Decisions

### The fit is a pure function in `lib/drop-grid.ts`

`fitDropGrid` decides whether a drop is grid-fitted and returns each member's ranges. It takes:

- the drop start;
- the members' sorted token ids, in member order;
- the region's minted tokens, each tagged with its member index, or as foreign.

It returns `{ slot, end, ranges: Batch[][] }` when exactly one slot size fits, and `null` otherwise. It has no database access, so it is tested in `drop-grid.test.ts` like `serial-math.ts`. Fixtures are trimmed copies of real drops:

- Cream02 356A: slot 400, gives #87;
- Binary02 304A: slot 180;
- Summer25 211A: ambiguous, returns `null`;
- a drop whose next token is unminted: returns `null`.

**The walk.** For each slot size, the walk moves up from the drop start. It skips foreign minted tokens (separators) and counts every other token, minted or not, as a position. Position `p` belongs to member `⌊p / slot⌋` and has serial `p mod slot + 1`. The walk stops after `members × slot` positions.

**Candidate slot sizes** run from 1 to 5000, cut down without changing the result:

- **Lower bound.** Member 0's slot must reach its highest mint inside the drop, so the smallest size is the count of non-foreign tokens from the drop start to that mint.
- **Early exit.** A walk stops at the first member token that lands in another member's slot.

The Python holdout scanned every size with only the early exit, in under 4 minutes for all 100 drops. The bound keeps the job's per-drop cost in milliseconds.

**Ranges.** Each member's slot becomes one or more batches: a slot with a separator inside it is split around the separator. That way `computeOfflineSerials` keeps its rule that serials run on within a batch and chain across batches, and needs no change.

### Drop start and membership

- **Membership:** `season`, `collection_no` and `artist` equal, `collection_no` ends in `A`, `on_offline = 'offline'`, the season is not in `preBlockSeasons`, and the drop has at least two members.
- **Member order:** by lowest minted token.
- **Drop start:** the lowest stored range start of the first member. That member's start is the one discovery gets right, because its backward scan stops at the previous drop's foreign tokens. Holdout fits used exactly this start.

### `applyDropGrid` runs after `refineBatches` on every write path

`applyDropGrid(collectionId, batches)` in `job/serial-batches.ts` runs these steps:

1. Load the drop's members, their minted tokens, and every minted token from the drop start to the highest member token plus 5000. That lets the walk see the token after the drop's end.
2. Call `fitDropGrid`.
3. Return this member's batches, merged as follows:
   - batches that end before the drop start are kept;
   - batches that touch `[start, end]` are replaced by the slot ranges;
   - batches that start after the drop's end are kept (restocks).

With no fit, it returns `batches` unchanged.

It is called right after `refineBatches` in:

- `processCollectionOffline` (populate);
- the verifier's rediscovery;
- `script/refine-serial-batches.ts`.

So no path can store pre-grid ranges over grid ranges. All reads come from the indexer database, with no Cosmo API calls.

**Alternative rejected:** storing the grid on the collection (a new column) and shielding it from the verifier. That needs a hand-written indexer migration, plus a second rule the verifier must honour. Recomputing is idempotent, cheap, and heals itself when a later mint breaks the fit.

**Populate trigger.** The populate job calls `applyDropGrid` only for collections it already processes, those with a serial-0 objekt. A drop with no new mints is first brought onto the grid by the script's `APPLY=1` run.

### `script/drop-grid.ts` is the review gate

The script walks every A drop, or one drop given as `season collectionNo artist`. For each drop it prints:

- the verdict: fitted, ambiguous or unfitted;
- the slot size and separator count;
- the holdout result: known serials matched before and after. It reuses `refine-serial-batches.ts`'s cutoff-0 holdout. Move that helper to `lib/serial-math.ts` so both scripts share it;
- the count and range of the serial changes.

A dry run writes nothing. With `APPLY=1` it stores the ranges and rewrites serials (`writeSerialUpdates`, with manual anchors passed), fitted drops only.

### The verifier skips edge probes for grid-fitted drops

- **How:** the verifier fits each drop once per run (`loadDrop` + `fitDropGrid`, cached by drop key; indexer reads only). A batch inside the drop's span `[start, end]` counts as grid-set and drops out of the probe loop, the same way anchored batches already do. The indexer's "foreign token inside a stored range" query still covers it.
- **Why safe:** a foreign mint inside a slot breaks the fit or shows up in that query, so the Cosmo probes add nothing there.
- **What's lost:** a token Cosmo assigned to another collection but never minted on chain is now caught by neither check inside a slot. That risk is already listed for the fit itself.

## Risks / Trade-offs

- **Fitted but wrong.** Cream02 348A fits slot 3400, yet HaYeon is off by 6. A fit is strong evidence but not proof. Manual anchors still outrank the grid, and the dry run lists every fitted drop with no known serial, so the user can review it.
- **A foreign token mints inside a slot later.** The walk treats it as a separator and shifts the later slots by one. If the drop still fits, the shift is correct (separators take no serial). If it stops fitting, the drop falls back to discovered ranges and serials move back. That can only happen through the verifier's or the populate job's normal rewrite, never silently.
- **Unminted foreign tokens.** These are assigned by Cosmo but never minted on chain, so the indexer cannot see them. One inside a drop would shift serials without failing the fit. The holdout found none among the 42 fitted drops. The verifier's `knownForeign` list could feed `fitDropGrid` later if one turns up.
- **Drops still minting.** A new drop usually has an unminted tail, so the closing rule refuses it until the next drop's first foreign token mints. Until then its serials stay estimates from discovery.

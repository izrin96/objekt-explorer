## Why

Serials of offline objekts minted after the v1 cutoff are estimates. When a collector reports a serial they can see in Cosmo, we have no way to use it: Cream02 HaYeon 348A token 29519351 is confirmed #38 while the site shows #123, and every other HaYeon 348A serial is off by the same 85. A v1 serial already pins its whole batch exactly; a reported serial is the same kind of ground truth and should do the same.

## What Changes

- A collection can carry **manual serial anchors**: reported `(tokenId, serial)` pairs, each with a note on where the report came from.
- The offline serial computation treats a manual anchor exactly like a v1 anchor: it pins the serial numbering of the batch it falls in, and later anchorless batches chain from it.
- Every path that writes offline serials (the 5-minute populate job, the weekly batch-boundary verifier, the maintenance scripts) reads the anchors, so nothing reverts an anchored serial.
- The weekly verifier treats a manually anchored batch as shielded, as it does a v1-anchored one.
- A new operator script adds, lists and removes anchors. It is a dry run by default: it shows the collection, the objekt's current serial, and how many serials in the collection would change and by how much. With `APPLY=1` it stores the anchor and rewrites the collection's serials in one run.
- The script refuses an anchor that cannot be right: an unknown token, a token from an online collection, a pre-cutoff objekt (its v1 serial is already authoritative), a serial below 1, or one that would push another objekt in the batch below serial 1.

## Non-goals

- No web route or UI. Anchors are added by an operator from a user's report (Discord, DM); no report form, no moderation queue.
- The "estimated" serial marker (`isSerialEstimated`) is unchanged: an anchored post-cutoff serial is still shown as estimated. Marking it exact is a follow-up.
- No new estimation rule. The equal-slot drop model found while investigating this report (Cream02 348A, 351A, 352A) stays a separate decision.
- Online collections. Their serials come from mint order, not reserved batches.

Routes covered: none directly. The corrected serials surface wherever a serial is shown (objekt views, lists, trades, chat cards), all read from `objekt.serial`.

## Capabilities

### New Capabilities

- `worker-offline-serials`: how the worker numbers offline objekts minted after the v1 cutoff, starting with manual anchors: storing them, applying them in every serial write, and the operator script that manages them.

### Modified Capabilities

None. No existing spec covers serial numbering.

## Impact

- `packages/db`: a hand-written indexer migration adding `collection.serial_anchors jsonb`, and the column in `src/indexer/schema.ts`. The user runs the migration.
- `apps/worker`: `lib/serial-math.ts` (`computeOfflineSerials`, `computeOfflineSerialUpdates` take manual anchors) and its tests; `job/populate-serial.ts`, `job/verify-batch-boundaries.ts`, `script/refine-serial-batches.ts`, `script/backfill-offline-serials.ts` pass them; new `script/serial-anchor.ts`.
- Production data: writing an anchor rewrites that collection's post-cutoff serials. Only with `APPLY=1`, run by the user.

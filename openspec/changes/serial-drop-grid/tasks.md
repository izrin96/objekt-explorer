# Tasks

## 1. Grid fit

- [x] 1.1 Add `apps/worker/src/lib/drop-grid.ts` with `fitDropGrid` (design: "The fit is a pure function"). It walks slot sizes from the lower bound to 5000, uses the three fit rules, splits a slot around any separator inside it, and returns `null` unless exactly one size fits. Add `drop-grid.test.ts` with trimmed real fixtures: Cream02 356A (slot 400; token 29551197 at position 87 of YooYeon's slot), Binary02 304A (slot 180), an ambiguous drop, a drop whose next token is unminted, a mint in a neighbour's slot, a member with no mint in its slot, and a separator inside a slot. Verify `bun test apps/worker/src/lib/drop-grid.test.ts` passes, and lint and typecheck pass for `worker`.
- [x] 1.2 Move `holdoutExact` from `script/refine-serial-batches.ts` to `lib/serial-math.ts`, keeping its behaviour, with a test in `serial-math.test.ts`. Verify `bun test apps/worker/src/lib/serial-math.test.ts` passes, `refine-serial-batches.ts` still type-checks, and lint passes for `worker`.

## 2. Write paths

- [x] 2.1 Add `applyDropGrid(collectionId, batches)` to `job/serial-batches.ts` (design: "`applyDropGrid` runs after `refineBatches`"). It handles drop membership, the drop start, the indexer region read, and merging slot ranges with batches outside the drop. Put the merge in `lib/drop-grid.ts` as a pure function with tests: batches before the drop kept, batches touching it replaced, restocks after it kept, no fit returns the input unchanged. Verify `bun test apps/worker/src/lib/drop-grid.test.ts` passes, and lint and typecheck pass for `worker`.
- [x] 2.2 Call `applyDropGrid` right after `refineBatches` in `processCollectionOffline` (`job/populate-serial.ts`), in the verifier's rediscovery (`job/verify-batch-boundaries.ts`), and in `script/refine-serial-batches.ts`. Verify by grep that every `refineBatches` call is followed by `applyDropGrid`, and lint and typecheck pass for `worker`.
- [x] 2.3 Read-only check against the production indexer (the `.env.local` read-only URL): run `applyDropGrid` for `cream02-yooyeon-356a` from a scratch script outside the repo, compute serials with its anchors, and confirm token 29551197 comes out as 87, writing nothing. Record the result in this task. Result (2026-11-06, session `default_transaction_read_only = on`): stored `29550845–29551197` became `29551111–29551510`; token 29551197 → #87, token 29551194 → #84.

- [x] 2.4 In `verify-batch-boundaries.ts`, skip the Cosmo edge probes for batches inside a grid-fitted drop, fitting each drop once per run, and keep the indexer foreign-mint check. Put the "is this batch inside the drop span" test in `lib/drop-grid.ts` with tests. Verify the tests, lint and typecheck pass for `worker`, then run `DRY_RUN=1` read-only on prod and confirm its log shows no probes for the 356A members. Result (2026-11-06, read-only database, Cosmo API probes only): 2,933 collections checked, 0 drifted, 286 grid-fitted collections not probed, including all 24 Cream02 356A members.

## 3. Review script

- [x] 3.1 Add `apps/worker/src/script/drop-grid.ts` (design: "`script/drop-grid.ts` is the review gate"). It runs over every A drop or one `season collectionNo artist`. Per drop it prints the verdict, slot size, separator count, known serials matched before and after, and the count and range of the serial changes. It is a dry run unless `APPLY=1`; with `APPLY=1` it writes fitted drops only, passing manual anchors. Verify lint and typecheck pass for `worker`.
- [x] 3.2 Dry-run the script against the production indexer (read-only URL). Confirm the totals match the holdout: 42 fitted, 84,104 of 84,105 known serials matched, none worse than before. Confirm Cream02 356A reports slot 400 and 1 of 1 matched. List the fitted drops that have no known serials for the user. Do not run `APPLY=1`: that needs the user's approval for the specific run. Result (2026-11-06, read-only): 42 fitted, 7 ambiguous, 51 unfitted; known serials 84,102/84,103 (stored ranges 79,348). The holdout's 84,104/84,105 also counted the two reports not stored as anchors (356A YooYeon, Summer26 YeJoon). The one miss is the stored 348A HaYeon anchor, which still pins its batch. Cream02 356A: slot 400, YooYeon Δ −266 (#353 → #87). Fitted drops whose serials change, none with a known serial to check: Cream02 348A (10,581, apart from its one anchor), 352A (3,251), 351A (1,971), 356A (124), Summer26 211A (110), 16,037 in all. Every other fitted drop already numbers its serials as the grid does, but stores different ranges: 342 members across the 42 drops get new ranges. The fitted set is the same 42 drops as the holdout.

## 4. Docs and checks

- [x] 4.1 Update the Offline serials section of `apps/worker/AGENTS.md`. Cover the drop grid (what a grid-fitted drop is, that it runs after `refineBatches` on every range write, that anchors outrank it) and `script/drop-grid.ts` as the dry-run-first review gate. Verify the section reads correctly beside the existing anchor bullets. No other package's `AGENTS.md` changes.
- [x] 4.2 Run `bun run check`. It passes.

- [x] 4.3 Add one line about the probe skip to the Offline serials section of `apps/worker/AGENTS.md`, then run `bun run check`; it passes.

## Workflow follow-up

- With the user's approval, run `script/drop-grid.ts` with `APPLY=1` on production, for the drops the user picks. Cream02 351A/352A and the other fitted drops with no known serials are the user's call.
- Deploy the worker so the populate job and the verifier keep applying the grid.
- Afterwards, decide whether 29551197 = #87 is still needed as a manual anchor (the grid already gives #87).

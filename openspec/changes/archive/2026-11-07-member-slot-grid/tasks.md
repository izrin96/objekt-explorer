# Tasks

## 1. Pure fit (apps/worker/src/lib)

- [x] 1.1 Move the compressed-position helpers out of `fitDropGrid`'s closure into module functions in `lib/drop-grid.ts` (count of foreign tokens below a token, the real token at a compressed position, a slot split around separators), with `fitDropGrid` built on them. Verify: every existing test in `lib/drop-grid.test.ts` passes unchanged.
- [x] 1.2 Add `fitMemberRun(region)` and `MAX_RUN_SLACK = 9` to `lib/drop-grid.ts`, returning `{ slots, grid }` in the `DropGrid` shape. Tests in `drop-grid.test.ts`, one per rule: KaeDe-shaped 4 × 500 fits with `cream02-kaede-336a`'s slot at 27533650–27534149; 2 × 1350 plus 3 unminted tokens fits 1350, not 1352; 12 tokens of slack rules a size out; a run token inside the slack rules it out; a token in a neighbour's slot rules a size out; a collection with no token in its slot rules it out; two passing sizes give no grid; a separator inside a slot splits it. Verify: `bun test src/lib/drop-grid.test.ts`, then `bun run lint`, `bun run typecheck` and `bun run build` for `worker`.

## 2. Loader and application (apps/worker/src/job)

- [x] 2.1 Add `loadMemberRuns(key, override?)` and `fittedMemberRun(key, collectionId, override?)` to `job/serial-batches.ts` per design (one region read from the token before the start, joined to `collection`; runs split where another A collection's minted token lies between neighbours or they lie over 5000 tokens apart). Each run carries `pinned` and `heldByDrop`; `fittedMemberRun` returns null for a collection outside a run of two or more, an unpinned run, a run held by a fitted drop, or a run no single size fits. Verify: typecheck, and the dry run in 4.1 lists KaeDe 334A–337A as fitted and KaeDe 307A/305A as unpinned.
- [x] 2.2 Add `applyMemberGrid(collectionId, batches)` and call it right after `applyDropGrid` in `job/populate-serial.ts`, `job/verify-batch-boundaries.ts` (rediscovery) and `script/refine-serial-batches.ts`. Verify: grep shows every `applyDropGrid` call followed by `applyMemberGrid`; lint, typecheck and build for `worker`.
- [x] 2.3 In the verifier, add a per-run `runSpanOf` cache beside `dropSpanOf` and skip Cosmo probes for batches inside either span, counted in `gridSkipped`. Verify: a `DRY_RUN=1 PROBES=none` run with `WORKER_LOG_LEVEL=debug`, read-only against production, logs a fitted run's collection whose stored batch already lies inside its run (such as `cream02-kaede-337a`) as grid-skipped and writes nothing; lint, typecheck and build for `worker`.

## 3. Review script (apps/worker/src/script)

- [x] 3.1 Extend `script/drop-grid.ts` with the run section per design: the filter (a season alone, or season, collection number and artist), per-run verdict (fitted, ambiguous, unfitted, unpinned, held by a fitted drop), slot, foreign tokens inside, runs with more than 10 marked, known serials matched by stored ranges and by the member grid with anchors hidden, and serials to change. `APPLY=1` writes fitted runs after drops, one transaction per run. Update the script's header comment with the new usage. Verify: lint, typecheck and build for `worker`.

## 4. Production rollout (each write needs the user's approval)

- [x] 4.1 Read-only dry run of the script over every block season with `PGOPTIONS='-c default_transaction_read_only=on'`. Verify: no fitted run with v1 serials matches fewer of them than its stored ranges, and the report gives the runs fitted, the known serials matched before and after, and the serials that would change; share it with the user.
- [x] 4.2 With the user's approval, export `serial_batches` and every objekt serial of the fitted runs' collections to a local backup file outside the repo. Verify: the row counts in the file match the dry run's collections and objekts.
- [x] 4.3 With the user's approval, deploy the worker and run the script with `APPLY=1`. Verify: a rerun reports 0 serials to change, and `cream02-kaede-336a`'s range is 27533650–27534149.

## 5. Documentation

- [x] 5.1 Update `apps/worker/AGENTS.md` Offline serials: the member run (what it is, the multiple-of-10 sizes with up to 9 tokens of slack, the Z-pin guard, the drop grid's precedence, the verifier's probe skip, and the script's run section). The root `AGENTS.md` needs no change. Verify: the section names `fitMemberRun`, `applyMemberGrid` and the script's new usage, and `bun run check` passes.

## Workflow follow-up

- `/opsx:archive member-slot-grid` once 4.3 is done.
- Not in this change: the per-region drop grid for Cream02 334A–337A's second November region, and a slot-stream fit for interleaved drops such as Cream02 304A–307A.

# Design

## Context

The drop grid (`lib/drop-grid.ts`, `job/serial-batches.ts`) fits one season, collection number and artist at a time. `loadDrop` pools every member of that collection number, so a drop reserved member by member, or split across token regions, never fits. `applyDropGrid` runs after `refineBatches` in `job/populate-serial.ts`, `job/verify-batch-boundaries.ts` and `script/refine-serial-batches.ts`. The verifier caches each drop's span per run (`dropSpanOf`) and skips Cosmo edge probes inside it. `script/drop-grid.ts` is the review and apply tool.

The read-only research behind the rules is in proposal.md (Why); the rules themselves are in the spec delta.

## Goals / Non-Goals

**Goals:**

- Reuse the drop grid's compressed-position model and range merge for member runs, so a run's slot is built exactly as a drop's slot is.
- Make the member grid a pure, tested fit, with the database reads in one loader.

**Non-Goals:**

- No change to how the drop grid fits, and no change to a collection already in a grid-fitted drop.
- No per-run opt-in or denylist. A wrong fit is corrected the same way as a wrong drop fit: a manual anchor, which outranks the grid.

## Decisions

### A second pure fit beside `fitDropGrid`

`fitMemberRun(region)` goes in `lib/drop-grid.ts` and takes the same `DropRegion` shape (start, each collection's sorted tokens in run order, sorted foreign minted tokens, `readUntil`). It tries multiples of 10 up to `MAX_SLOT`, allows `MAX_RUN_SLACK = 9` tokens after the last slot, and returns `{ slots, grid }` with the same `DropGrid` shape, so `mergeGridRanges` and `insideDrop` apply unchanged. The compressed-position helpers (`foreignBelow`, the real token at a compressed position, splitting a slot around separators) move out of `fitDropGrid`'s closure into module functions both fits use.

Alternative: a `slack` and `step` option on `fitDropGrid`. Rejected: the end rule differs (a drop needs the next token to be foreign; a run allows slack but forbids its own tokens in it), and the shipped drop grid's verdicts must not move.

### The loader decides membership and the pin

`loadMemberRuns(key)` in `job/serial-batches.ts` reads the member's offline A collections of the same season and artist, with their tokens, orders them by lowest token, and splits them into runs where another A collection's minted token lies between two neighbours. It then reads the region from one token before the run's start to `readUntil`, joined to `collection` for the collection number, which gives in one read: the foreign tokens, whether another A collection sits between neighbours, and whether the token before the start belongs to a Z collection. Each run it returns carries whether its start is pinned and whether a fitted drop holds one of its collections; `fittedMemberRun` turns that into the run's grid or null. The pin and the precedence stay out of the pure fit, since they need collection numbers and the drop grid.

### `applyMemberGrid` runs after `applyDropGrid` on every range write

`applyMemberGrid(collectionId, batches)` returns the batches unchanged unless the collection is in a fitted run, and otherwise merges its slot with `mergeGridRanges`. The three callers of `applyDropGrid` call it right after. The precedence check fits each run member's drop once; the verifier keeps its per-run cache and adds `runSpanOf` beside `dropSpanOf`, and skips probes for batches inside either span.

### The review script reports runs beside drops

`script/drop-grid.ts` keeps its drop section and adds a run section for the same filter: with a season alone it lists every run of that season; with season, collection number and artist it lists the runs holding that drop's members. Each run prints its verdict, slot, separators inside, known serials matched by stored ranges and by the member grid with anchors hidden, and serials to change. `APPLY=1` writes fitted runs in one transaction per run, after the drops.

## Risks / Trade-offs

- [Deploying the worker applies every fitted run the next time a collection's ranges are rewritten, with no opt-in] → Review the full dry run before the deploy, back up the ranges and serials of every fitted run's collections, and run `APPLY=1` right after the deploy so the change lands in one reviewed step.
- [A run with many separators inside is a weak fit (Cream02 Lynn 334A–337A holds 54)] → The script marks runs with more than 10 foreign tokens inside, so the operator can add an anchor or hold the deploy.
- [The Z pin is 98% reliable, not certain (11 of 654 first batches started lower)] → A run with v1 serials shows any start error in the dry run's holdout, and a reported serial pins the rest.
- [Populate reads more: each collection with a new mint now loads its member's run and up to four drops] → Only collections whose stored batches change are rewritten, and the reads are indexed token ranges; the verifier caches per run.

## Migration Plan

1. Ship the code with the worker stopped from rewriting (the dry run is read-only and runs from a checkout).
2. Run `script/drop-grid.ts` dry over every block season; confirm that no run with v1 serials matches fewer of them than its stored ranges, and record the counts.
3. Export `serial_batches` and serials of every fitted run's collections to a local backup.
4. Deploy the worker, then run the script with `APPLY=1`. A rerun reports nothing to change.

Rollback: restore the backed-up ranges and serials, and revert the worker before its next populate run.

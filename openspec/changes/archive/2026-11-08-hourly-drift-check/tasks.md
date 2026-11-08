# Tasks

## 1. Matching mints to ranges

- [x] 1.1 Add `driftCandidates(tokens, ranges)` to `apps/worker/src/lib/drift-candidates.ts`: sort the ranges by start, keep a running maximum of ends, binary-search each token's range and walk back while earlier ranges can still reach it, and return the distinct collection ids whose range holds another collection's token. Test it: inside, outside, at start and at end, own token, null collection id makes no candidate (after the review), overlapping ranges past a gap, and empty inputs. Verify that `bun test` and `bun run check --filter=worker` pass.

## 2. Shared per-collection check

- [x] 2.1 Turn the verifier's `processOne` into an exported `checkCollection(target, { scope, dryRun, spans, logger })`, returning its outcome, drift flag, grid skip and probe count. Move its target `select` into an exported `loadTargets(ids?)` and its drop and run span caches into `gridSpans()`. `verifyBatchBoundaries` uses all three and keeps its counters and summary. Verify that a read-only `DRY_RUN=1 PROBES=none` run (with `.env.local`) prints the same output as before (apart from collections that minted in between), and that `bun run check --filter=worker` passes.

## 3. Recent pass

- [x] 3.1 Add an exported `verifyRecentDrift(dryRun = false)` to `job/verify-batch-boundaries.ts`:
  - read the last 24 hours of mints and every stored range,
  - get candidates from `driftCandidates`,
  - run `checkCollection` with `scope: "none"` on each `loadTargets(ids)` row,
  - log one `warn` with a count for failed fixes and stay silent otherwise.

  Add `RECENT=1` to the `import.meta.main` block to run it by hand. Leave `job/populate-serial.ts` as it is in HEAD. Verify that `bun run check --filter=worker` passes.
- [x] 3.2 Verify against production, read-only: run `RECENT=1 DRY_RUN=1 WORKER_LOG_LEVEL=debug bun run --env-file=../../.env --env-file=../../.env.local src/job/verify-batch-boundaries.ts`. Record:
  - the time of each read and of the match (time the run as a whole if that is simpler),
  - the candidate count,
  - which candidates report drift.

  Result on 2026-11-08 (laptop over Tailscale): 17 s for the whole run, including Bun startup and 7 candidate checks. It read 22,200 mints and found 7 candidates, all members of the still-minting Cream02 355A, all with drift (a sibling's mint inside their stored range). The reads alone measured 2.4 s and 0.7 s, and the match 17 ms, in the earlier one-off script.

## 4. Schedule

- [x] 4.1 In `apps/worker/src/index.ts`, register the recent pass (first hourly at `32 * * * *`, every 15 minutes after the review, see 5.1) and move the full pass from `2 3 * * *` to `2 3 * * 1`. Both go through `safeRun("serial-offline", …)`. Update the comments there and the header of `job/verify-batch-boundaries.ts`. Verify that `bun run check --filter=worker` passes.

## 5. Review fixes and scheduled probes

- [x] 5.1 Apply the review: run the recent pass every 15 minutes (`2,17,32,47 * * * *`) with `safeRun`'s new `warnOnSkip`; skip a candidate for 24 hours when its rediscovery gives back its stored ranges or none (keyed by collection and foreign tokens); skip mints with no collection in `driftCandidates` (which now returns each candidate's foreign tokens); log a summary with duration; pass `logger` to `rewriteSerials`; drop the `grid` alias; un-export the verifier's internals; extend the tests (unsorted ranges, own plus foreign overlap, walk-back stop). Verify that `bun run check --filter=worker` passes.
- [x] 5.2 Stop the scheduled probes: the weekly run uses scope `none`, the manual default becomes `none`, `probeScopeFor` and its tests go. Verify that `bun run check --filter=worker` passes and that `RECENT=1 DRY_RUN=1` and `DRY_RUN=1` runs (read-only, `.env.local`) still report today's drift.

- [x] 5.3 Apply the second review: move the weekly pass to `8 19 * * 0` with `warnOnSkip` (it collided with the 03:02 recent pass); add an hourly heartbeat to the recent pass; catch a throwing candidate and count it as failed; skip a stuck candidate while all its foreign tokens were already tried (`onlyTriedTokens`, tested) instead of by exact key; make the walk-back test name what it checks; fix the stale "hourly" and null-collection wording, and the main spec's "daily verifier". Verify that `bun run check --filter=worker` passes and a `RECENT=1 DRY_RUN=1` run still reports today's drift.
- [x] 5.4 Retry a skipped or failed weekly pass at 19:38 the same day (`apps/worker/src/index.ts`: a 19:38 tick runs it when no weekly pass finished within the hour). Verify that `bun run check --filter=worker` passes.

## 6. Docs

- [x] 6.1 Update `apps/worker/AGENTS.md` (Offline serials): the verifier bullet becomes a 15-minute pass over recent mints plus a weekly full pass, probes manual only, the stuck-candidate skip, the skip warning, and the manual `RECENT=1` run. The root `AGENTS.md` doesn't mention the schedule, so it is unchanged (checked 2026-11-08). Verify that `bun run lint` and `bun run format` leave no diff.

## Workflow follow-up

- Deploy the worker (needs the user's go-ahead). Read-only check afterwards: recent-pass fixes and the hourly heartbeat appear in the worker log, and the full pass runs only on Sunday 19:08 UTC.
- Archive with `/opsx:archive hourly-drift-check`.

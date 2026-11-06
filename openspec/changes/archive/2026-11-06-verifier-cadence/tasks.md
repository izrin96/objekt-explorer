# Tasks

## 1. Pure plan

- [x] 1.1 Add `apps/worker/src/lib/verify-plan.ts` with `probeScopeFor(date)` and `isRecent(newestMintedAt, now)` (8 weeks), plus `verify-plan.test.ts`. `probeScopeFor` cases: the first Monday (UTC day 1–7) gives `all`, the second Monday gives `recent`, a Sunday gives `none`, and a Monday that is still Sunday in a negative-offset timezone follows UTC. `isRecent` cases: exactly 8 weeks old, and 8 weeks plus a day. Verify `bun test apps/worker/src/lib/verify-plan.test.ts` passes, and lint and typecheck pass for `worker`.
- [x] 1.2 Add `judgeEdges(edges, ownerOf, collectionId)` to `lib/verify-plan.ts`. It takes the per-batch edge tokens (end, end+1, start, start−1, after ours, before ours, each possibly absent) and returns the indexer-proven drift reasons, the tokens the indexer lacks, and the foreign tokens it learned. Tests: a settled foreign end+1 needs no probe; our own token at start−1 is drift; a foreign gap token is drift; tokens the indexer lacks are returned for probing; the frontier's absent end side gives nothing. Verify the tests, lint and typecheck pass for `worker`.

## 2. Verifier

- [x] 2.1 In `job/verify-batch-boundaries.ts`, take a probe scope (`none | recent | all`). Read the indexer owners of each collection's edge tokens in one query, apply `judgeEdges`, and probe only the tokens it returns, and only when the scope covers the collection (`all`, or `recent` with `isRecent`). Keep the indexer foreign-inside query, the anchor and grid shields, and the drift fix unchanged. The run's summary line names the scope and counts the Cosmo probes made. The `import.meta.main` entry reads `PROBES`, defaulting to `probeScopeFor(new Date())`. Verify lint and typecheck pass for `worker`.
- [x] 2.2 In `src/index.ts`, change the verifier cron to `"2 3 * * *"`, still `safeRun("serial-offline", …)`, passing `probeScopeFor(new Date())`, and update its comment. Verify lint and typecheck pass for `worker`.
- [x] 2.3 Read-only check on prod (the `.env.local` read-only URL): run the verifier with `DRY_RUN=1` and `PROBES=none`, then with `PROBES=recent`. Record each run's duration, Cosmo probe count and drift count in this task. If the `none` run takes over 5 minutes, stop and raise it before deploying (design: "Lock time every day").
  - 2026-11-06, `PROBES=none`, run from a laptop against prod (80 ms per round trip): 326 s, 0 Cosmo calls, 0 drifted, 286 grid-fitted not probed. Over 5 minutes, so the design's fallback went in: the targets query keeps only collections with a batch no v1 objekt anchors (2,933 down to 499, the filter query takes about 2 s).
  - After the filter: `PROBES=none` 237 s, 0 Cosmo calls, 0 drifted. `PROBES=recent` 451 s, 14,636 Cosmo calls, 0 drifted. Every query is a round trip from the laptop (the heaviest, a foreign-inside check over 220 ranges, takes 13 ms on the server), so the container next to the database should run well under these times.

## 3. Docs and checks

- [x] 3.1 Update `apps/worker/AGENTS.md`'s Offline serials section: the verifier runs daily; indexer-only on most days; probes recent collections on Mondays and all of them on the first Monday; probes only tokens the indexer lacks; `PROBES` for manual runs. Update the one-line description of when it runs at the top of the section. No other package's `AGENTS.md` changes. Then run `bun run check`; it passes.

## Workflow follow-up

- Deploy the worker. The daily cron replaces the weekly one.
- Archive the change with `/opsx:archive verifier-cadence` once deployed.

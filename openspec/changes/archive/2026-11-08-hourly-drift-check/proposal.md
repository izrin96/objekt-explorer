# Proposal

## Why

A wrong offline serial range waits up to a day to be fixed. The batch-boundary verifier runs once a day at 03:02, and it is the only job that notices when another collection's token mints inside a stored range. In that case the range is too wide, so every later serial reads too high. On 2026-11-08, 7 collections had such a mint waiting for that night's run.

Indexer-visible drift starts with a mint. A foreign mint inside a range means the range is too wide. A collection's own mint outside its ranges means a range is too narrow, and the 5-minute populate job already rediscovers that case. So a short pass over recent mints can find the too-wide case. Only tokens the indexer never sees (assigned by Cosmo but never minted on chain) still need the Cosmo probes.

## What Changes

- **The verifier runs every 15 minutes (:02, :17, :32, :47).** Each run checks the tokens minted in the last 24 hours against every stored offline range. A token inside another collection's range makes that collection a candidate.
  - The window is 24 hours because the held-transfer replay inserts objekts late, with their original mint time.
  - A mint with no collection yet is skipped, because the verifier's own checks ignore it.
  - Each candidate gets the verifier's existing indexer checks. Anchored batches stay shielded. On drift, the candidate is rediscovered and rewritten as the verifier does today.
  - When rediscovery gives back the same ranges, the candidate is skipped for 24 hours for the same foreign tokens, so it doesn't call Cosmo on every run.
  - A run skipped because another job holds the lock logs a warning. A run that fixes something logs one summary line with its duration.
- **A weekly full indexer pass, with no Cosmo probes.** At Sunday 19:08 UTC (Monday 03:08 in Malaysia), outside the 15-minute pass's minutes, it checks every collection against the indexer as a backstop, instead of daily.
- **No scheduled Cosmo probes.** A dry run on 2026-11-08 probed every collection with a mint in the last 8 weeks. It made 14,465 Cosmo calls and found the same 7 drifted collections as the indexer-only pass. Probing stays available by hand (`PROBES=recent|all`), and the manual default becomes `none`.
- **The populate job is unchanged.** `RECENT=1` runs the 15-minute pass by hand.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `worker-offline-serials`: the indexer drift check moves from a daily full pass to a 15-minute pass over recent mints, the full pass runs weekly, and the Cosmo probes are manual only.

## Impact

- Routes: none directly. Serials on objekt pages, profiles and the market get fixed within 15 minutes of the mint that exposes the drift, instead of overnight.
- `apps/worker`:
  - The verifier's per-collection check becomes `checkCollection`, with `loadTargets` and `gridSpans`; `probeScopeFor` goes.
  - A pure `driftCandidates` in `lib/` matches tokens to ranges by binary search, with tests.
  - `verify-batch-boundaries.ts` gains the 15-minute pass, and `src/index.ts` schedules it and moves the full run to once a week.
- Cost per run, measured read-only from a laptop: 22,000 mints in 2.4 s, 15,833 ranges in 0.7 s, a 17 ms match, then one indexer check per candidate (7 today). A drift fix still runs a Cosmo discovery: during a live drop, at most one per drifted member per run.
- No schema change and no migration.

## Non-goals

- Changing what counts as drift or how a fix rewrites a collection.
- Rediscovering from the indexer instead of the Cosmo API (a separate change).

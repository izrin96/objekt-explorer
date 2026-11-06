# Proposal

## Why

The batch-boundary verifier runs once a week. Every run, it asks the Cosmo API about the edges of every unanchored batch, and that set grows with each post-cutoff drop and never shrinks. The run took 15–20 minutes on 2026-11-06, even after grid-fitted drops stopped being probed.

Most of those calls add nothing:

- A probe learns a token's owner only once Cosmo has assigned it (unassigned tokens answer 404). When the indexer already has that token minted, the probe repeats what the database knows. Only a token Cosmo assigned but the indexer lacks, never minted on chain or not yet indexed, needs the API.
- Drift happens while the neighbouring drops are still minting. A drop whose neighbours stopped weeks ago rarely moves.

Meanwhile the cheap check (a foreign objekt minted inside a stored range, a database query) also waits a full week.

## What Changes

- **Daily, database only.** The verifier runs every day. Its daily run checks the indexer for foreign mints inside unanchored ranges and makes no Cosmo API call.
- **Probes skip tokens the indexer has.** A token the indexer has as minted is judged by its indexer owner. Only tokens the indexer has not seen are probed through Cosmo.
- **Recent collections weekly, all monthly.** The Monday run probes collections with a mint in the last 8 weeks. The first Monday of each month probes every unanchored collection.
- When any run finds drift, it rediscovers and rewrites the collection as today, through `refineBatches` and `applyDropGrid`.
- A manual run takes `PROBES=none|recent|all` beside `DRY_RUN=1`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `worker-offline-serials`: when the verifier probes, what it probes, and that a daily indexer-only check runs.

## Impact

- `apps/worker`: `job/verify-batch-boundaries.ts`, its cron in `src/index.ts` (daily, still under the `serial-offline` lock), a new pure module for the probe scope and the indexer-known tokens, with tests, and `apps/worker/AGENTS.md`.
- Cosmo API: fewer calls. No call on six days of the week unless drift triggers a rediscovery.
- Database: one more indexer read pass a day. No schema change.
- Routes: none change.

## Non-goals

- Changing how drift is fixed (rediscovery, refinement, grid) or how serials are computed.
- Probing anchored or grid-fitted batches again.
- A progress counter or timing log, beyond one summary line per run.

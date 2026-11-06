# Design

## Context

`verifyBatchBoundaries` (`job/verify-batch-boundaries.ts`) runs from `src/index.ts` as `cron("2 3 * * 1", safeRun("serial-offline", …))`, under the same Valkey lock as `populateSerialOffline`. For each collection with stored ranges, it:

1. loads its objekts;
2. drops anchored batches, and since `serial-drop-grid`, batches inside a grid-fitted drop;
3. runs one indexer query for a foreign mint inside the remaining batches;
4. probes up to six edge tokens per batch through the Cosmo API: start, start−1, end, end+1, and the gap tokens next to the first and last own mint. The frontier batch's end side is skipped.

On drift it rediscovers, refines, applies the grid, and rewrites ranges and serials.

The 2026-11-06 dry run checked 2,933 collections in 15–20 minutes, almost all of it Cosmo calls.

## Goals / Non-Goals

**Goals:** catch indexer-visible drift within a day; spend Cosmo calls only on tokens the indexer cannot answer for, and on collections that can still drift.

**Non-Goals:** see the proposal.

## Decisions

### One daily cron; the date picks the probe scope

The cron becomes `"2 3 * * *"` under the same `serial-offline` lock. A pure `probeScopeFor(date)` in a new `lib/verify-plan.ts` returns:

- `"all"` on the first Monday of the month (UTC day 1–7);
- `"recent"` on other Mondays;
- `"none"` on every other day.

It uses UTC, so the scope doesn't depend on the container's timezone. A manual run reads `PROBES` and falls back to `probeScopeFor(new Date())`.

**Alternative rejected:** two crons (a daily indexer job and a weekly probe job). They would share the lock and the per-collection loading, and could still collide on Mondays. One job with a scope keeps one pass over the collections.

### Edge tokens are judged by the indexer first

The six edge tokens per batch are collected as today. One indexer query per collection reads the owners of those it has: `objekt.id IN (…)`, at most six per batch.

A pure `judgeEdges(edges, ownerOf, collectionId)` in `lib/verify-plan.ts` returns:

- the drift reasons the indexer already proves, using the same rules as the probe results (end foreign, end+1 ours, start foreign, start−1 ours, gap token foreign);
- the tokens the indexer lacks.

Only those tokens are probed, and only when the scope covers the collection. Every run, `"none"` included, applies the indexer-proven reasons. Probe results join them unchanged.

Foreign tokens learned either way go into `knownForeign` as now, so a rediscovery keeps them out of claimed blocks.

**Why it's safe:** a token the indexer has as minted has a fixed owner, which is exactly what a probe would return. The API only adds tokens Cosmo assigned that the indexer lacks: lagging, or never minted on chain.

### "Recent" is the collection's newest mint

A collection is recent when its newest objekt's `minted_at` is within 8 weeks of the run. The verifier already loads those rows, so this costs no query.

A collection's own last mint is a proxy for its drop still being active. The neighbours' mints are what actually cause drift, but they belong to other collections and would need another query. The monthly `"all"` run covers anything the proxy misses.

## Risks / Trade-offs

- **Lock time every day.** A run longer than about 5 minutes costs the populate job a tick each day, not just each Monday. The first measured `"none"` run took 326 s from a laptop, so the targets query now keeps only collections with a batch no v1 objekt anchors: 2,933 down to 499, in one query of about 2 s. That run then took 237 s from the laptop, where each round trip costs 80 ms; the container next to the database runs faster. The filter casts `objekt.id` to `bigint`, which assumes every token id is numeric, as every prod row is today.
- **Proxy misses.** An old collection whose neighbour starts minting again drifts unnoticed until the indexer sees the foreign mint (next daily run) or the first Monday of the month. Today's weekly run would catch it within a week, but only through a Cosmo-only token: one assigned but not yet minted on chain.
- **The spec's wording.** The main spec still calls it "the weekly verifier" in the anchor and grid requirements. Those requirements still hold: anchored and grid-fitted batches are never probed. Their wording is left alone rather than rewritten for the schedule.

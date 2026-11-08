# Design

## Context

See proposal.md (Why). The current state that shapes the approach:

- **The verifier today.** `verifyBatchBoundaries` (`apps/worker/src/job/verify-batch-boundaries.ts`) runs at 03:02 UTC every day under the `serial-offline` lock (`src/index.ts`), the same lock as the 5-minute populate job.
  - It loads every offline collection (plus `preAssignedCollections`) that has stored ranges and a batch no v1 objekt anchors.
  - For each, it loads the collection's objekts, drops batches pinned by a v1 serial or a manual anchor, and asks the indexer whether a foreign token minted inside an unanchored batch.
  - It judges edge tokens with `judgeEdges` (`lib/verify-plan.ts`) and probes Cosmo on probe days.
  - On drift it rediscovers through `fitRanges` → `storeRanges` → `rewriteSerials`.
- **The two kinds of indexer-visible drift.** Every drift `judgeEdges` reports is one of two kinds:
  - A foreign token at or inside a batch. `end`, `start`, `afterOurs` and `beforeOurs` all sit within `[start, end]`.
  - The collection's own token just outside a batch (`endNext`, `startPrev`). That case already reaches populate: the token is a new serial-0 mint, and `planRediscovery` sends it to rediscovery.
- **Late inserts.** The held-transfer replay (`job/collection.ts`) inserts objekts late, carrying their original `minted_at`.
- **Production volumes on 2026-11-08:**
  - 2,961 collections with 15,833 stored ranges (479 kB of `serial_batches`), and about 22,000 mints a day.
  - A SQL join of a day of mints against `jsonb_array_elements` of every range took 98 s.
  - Read-only from a laptop: the mint read took 2.4 s, the range read 0.7 s, and the in-memory match 17 ms.
  - It found 7 candidates, all members of the still-minting Cream02 355A, all with drift.

## Goals / Non-Goals

**Goals:**

- A foreign mint inside a stored range gets fixed within 15 minutes.
- The populate job stays as it is.
- The verifier's indexer judgement stays one implementation, used by both passes.

**Non-Goals:**

- Any change to `judgeEdges`, anchors or the rewrite steps.
- A persistent cursor of processed mints.

## Decisions

### Recent pass in the verifier, populate untouched

`verifyRecentDrift()` in `verify-batch-boundaries.ts` does four steps:

1. Reads `id, collection_id` of objekts minted in the last 24 hours (`idx_objekt_minted_at`) and `id, serial_batches` of every collection with stored ranges.
2. Gets candidates from `driftCandidates`.
3. Loads them through `loadTargets(ids)`, which applies the same unanchored-batch filter the full pass uses.
4. Runs `checkCollection` on each with `scope: "none"`.

`checkCollection` is the former `processOne`, so anchors, grid-fitted batches and the fix stay in one place.

A populate step was considered first, and dropped. It would rediscover every member of a live drop whenever a sibling minted into its stored range, each time a full Cosmo discovery, every 5 minutes. Populate's own job (numbering new mints) would wait behind it under the shared lock. A separate pass every 15 minutes keeps populate as it is.

### Match mints to ranges in memory

`driftCandidates(tokens, ranges)` (`lib/drift-candidates.ts`, tested) sorts ranges by start and keeps a running maximum of ends. For each token it binary-searches the last range starting at or below it, then walks back while that running maximum still reaches the token. That way, every owner of an overlapping range is found, even when a long range starts far back. A token with no collection yet is skipped (see Mints with no collection).

Alternatives considered:

- **SQL join:** 98 s.
- **A gist index on an `int8multirange` column:** a schema change on an indexer table for a 15k-row problem.
- **Per-token SQL:** 22,000 queries.

### A 24-hour window, not a cursor

A replayed objekt carries its old `minted_at`, and the `objekt` table has no insertion order to follow. Twenty-four hours covers replays, which normally land within minutes, and a fix is idempotent: a rewritten range no longer holds the token, so the collection stops being a candidate. A candidate whose foreign token sits in an anchored batch is checked again on every pass until its token is 24 hours old, at the cost of one objekt read each time. The weekly full pass catches anything older.

### Schedule

- The recent pass runs every 15 minutes at :02, :17, :32 and :47, off populate's 5-minute grid. A first draft ran hourly at :32, but the review pointed out that populate runs longest during a live drop. If its :30 run is still going at :32, an hourly pass loses a whole hour without a trace. At 15 minutes, a skip costs 15 minutes, and `safeRun` logs it as a `warn` for this job (`warnOnSkip`) instead of `debug`.
- The full pass moves from `2 3 * * *` to weekly at `8 19 * * 0` (Sunday 19:08 UTC, Monday 03:08 in Malaysia), with scope `none` and `warnOnSkip`. Minute 8 is outside the recent pass's minutes. A second review caught that a Monday 03:02 slot collided with the 03:02 recent pass, so one of the two silently lost the lock. Malaysian night is the quietest hour for its ~10-minute hold on the lock. A review after the deploy pointed out that one skip (populate's 19:05 run still holding the lock) or one failure would lose the backstop for a week, so a 19:38 tick runs it again unless it finished within the last hour. The worker remembers that in memory, so a restart in between costs at most one extra run.
- Both take `serial-offline` through `safeRun`.
- `import.meta.main` gains `RECENT=1` to run the recent pass by hand; `DRY_RUN` applies to it too.

### No scheduled probes

A dry run on 2026-11-08 with `PROBES=recent` covered every collection with a mint in the last 8 weeks. It made 14,465 Cosmo calls and held the lock for 13 minutes. It reported the same 7 drifted collections, with the same reasons, as an indexer-only run made right after. The probes guard against a token Cosmo reserved for another collection that never minted on chain, sitting at a range edge. Today's data shows none, so the scheduled runs stop probing. `probeScopeFor` goes, and a manual run defaults to `PROBES=none`. `PROBES=recent|all` stays for a manual check when a reported serial suggests such a token.

### Stuck candidates

When a candidate's rediscovery gives back its stored ranges (`unchanged`), or no ranges, the foreign token stays inside, so every later pass in the window would rediscover it through Cosmo again. A per-process map (`stuck`) keeps, per collection, the foreign tokens already tried and an expiry 24 hours on. A pass skips the candidate while every token it holds is one already tried (`onlyTriedTokens`, tested), so a tried token aging out of the window doesn't bring it back, and a token not tried before does. A failed rediscovery (a Cosmo error) is not remembered, so it retries on the next pass. A restart clears the map, which costs at most one extra rediscovery per stuck candidate.

### Mints with no collection

`checkCollection`'s inside check uses `collection_id <> id`, which skips a null collection, and its edge judgement ignores owners with no collection. So `driftCandidates` skips such mints too. Otherwise they would make candidates that are never fixed and never reported.

### Logging

Per collection, `checkCollection` logs one `warn` per drift with its reasons and one `info` per fix, as the full pass does. A recent pass that fixed something adds one `info` summary with the collections fixed and its duration. Failed fixes get one `warn`, and a quiet pass logs only at `debug`. The passes count runs, candidates, skips, fixes and failures in an hourly `heartbeat` line, as populate does, so a stretch of quiet passes can be told apart from passes that never ran. A candidate whose check throws is caught, logged at `debug` and counted as failed, so it can't stop the candidates after it on every pass.

## Risks / Trade-offs

- [Two reads every 15 minutes on the production indexer] → Bounded and measured: about 3 s from a laptop, less on the VPS, which is 96 runs a day.
- [The lock held during a pass delays populate] → A few seconds plus any fixes. A populate run that finds the lock held skips once and runs 5 minutes later.
- [A drift exposed by a mint over 24 hours old, or an own token already numbered outside its ranges] → Caught by the weekly pass. The review found no write path that leaves an own token outside its ranges.
- [A token Cosmo reserved but never minted, at a range edge] → No longer found automatically. A manual `PROBES` run finds it.
- [Rediscoveries during a live drop] → At most one per drifted member per pass, through the Cosmo API. Making fixes indexer-only is a separate change.

## Migration Plan

Deploy the worker. No schema change. Rollback: the previous worker image restores the daily verifier.

## Context

See proposal.md for why.

- After each run, the verifier writes `VERIFIER_LAST_KEY` (`trade-verifier:last`) to Redis, and `fetchTrade` returns it as `lastCheckedAt`. Nothing tracks the indexer's own progress.
- The indexer uses `TypeormDatabase({ supportHotBlocks: true })` (`apps/indexer/src/main.ts:28`). Subsquid keeps its progress in the indexer database: `squid_processor.status` (the finalized height), plus `squid_processor.hot_block` for unfinalized blocks it has already written. The transfer rows of hot blocks are already in `transfer`.
- The RPC endpoint is `INDEXER_RPC_ENDPOINT` in the shared root `.env`.
- Expiry (`trade-expiry.ts`) and reminders (`trade-reminders.ts`) compare `accepted_at` with `now()`. `cancelTrade` looks only at transfers it has seen.

## Goals / Non-Goals

**Goals:**
- No change to the indexer (see the minimal-indexer rule).
- When the delay isn't known, fail safe: treat the indexer as behind.

**Non-Goals:**
- Showing the indexer delay anywhere other than trade pages.

## Decisions

**1. The worker computes `seenUntil`.** At the start of each verifier run, `readIndexerHead()`:
- reads `max(height)` across `squid_processor.status` and `squid_processor.hot_block`, read-only over the `indexer` connection;
- fetches that block's timestamp with one `eth_getBlockByNumber` JSON-RPC `fetch` to `INDEXER_RPC_ENDPOINT`;
- writes `{ seenUntil, readAt }` to Redis under `trade-verifier:seen`.

On any error, it logs and keeps the previous value, so the age of `readAt` reveals the failure. The table names are checked read-only before relying on them (task 1.1).

Alternative considered: the indexer writes its latest block time to Redis each batch. It's more direct, but rejected because it changes the indexer, which the user asked to keep minimal. Another option was to use `max(transfer.timestamp)`. Rejected, because a quiet chain would read as a stalled indexer.

**2. One `isBehind` rule, shared.** It's a pure function in its own module, `lib/indexer-seen.ts`, beside `parseIndexerSeen`:

`isBehind(seen, now) = seen === null || now - seen.seenUntil > 5 min || now - seen.readAt > 5 min`

The worker, `fetchTrade` and `cancelTrade` all read the Redis value and apply it. Tests cover a fresh value, an old head, an old reading, and a missing value.

**3. Expiry and reminders are due against `seenUntil`, not `now()`.** `expireStalls(seenUntil)` and `remindStalls(seenUntil)` replace `now()` with `seenUntil` in their `accepted_at <= … - interval` filters. A trade then expires only once the indexer has read past its expiry moment, and the verifier has already run the matching for that window in the same run. When `seenUntil` is unknown, both skip the run. When the indexer is caught up, `seenUntil` is within a minute or two of `now()`, so the behaviour is as today.

**4. Cancel refusal.** `cancelRefusal(trade, indexerBehind)` (`lib/offer-rules.ts`) returns `indexer_behind` after `trade_ended` and `locked`, so a locked trade still reads as locked. `cancelTrade` checks it under the trade lock, and `fetchTrade` derives `canCancel` and `cancelLocked` from the same call. `indexerBehind` is only true for an in-progress trade. The page shows the same sentence where Cancel would be.

**5. The view.** `TradeView` gains `seenUntil` (ISO or null) and `indexerBehind` (boolean). `lastCheckedAt` stays in the schema for tabs still on the old build, but nothing new renders it.
- `LegState` Waiting renders `m.offer_leg_seen({ time })` from `seenUntil`.
- `trade-view.tsx` shows an `Alert` (warning) above the table while `indexerBehind`, with the clock time of `seenUntil` in the viewer's locale.
- No event fires when the indexer falls behind or catches up, so `tradeOptions` polls every 60 s while the trade is in progress, even with the live socket open. That keeps the notice within the 3 minutes the spec allows: the worker refreshes within 2 minutes, plus one poll.

## Risks / Trade-offs

- [The RPC is down while the indexer is fine] → It reads as behind: expiry and reminders wait, and cancel is refused. That's safe but annoying. The previous value is kept, and the 5-minute limit is generous. If it recurs, fall back to the indexer-side Redis write (decision 1's alternative), with approval.
- [Hot blocks can be rolled back] → Already true today for verification. `seenUntil` includes hot blocks so it matches what the verifier reads.
- [The 5-minute threshold is a guess] → It's one constant. Record the real indexer delay from the worker log for a few days, then tune it.

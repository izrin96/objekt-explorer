## Why

The trade page's Waiting chip says "checked 1 min ago", but that is when the verifier last ran, not how far the indexer has read the chain. If the indexer stalls, someone who already sent sees "Waiting · checked 1 min ago" and concludes their transfer failed. Worse, the site keeps acting on its stale view:
- trades can expire after 14 days even though the transfer happened on chain;
- stall reminders go to people who already sent;
- a party who just received an objekt can still cancel before the transfer is seen.

## What Changes

- **The site tracks how far the indexer has read.** The worker records the time of the newest block the indexer has recorded, on every verifier run.
- **Waiting reads "transfers seen up to N min ago"** instead of "checked N min ago".
- **A notice when the indexer is behind** (more than 5 minutes) on every in-progress trade page: transfers after 14:02 aren't seen yet, and nothing sent is lost.
- **Holds while behind:**
  - trade expiry and stall reminders wait until the indexer has read past their due time;
  - cancelling an in-progress trade is refused until it catches up.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-verified-trades`: a new Indexer delay requirement, and Verification progress's Waiting chip wording.

## Non-goals

- Fixing why the indexer falls behind, or alerting operators. That's for monitoring.
- Holding open offers' 7-day expiry. That's a calendar rule, not a chain one.
- Holding "broken trade" detection. It only acts on transfers the site has seen, so a delay can only postpone it.

## Routes

`/trade/mine/$tradeId`, and the cancel action.

## Impact

- **`apps/worker`:** a `indexer-head` step in the trade verifier, which reads the indexer's processor status and one RPC call for the block time. Expiry and reminders compare against it.
- **`packages/api`:**
  - `schemas/offer.ts`: `seenUntil` and `indexerBehind` on `TradeView`, with `lastCheckedAt` kept for older tabs;
  - `services/offer/trades.ts`: the view fields and the cancel refusal.
- **`apps/web`:** `leg-table.tsx`, `trade-view.tsx`, `refusal.ts`, and en/ja/ko text.
- No database change. No indexer change.

# Proposal

## Why

A reserved objekt that leaves the giver's wallet after the accept breaks its leg at once, so the trade fails or cancels within seconds. Many traders keep several Cosmo accounts and move objekts between their own wallets. On production trade 36 (2026-10-26) the giver moved an objekt to a wallet they had swapped with for months, got it back 98 seconds later and delivered it, but the verifier had already failed the trade. All six legs arrived within 14 seconds of the "failed" mark; the trade was repaired by hand.

## What Changes

- A specific objekt that reaches the receiver verifies its leg whoever sends it last, once the trade is accepted. Routing the asked-for objekt through another wallet, such as the giver's other account, no longer fails the trade.
- A move of a reserved objekt to a third wallet no longer breaks the leg at once. The leg stays waiting, and breaks only if the objekt is still away 24 hours after it left, measured against how far the indexer has read. If it comes back to the giver or arrives at the receiver within that time, nothing breaks.
- When the objekt first leaves, both parties are told once ("Kotone 301A left the giver's wallet; the trade fails if it isn't back or delivered by <time>"), and the trade page shows that deadline on the leg until it returns or is delivered.
- A break after the grace keeps today's outcome: Cancelled if nothing was sent, Failed otherwise, with the break dated when the objekt left. A wrong copy sent before it left still rescues the leg at the break.
- A move away before the accept follows the same 24-hour rule instead of breaking as soon as it is read.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-verified-trades`: Broken trades waits 24 hours after a reserved objekt leaves before breaking, a specific objekt verifies when it reaches the receiver from any wallet, and both parties are told when it leaves.

## Impact

- `packages/api/src/lib/trade-match.ts` (`matchLegs`, `nearMisses`) and its test; `packages/api/src/services/trade-verify.ts` (`matchOpenLegs` takes the indexer's `seenUntil`); `packages/api/src/services/offer/trades.ts` (cancel check, the trade's legs).
- `packages/db`: a nullable `trade_leg.away_at` column and a migration, applied to local, staging and production with the user's approval.
- `apps/worker/src/job/trade-verifier`: marks and clears `away_at` and notes the new trade event, as it does for non-transferable legs.
- `apps/web`: the trade page's next step and leg row, the notification text, en/ko/ja messages.
- Routes: `/trade/mine/$tradeId` (trade page), the notifications popover, `/@{nickname}/trades`.

## Non-goals

- Linking or recognising a trader's other accounts.
- Changing any-copy legs, which never break on a transfer elsewhere.
- Changing expiry (14 days), stall reminders (72 hours) or the wrong-copy deadlines.
- A note when the objekt comes back; the deadline simply leaves the trade page.
- Repairing past trades; trade 36 was fixed by hand.

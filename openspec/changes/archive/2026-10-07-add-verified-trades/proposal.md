## Why

An accepted trade (`add-trade-offers`) records a promise, not whether it happened. Each leg is an on-chain transfer the indexer already records, so the site can verify it, and feedback limited to verified trades makes a reputation that can't be faked.

## What Changes

- **Verification**: a worker job matches indexer transfers against open legs.
  - A leg verifies when its token (or, for any copy, a token of its collection) moves from the giver's addresses to the receiver's, as snapshotted at accept.
  - It stores the tx hash, and the last leg completes the trade.
  - The job listens on the indexer's `transfers` channel and rescans every 2 minutes.
- **Broken trades**: if a reserved objekt moves to anyone other than the receiver, the trade cancels itself when no leg was verified yet. Otherwise it is marked Failed. Both parties are notified either way.
- **Offer upkeep** (same job): open offers become Expired after 7 days, or Cancelled when a specific objekt leaves its owner. Both parties are notified.
- **Trade page** (`/trade/mine/$tradeId`): each leg shows Waiting or Verified (with the tx hash), above a "1 of 2 transfers verified" line that the chat offer card repeats.
- **Who sends first**: a suggestion shown to both sides on the trade page. The party with fewer verified trades should send first; on a tie, the newer account does. It is not enforced.
- **Cancel lock**: neither side can cancel once any leg is verified.
- **Stalls**: 72 hours after accept, each party still owing a transfer is reminded once. From 7 days, or once a trade fails, the trade page offers Report a problem, which attaches the trade (legs and hashes) for moderators.
- **Feedback**: after a trade completes, each side can rate the other Positive, Neutral or Negative. A rating can be changed for 14 days. Single ratings are never shown, only totals.
- **Reputation**: verified trade count, positive share and account month, shown wherever the account's name already shows: the chat header, Trade posts, For you rows, the profile header and the trade page.
- **Notifications**: a new Trades type, on by default: leg verified, completed (with the feedback prompt), cancelled, failed and the stall reminder.

## Non-goals

- Escrow, payment checks, or enforcing who sends first.
- Written reviews, or ratings for trades not verified on-chain.
- A setting to hide reputation, or "Only people I've traded with" for messages.
- Verifying trades agreed before this change, or outside offers.

## Capabilities

### New Capabilities

- `web-verified-trades`: verification, broken trades, offer upkeep, who-sends-first, the cancel lock, stalls, feedback and reputation.

### Modified Capabilities

- `web-trade-offers`: the trade page and offer card show verification progress, and cancelling locks after the first verified leg.
- `web-chat`: the conversation header gains the trust line.
- `web-trade-browse`: posts show the owner's reputation.
- `web-trade-for-you`: partner rows show the partner's reputation.
- `web-profile`: the header shows reputation when it shows the account.
- `web-moderation`: reports can attach a trade, and the console shows it.
- `web-notifications`: the Trades notification type and its switch.

## Impact

- **DB**: one migration adds `trade_feedback`, `trade.reminded_at` and `report.trade_id`, plus an index on `trade_leg` for open legs. Applied locally only until ship.
- **Worker**: a new `trade-verifier` job, with a pure matching module and tests, a `transfers` subscription, and a 2-minute cron.
- **API**:
  - `offer.trade` gains progress, the who-sends-first suggestion and the viewer's rating;
  - new `offer.rate`;
  - a `reputation` read with a Valkey cache;
  - `moderation.report` accepts `tradeId`.
- **Web**: one trust line component on five surfaces, feedback controls and Report a problem.

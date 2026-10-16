## Why

A wrong copy waits for the receiver to accept or decline. If they never answer, the trade expires Failed and the giver is counted unfinished, even when they sent the copy Cosmo shows under the asked-for serial and only our estimated serial was off. Silence should count as yes, with a deadline the receiver can see.

## What Changes

- **Accepted at a deadline.** A wrong copy the receiver hasn't answered counts as accepted 72 hours after it was recorded, for every wrong copy, estimated serial or not. It verifies the leg exactly as Accept does, and the leg is marked accepted automatically.
- **The deadline waits for the indexer.** It is due against how far the indexer has read, as expiry and reminders are, so a right copy sent in time but read late still wins.
- **Expiry and breaks accept a pending copy.** If the trade reaches its 14-day expiry, or the asked-for objekt leaves the giver, while a wrong copy is still pending, that copy is accepted instead of the trade ending Failed or Cancelled.
- **Which copy.** With several pending copies on one leg, the earliest is accepted and the rest close. A copy whose transfer another trade's leg already took is no longer offered.
- **Unchanged:** Decline is final; a right copy during the window verifies the leg as today; the receiver moving the copy on doesn't stop the deadline.
- **Telling people.**
  - The wrong-copy notification and the trade page say "Counts as accepted on {date} unless you decline".
  - The receiver gets one reminder 24 hours before.
  - Both parties are told when it is accepted automatically.
  - The trade page and the moderator console mark the leg as accepted automatically.
- **Copy.** The stall note on the trade page mentions the 72-hour rule, in en, ko and ja.
- **Already pending at deploy:** their 72 hours start at the deploy.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-verified-trades`: Wrong copy sent (the deadline, which copy, expiry and breaks) and Broken trades.
- `web-notifications`: wrong copy due and accepted automatically notifications.
- `web-moderation`: the console marks a leg accepted automatically.

## Routes

`/trade/mine/$tradeId`, the bell on every page, and the moderator console's account page.

## Non-goals

- A setting for the deadline, or a different one for estimated serials.
- Undoing an automatic accept. A receiver who wanted the asked-for serial uses Report a problem.
- Changing Decline, or what a declined copy does at expiry (still Failed).
- Accepting copies on any-copy legs, which have none.

## Impact

- **`packages/db`:** one migration adding `accept_by`, `reminded_at` and `auto_accepted` to `trade_substitute`, setting `accept_by` on pending rows to the deploy time plus 72 hours. Applied only with approval.
- **`packages/api`:** the accept core moves from `services/offer/substitute.ts` to `services/trade-verify.ts` so the worker can share it; due rules in `lib/trade-match.ts` with tests; `accept_by` on the trade view and the `wrong_copy` payload; two trade notification events.
- **`apps/worker`:** a `copy-deadlines` step in the trade verifier, plus expiry and break handling.
- **`apps/web`:** the deadline line, the automatic mark, two notification texts and the stall note, in en, ko and ja.

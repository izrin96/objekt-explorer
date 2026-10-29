# Proposal

## Why

A leg verifies only when the asked-for objekt reaches an address the receiver has linked on this site. Traders often settle outside that rule: the receiver asks for delivery to a friend's profile or an alt, or the two agree on something else in chat. The tracker cannot tell those cases from a sale, so the trade fails, and the giver gets an unfinished mark the receiver never wanted. On production trade 69 (2026-10-27) two of three legs had verified when the giver sent the third objekt to another trader's wallet. With nobody able to settle it, the trade was due to fail 24 hours later. Twenty-four hours is also short for two people in different time zones to sort out a mix-up in chat.

## What Changes

- The away grace grows from 24 to 72 hours, the same window a receiver has to decide on a wrong copy. It still counts from when the objekt left, so legs already away gain the extra time once this ships.
- The receiver can **Mark as received** any waiting leg they receive. The leg closes as confirmed by the receiver, with no transfer behind it. Only the receiver can do this, after a confirmation step, and it cannot be undone.
- A trade completes once every leg is verified or confirmed. A trade with a confirmed leg does not count toward either party's verified count and takes no feedback, so two accounts gain no reputation by confirming trades that never happened. Its unfinished rule is unchanged.
- While a leg the viewer receives is away, the trade page tells them that a profile they link before the deadline counts, and offers Mark as received for a delivery that went somewhere else.
- A confirmed leg reads "Confirmed by {name}" on its card, in the Selected panel and in the Timeline, in place of a transfer hash.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-verified-trades`: the away grace becomes 72 hours. The receiver can confirm a waiting leg by hand. Trades with a confirmed leg complete but earn no verified count or feedback. Away legs carry a link-or-confirm hint for the receiver.

## Impact

- `packages/api/src/schemas/offer.ts` (`AWAY_GRACE_HOURS`), `packages/api/src/lib/trade-match.test.ts` (the grace cases are written against the constant).
- `packages/db`: a nullable `trade_leg.confirmed_at` column and a migration, applied to local, then staging and production with the user's approval.
- `packages/api`: a new `offer.confirmLeg` procedure and service beside `acceptSubstitute`; the reputation query; the rate refusal; the trade read returns `confirmedAt`.
- `apps/web`: `/trade/mine/$tradeId` (status card note, leg card, Selected panel, Timeline, confirm dialog), en/ko/ja messages.
- Routes: `/trade/mine/$tradeId`, the notifications popover (the giver's note for a confirmed leg), and the reputation line wherever it shows.

## Non-goals

- Naming a delivery profile up front (a friend's nickname under "Send to"). That waits until Mark as received shows whether people need it.
- A giver-side confirmation, or undoing a confirmation.
- Confirming several legs in one action.
- Showing confirmed trades as their own figure in reputation or the mod console.
- Rewriting the `breaksAt` stored in `away` notifications sent before the deploy. They keep the 24-hour time, and the trade page shows the new one.

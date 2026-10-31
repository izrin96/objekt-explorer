## Why

Decline (the recipient's) and Withdraw (the sender's) end an open offer on one tap, with no confirmation, no Undo and no notice, and they look like Counter beside them. On a phone a mis-tap on Decline ends someone's offer for good and notifies them. The chat request's Decline already confirms with a notice that offers Undo; an offer's Decline and Withdraw should behave the same way.

## What Changes

- Decline and Withdraw on an open offer start a short hold (5 seconds) instead of acting at once:
  - a notice reads "Offer declined" or "Offer withdrawn" with Undo;
  - the offer card shows "Declining…" or "Withdrawing…" with its own Undo in place of its actions, and focus moves to that Undo;
  - Undo, from the notice or the card, cancels the hold: nothing reaches the server, the partner is not notified, the card's actions return and focus goes back to the button that started it.
- When the hold ends, the request is sent as today; the card then shows Declined or Withdrawn as today. A refusal (the offer was accepted, countered or expired meanwhile) shows the existing error notice and refreshes.
- A hold survives leaving the thread inside the window; it is still sent.
- Closing or reloading the tab inside the window drops the hold: the offer stays open, which fails safe.
- Accept, Counter, a trade's Cancel and the chat request actions are unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-offers`: "Offer lifecycle" gains the held Decline and Withdraw with Undo.

## Routes

`/messages/$id` (the offer card in the thread, the only place Decline and Withdraw appear).

## Non-goals

- A server-side undo (reopening a declined or withdrawn offer).
- Holding Accept, Counter or Cancel trade.
- Sending a hold when the tab closes (`sendBeacon` or `keepalive`).
- Changing the partner's notification or what the server records.

## Impact

- `apps/web/src/features/offers/actions.ts`: Decline and Withdraw go through a hold that sends when it ends.
- `apps/web/src/features/offers/offer-body.tsx`: the pending line with Undo, and focus.
- A small store for holds, so a hold outlives the card, with its pure parts in a tested module.
- New messages in en, ja and ko: the two notices and the two pending lines; Undo reuses the existing word.
- No API or schema change.

# Proposal

## Why

Traders often swap on chain first and never press Accept. On 2026-10-26, prod offer O-180 had both objekts sent to the other side (01:06 and 01:10), but it stayed open: nobody accepted, so no trade was recorded and neither party's reputation counts the swap. The offer stays acceptable, and an Accept would verify both legs at once from the transfers already made, but nothing on the offer tells either party so.

## What Changes

- The worker notes when an open offer's specific objekt has already reached the other side (the same early send `itemStillHeld` already counts to keep the offer open), and refreshes the offer card in the open thread.
- The offer card marks each such objekt as already sent.
- When every objekt in the offer is a specific objekt that has already been sent, the card shows a hint:
  - to the recipient: both sides are delivered, so press Accept to record the trade;
  - to the sender: both sides are delivered, and the trade is recorded once the recipient accepts.
- Accept stays the recipient's choice. Nothing is accepted or completed automatically.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-offers`: two new requirements: "Objekts sent before the accept" (the per-objekt mark) and "Accept hint when everything was sent".

## Non-goals

- Auto-accepting or auto-completing an offer whose objekts were all sent.
- A notification for the hint. The card and its live refresh only. If parties still miss it, a one-time notification can follow as its own change.
- Any-copy items. A copy sent long before the accept doesn't verify an any-copy leg (`web-verified-trades`), so the worker doesn't mark one, and an offer with an any-copy item never shows the hint.
- The top-up. The app never verifies payment, so the hint ignores it, as trades do.

## Routes

- `/messages/$id`: the offer card in the thread.

## Impact

- `packages/db`: new nullable column `offer_item.sent_at`, plus a migration (prod needs approval).
- `apps/worker/src/job/trade-verifier/offer-upkeep.ts`: sets `sent_at` from the transfers it already reads, and publishes `chat_changed` for conversations whose offers changed.
- `packages/api`: `fetchOffers` / `toOfferView` and `offerItemViewSchema` carry `sentAt`.
- `apps/web/src/features/offers`: offer card mark and hint, with en/ko/ja messages.

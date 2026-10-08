## Why

Trade verification has four gaps:
- A specific leg verifies only when that exact token moves, and people pick the token by serial. Every serial minted after Cosmo's v1 metadata shut down (2026-06-04) is the worker's estimate, so it can differ from Cosmo's. Someone can also send the wrong copy by mistake. Either way the copy sent doesn't count: the trade waits until it expires, the receiver keeps the copy, and the page says nothing.
- One transfer verifies at most one leg, but it's recognised by the indexer's random row id. Re-indexing the chain gives every transfer a new id, so a transfer already counted could verify a second leg.
- An any-copy leg counts any copy sent since the offer, even one for another deal. Between two trades, the lower leg id wins, not the trade accepted first.

## What Changes

- **Wrong copy sent.** While a specific leg waits, the verifier records any other copy of that collection the giver sends the receiver. The trade page tells both people, for example "sent #542, this trade asks for #537":
  - The receiver can Accept it, which verifies the leg with that transfer, or Decline.
  - Both get a notification when the wrong copy is spotted, and the giver gets another if it's declined.
  - While a wrong copy waits on the receiver or has been declined, neither side can cancel. If the trade expires, it ends Failed, so Report a problem stays open.
- **Estimated serials are marked.** In the builder, offer cards, My trades and the trade page, an estimated serial reads "~#537", and its accessible name says it's an estimate. A serial not assigned yet (0) shows no number. The builder and the trade page each say once that Cosmo may show a different number.
- **Transfers are identified by their transaction hash and token**, which survive a re-index, both for "counts once" and for wrong copies.
- **Transfer window by leg type.**
  - A specific leg still counts its own token from when the offer was sent.
  - Any-copy legs and wrong copies count only transfers from 10 minutes before the accept.
  - When trades compete for one transfer, the trade accepted first takes it.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-verified-trades`:
  - which transfers verify a leg: the window by leg type, the order trades take transfers in, and a transfer identity that survives a re-index;
  - a new requirement for a wrong copy sent;
  - a held wrong copy locks Cancel.
- `web-trade-offers`: marking estimated serials.
- `web-notifications`: the wrong-copy sent and declined notifications.

## Non-goals

- Marking estimated serials outside trade surfaces: the grid, the objekt detail, chat's objekt cards and lists.
- Telling copies apart by image or mint time. Every copy has the same artwork, and it's not known whether Cosmo's send flow shows mint time.
- Fetching Cosmo's own serial, which it only returns to the owner.
- Returning a declined copy. That's for the two parties, in chat or through Report a problem.

## Routes

`/trade/mine/$tradeId`, the offer builder and offer cards in `/messages/$id`, `/trade/mine`, and the bell on every page.

## Impact

- **`packages/db`:** a `trade_substitute` table, and a unique index on `trade_leg (tx_hash, verified_objekt_id)`, in one new migration. Applying it needs approval.
- **`packages/lib`:** the v1 cutoff and `isSerialEstimated`, moved from the worker.
- **`packages/api`:** matching (`lib/trade-match.ts`, `services/trade-verify.ts`), the view schemas, the accept and decline routes, the cancel lock, and `minted_at` in `services/chat/cards.ts`.
- **`apps/worker`:** the trade verifier and trade expiry.
- **`apps/web`:** `features/offers`, the bell, and en/ja/ko text.

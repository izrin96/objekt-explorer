# Proposal

## Why

Offers that ask from several of the recipient's posts at once get declined. silvinei ties each post's have or sale list to its own want list, and an offer mixing two posts is not a deal they would take (backlog: "Keep an offer inside one post"). The switch that stops it, "Let people ask from more than one post", is on by default and 6 of 4,555 accounts turned it off. The owner decided every offer asks from one post, for everyone.

## What Changes

- **BREAKING (behaviour):** every new offer to a partner with a have or sale list on Trade asks from one of those lists, counters included (against the original sender's posts; objekts the recipient offered stay exempt). Other asks are refused as `other_post`, and the refusal now says an offer asks from one post.
- The builder always shows **Offer on** for such a partner: a choice with two or more posts, the line "Offer on {post}" with one. You get's picker shows only that post, with no List choice.
- **"No post" goes.** An offer that asks for nothing is stored on no post, so its gives are checked against every want list the partner has on Trade.
- **The switch goes** from Account › Trade. `user.multi_post_asks` is no longer read or written; `user.setOfferRules` still accepts `multiPostAsks` and ignores it.
- **The "Asks from N of your posts" mark and the notice to turn the switch off go**, with "One notice per decline". The nudge for Only offers with what I want stays.
- Offers already open across posts stay open until they end (at most 7 days; 6 today).
- A no-op migration retires the column from the schema; a later change drops it.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-offers`:
  - MODIFIED: "Offers name objekts on both sides", "Offer builder", "Picks that can't be sent", "Matches added when the builder opens", "Matches of one post", "Recipients who take only what they want", "Builder for a want-only recipient", "One post per offer", "Choosing the post", "Row matches from one post", "The post an offer is on", "Serial dialog across posts".
  - MODIFIED for scenarios that put two of the partner's lists in one You get picker, which can no longer happen: "Hidden serials stay hidden in offers", "Copies grouped by collection in the pickers", "Grouped tile lines", "Serial dialog", "Any serial in the serial dialog", "Ratio hint in the builder".
  - MODIFIED for the builder's labels: "Offer page layout" (the "Add from {name}'s lists" label goes) and "The added-matches line" (row matches name their post).
  - REMOVED: "Recipients who take asks across posts", "An offer on no post", "Asks from your posts mark", "Notice after declining an offer across posts", "One notice per decline".
- `web-account`: MODIFIED "Offer rules".
- `web-trade-browse`: MODIFIED "Make offer on a post".
- `web-trade-for-you`: MODIFIED "Make offer to a partner".

## Routes

`/trade/@<handle>/offer` (every Make offer and Counter), `/messages` (offer cards, the decline notice), `/account/trade`.

## Non-goals

- More than one open offer per conversation, or one per post: `offer_one_open` stays, so a sender sends one offer after the other.
- Offer rules per post.
- Other changes to Only offers with what I want or Let people ask for anything I hold.
- Dropping the column.
- Removing the picker code that groups two lists' copies in one tile; it stays, unreachable for You get.

## Impact

- `packages/api`: `services/offer/` (`index.ts`, `core.ts`, `view.ts`, `picker/index.ts`), `lib/offer-recipient-rules.ts`, `schemas/offer.ts`, `schemas/user.ts`, `services/account/`, `docs/offers.md`. No `/api/v1` procedure is involved.
- `packages/db`: `auth-schema.ts`, a no-op migration, `AGENTS.md`.
- `apps/web`: `features/offers/` (builder, `offer-body.tsx`, `wanted-rule.ts`; `one-post-rule.ts` and `decline-nudge.ts` deleted), `features/account/sections/trade.tsx`, `docs/offers.md`, messages.

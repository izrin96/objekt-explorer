## Why

A recipient with several posts gets offers that ask from more than one of them at once. One user (silvinei) reported that each ask was fine inside its own post, but mixed into one offer it was not a deal they would take. The switch that stops this, "Let people ask from more than one post" (Account › General, on by default), already exists, but nothing on an offer or after a decline points the recipient to it.

## What Changes

- **A mark on a received offer that asks from more than one of the recipient's posts.** The offer card reads "Asks from 2 of your posts: doubles and spares" where "Offer on {post}" would sit (an offer across posts has no post, so that line is empty). Information only, like "Not on your wants": it never blocks accept, decline or counter. The sender never sees it. It shows on every status of the offer, as "Not on your wants" does.
- **A one-time notice after declining such an offer** while "Let people ask from more than one post" is on and the recipient has two or more posts on Trade. It offers to turn the switch off with one button, Turn off, which saves it. Shown once per browser, like "Nudge after declining an unwanted offer".
- **One notice per decline.** When a declined offer qualifies for both notices, the "Only offers with what I want" nudge shows if this browser has not shown it yet, otherwise the one-post notice.
- **The Messages notice for Only offers with what I want is removed.** It introduced that setting when it was new; beside the new notice it would put two requests about offer rules on one screen. The decline nudge and Account › General still offer the setting.
- Open offers stay as they are when the switch is turned off; the switch applies to the next offer sent (as `web-account` already says).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-offers`: adds "Asks from your posts mark", "Notice after declining an offer across posts" and "One notice per decline"; modifies "The post an offer is on" so its "no line" sentence makes room for the recipient's mark, and "Nudge after declining an unwanted offer" so its four "no notice shows" scenarios speak only of that nudge, since the same decline may now show the notice about posts; removes "Notice of Only offers with what I want".

`web-account` needs no delta: the switch, its default and its description do not change, and "each offer rule SHALL apply to the next offer sent; offers already open SHALL stay" stays true when the switch is saved from the notice.

## Routes

`/messages` (offer cards in a conversation thread; the notice above the conversation list goes). `/account/general` is not changed; it shows the switch off after the notice saves it.

## Non-goals

- A per-post setting. It waits for the planned `trade_post` table.
- Changing the switch's default (26% of senders ask across posts) or forcing one post per offer for everyone.
- Any change to the send-time rules (`createOffer`, `onePostVerdict`), the builder, or what the sender sees.
- A Messages-top notice for this switch.
- The trade page (`/trade/mine/$tradeId`), which shows an accepted offer's items through its own read.

## Impact

- `packages/api`: `services/offer/view.ts` (`fetchOffers` reads the posts the asks came through and the notice's gate, recipient-only, in the same statement; `toOfferView` adds `askPosts` and `suggestOnePost`); `schemas/offer.ts` (two optional fields on the offer view); `docs/offers.md`. No input change: `user.setOfferRules` already takes `multiPostAsks`. No migration, no new column.
- `apps/web`: `features/offers/offer-body.tsx` (the mark, the decline hook), a new `features/offers/one-post-rule.ts` (save and notice), a new pure `features/offers/decline-nudge.ts` with its test, a small change to `wanted-rule.ts`; en, ko and ja messages.

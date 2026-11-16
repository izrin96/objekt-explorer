# Proposal

## Why

Offer on lists only the partner's have and sale posts, so a Buy post (a want list leading its own post) can never be chosen. On production, "calm" has the have post "Up for trade" (paired with "wishlist") and the Buy post "favourite objekts i needddddd", with Only offers with what I want off. Every Make offer for calm reads the plain line "Offer on Up for trade". An offer started from the Buy post is stored on no post, so its card shows no "Offer on" line. The owner decided that Buy posts become options in Offer on.

## What Changes

- Offer on lists the partner's Buy posts after their have and sale posts, each with its Want badge. A partner with one have post and one Buy post now gets a choice instead of the plain line. A counter offers no Buy post.
- While Offer on names a Buy post, You get has no Add button and a new line says the offer asks for nothing. Picks already under You get are outlined "Not on {post}" and block Send, as when moving between have posts. You give is held to that want list when the partner's rule is on, and the request names it as `wantList`.
- Offer on opens on a Buy post when the builder started from it: the post's own Make offer, its matches, or a row's You give matches from it. A row whose lead post is a Buy post still opens on the first have or sale post. To tell the two apart, a Buy post's own Make offer now passes the post as `start`.
- Once the partner has a have or sale post, Offer on alone decides which want list You give is held to. The start no longer holds You give on its own while Offer on names another post.
- A partner whose only post is a Buy post gets the plain line "Offer on {Buy post}" while the offer started from it asks for nothing.
- The server stores the Buy post's want list as the offer's post (`post_list_id`, and `post_id` through its row) when the request names it and asks for nothing new. The offer card and page then read "Offer on {Buy post}".
- The theirs candidates' `wantLists` gains `buy`, so the browser classifies a Buy post the way `resolveWantList` does.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-offers`: Offer builder, Matches of one post, Recipients who take only what they want, Builder for a want-only recipient, Choosing the post, Where Offer on opens, Row matches from one post, The post an offer is on.

## Impact

- **Routes:** `/trade/@<handle>/offer` (the offer builder); the offer card in chat and the trade page's offer view read the stored post.
- **API:** `packages/api/src/lib/offer-recipient-rules.ts` (+ test), `services/offer/picker/theirs.ts` and `picker/shared.ts`. `createOffer` reads nothing new.
- **Web:** `features/offers/builder/post-choice.ts` (+ test), `builder/form.tsx`, `features/trade/post-block.tsx`, `trade-actions.tsx`, `person-row-view.tsx`, `messages/{en,ja,ko}.json`.
- **Docs:** `apps/web/docs/offers.md`, `packages/api/docs/offers.md`.
- **Data:** none.

## Non-goals

- Refusing on the server a request that names a Buy post and also asks for objekts. It stays an offer on the post its asks fit, as today. The web never sends one.
- Offer on for a partner with no have or sale list beyond the one line, and a choice between several of their Buy posts.
- Buy posts in a counter.
- Changing the wording of Only offers with what I want in Account › Trade.
- Re-storing the post of offers already sent.

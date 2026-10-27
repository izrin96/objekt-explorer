# Proposal

## Why

A Trade row already says "They have 5 you want · You have 3 they want", yet Make offer opens an empty builder, and the sender must find those eight objekts again in two pickers. A row also shows several posts, with no way to make an offer on one of them, and a strip with no "+N" tile can't open its whole list.

## What Changes

- **Make offer on a Trade row** (Browse and For you) opens the builder with the row's matches already added, swaps and sales alike: under You give, a copy of each collection the viewer has that the person wants; under You get, each one the person has that the viewer wants. The row's builder no longer opens empty.
- The matches are the ones the row counts, under the same Compare with list, read live. A match through a sale list is added too, with no top-up: the sender sets the price.
- **Which copy:**
  - You give takes the sender's highest serial they can send, preferring one in none of their other open offers.
  - You get asks for any serial where the person listed one, and otherwise their lowest serial they can send.
  - One per collection, up to 50 a side.
- **A status line above the sides** reads "Adding your matches…", then says what was added, with **Remove matches**, which keeps the sender's own picks and offers Undo. An empty builder closes without asking to discard.
- **A ⋯ menu on each post:**
  - **Make offer on this post** opens the builder with only that post's matches, and You get's picker open on the post's have or sale list. It shows on every post of a row that takes messages.
  - **Show all of {list}** for each strip opens the same dialog as its "+N" tile.
- **Make offer in a conversation** adds the matches when the conversation's newest card is a Trade post card carrying a match, scoped to that post. Otherwise it opens empty.
- **Unchanged:** counter-offers and the Market listing's Make offer. With no match the builder opens empty, and a failed read says so.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-offers`: matches added on open, by person or by post, with the status line.
- `web-trade-browse`: Make offer adds the matches; each post gets a ⋯ menu.
- `web-trade-for-you`: Make offer to a partner adds the matches.

## Impact

- `packages/api`: `offer.suggest` is rebuilt on `recountPartners` for one partner, with a pure, tested copy choice. No web build calls it today.
- `apps/web/src/features/offers`: a matches source on `OfferRequest`, a loader with the status region in `offer-builder.tsx`, and the line in `BuilderForm`.
- `apps/web/src/features/trade`: the row passes partner and Compare with; a ⋯ menu per post.
- `apps/web/src/features/chat/thread`: Make offer passes the partner and post.
- en, ko and ja messages.
- `big-trade-layouts` has shipped. Its blocked-picks banner sits inside each side (`builder/side-column.tsx`), so it never shares a slot with the line.

Routes: `/trade`, `/trade/for-you`, `/messages/$id`.

## Non-goals

- Setting a top-up from a sale list's price: a match through a sale list is added without one.
- Balancing the sides or choosing a subset: everything matched is added, and the sender trims.
- Changing what the row counts or how matching works.
- Narrowing what may be sent: a post's Make offer only opens on its list, as a Market listing does.
- Marking the added picks on their tiles.
- A per-post Message.

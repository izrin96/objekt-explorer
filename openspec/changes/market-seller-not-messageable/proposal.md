# Proposal

## Why

On the objekt drawer's Market tab, a listing whose seller can't be messaged loses its ⋯ menu (Message, Make offer, View list) and keeps only a bare View list caret, with no reason given. A buyer can't tell a seller who has messages off from a broken row. Trade rows already say "Not taking messages" in the same case (`web-trade-for-you`), so the Market tab is the one place that stays silent.

## What Changes

- A Market tab row whose seller can't be messaged reads "Not taking messages" as a muted line under the seller's name, wrapping on a phone rather than cut short. It uses the words Trade rows show, already translated in ja and ko.
- The row keeps its View list caret, and its other cells are unchanged.
- No note on the viewer's own listing. A signed-out visitor sees it too, as on Trade: the site's listings say whether each seller takes messages whether or not anyone is signed in.
- Rows whose seller can be messaged are unchanged.

Route covered: the objekt drawer's Market tab, wherever the drawer opens (the home grid, Market, profiles and list pages).

## Non-goals

- Make offer stays hidden wherever Message is hidden. An offer to a seller who isn't taking messages is refused by the server's start rules, so there's nothing to offer.
- No new wording. A seller blocked by the viewer, or blocking them, reads the same note, which doesn't reveal a block.
- The Trade rows' note and the deal strip are unchanged.
- The main spec's "Message a seller from the Market tab" still describes a phone bar that commit `8dcc86e9` removed. That drift is left for a separate change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-objekt-browser`: adds a requirement that a Market tab row whose seller isn't taking messages says so. The existing Message and Make offer requirements are unchanged.

## Impact

- `apps/web/src/features/objekt/drawer/market-listing.ts` (with its test): a pure helper that tells the three cases apart (can message, not taking messages, own listing).
- `apps/web/src/features/objekt/drawer/market.tsx` and `market-row.tsx`: the row receives that case and draws the note.
- No API, schema or message changes: `messageable` is already on each listing the site reads, and `trade_not_messageable` already exists in en, ja and ko.

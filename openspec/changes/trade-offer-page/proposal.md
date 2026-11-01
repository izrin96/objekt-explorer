## Why

The offer builder is a dialog that stacks its pickers as a second dialog on top. Matches often fill a side (50 of 232), and in a dialog the sides scroll inside small boxes while the picker covers them. The user chose a page for new Trade surfaces. A prototype (2026-11-01) compared three layouts, and the user chose variant A with two changes: the matches line runs above both sides, and the picker sheet takes the width of the sides.

## What Changes

- **Make offer opens a page, `/trade/@<handle>/offer`, everywhere.** That covers Trade rows and each post's ⋯ menu, the person and post pages, a near match's Make offer with it, chat's Make offer (Add to message and the deal strip), Counter, the trade page's status card, and an objekt's Market tab. The dialog goes.
- **The URL carries how the offer starts, never the sender's picks.** It names where the offer is addressed (a list, or the conversation), which matches to add (the row's, under Compare with and Mutual, or one post's), a near match to add, a counter's offer, or a Market listing's objekt and sale list, plus where to return. The page then reads the matches, or the countered offer, as the dialog did.
- **Layout (variant A).**
  - A narrow column holds the title, then a sticky part with the top-up, note, "Sending as" and Send.
  - The main area holds the matches line across its width, then You get and You give side by side. The sides grow with the page instead of scrolling in boxes.
  - Add opens the picker in a sheet from the end edge, as wide as the main area, leaving the column in view.
  - On a phone everything stacks, with Send in a bottom bar.
- **Leaving.** Back to <name>, or Cancel, returns to where the viewer came from. A draft that holds something asks before it is discarded, as closing the dialog does; that includes leaving by a link or the browser's back, and a reload or closing the tab gets the browser's own prompt. Sending goes to the conversation, as now.
- A signed-out visitor is sent to sign in and back.

Routes: `/trade/@<handle>/offer` (new). Every place that opened the builder now links to it.

## Non-goals

- Keeping a draft across a reload or a visit elsewhere: it is lost after the prompt, as a closed dialog's is.
- Any change to what an offer may hold, the pickers' filters, the matches rules, `offer.create`, or the send checks.
- The sender's picks in the URL (a Market link names only its one listed objekt).

## Depends on

`trade-person-and-post-pages`, for the handle and `trade.person`. It in turn follows `trade-ratio` and `trade-post-page`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-offers`: Offer builder (a page, not a dialog), Picks in the builder, Reading the matches, and Closing after matches were added become the page's. New requirements cover the page's address, its layout, leaving it, and its phone layout.
- `web-chat`: Add to message focus, since Make offer now leaves the thread.

## Impact

- **Web:**
  - a route `trade/@{$handle}/offer.tsx` with its search schema;
  - `OfferBuilder`, `useOfferBuilder` and `OfferBuilderProvider` go;
  - `MatchesBuilder` and `BuilderForm` render in the page;
  - `OfferPicker` becomes a sheet;
  - every caller links through one `offerLink` helper (`person-row-view.tsx`, `trade-actions.tsx`, `make-offer-button.tsx`, `near-note.tsx`, `thread.tsx`, `next-step-banner.tsx`, `objekt/drawer/market.tsx`);
  - strings in en, ko and ja.
- **API:** none. Counter reads its offer through `offer.views`.
- **Database:** none.

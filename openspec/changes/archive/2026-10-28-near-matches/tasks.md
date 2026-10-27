# Tasks

## 1. Near index (packages/api)

- [x] 1.1 Add `nearFor(listType, list, viewer)` to `lib/trade-feed.ts` per the design's table, and unit-test it beside `indexFor`. Cover all six rows, plus "a match is never near" and "Open both ways has none". Lint, typecheck and test pass.
- [x] 1.2 Thread `near` into `previewSide`, `assemblePost` (`post.match.near`), `fullSide` and `listMatchesOf`, ordering ringed, then near, then newest. Extend `schemas/trade.ts` additively. Bump any cached feed key whose value now holds `post.match`. Lint, typecheck, test and build pass.

## 2. Strips, popover, dialog (apps/web)

- [x] 2.1 Add `NEAR_RING` beside `RING`. Ring near items in `post-side.tsx` `StripTile`, and in `thumb-grid.tsx` where it rings, with the accessible description. Add the muted "N more if you sell/swap/buy" after the count, shown also when the count is 0, and never on the viewer's own row or for a signed-out visitor.
- [x] 2.2 `matched-lists.tsx`: after the counted lists, list `near.listIds` muted with the near text. Open the popover from the near line when there is no count chip.
- [x] 2.3 `side-items-dialog.tsx`: dashed rings, and the two-ring key when any near item shows. The matching tab keeps only matches. Lint, typecheck and build pass.

## 3. Drawer line and fixes (apps/web)

- [x] 3.1 Pass a near context through `onOpen` from the strip and the dialog into the objekt drawer. Render the reason line with the person and both list names.
- [x] 3.2 Sell fix: add a `listTypes` and bound-only option to the Add to list dialog, and open it on the objekt with sale lists only.
- [x] 3.3 Swap and buy fixes: open the composer with `openWith` from the viewer's post holding the list, `alsoPay` or `alsoSwap` set; a new post with the list picked when it is on none. Make sure the composer host exists on Browse and For you. Lint, typecheck and build pass.

## 4. Builder and picker

- [x] 4.1 `suggestOffer`: compute `near` per the design, scoped by person or `post`, with picks from `chooseMatchPicks`, without adding them. Pure narrowing is tested in `lib/offer-prefill.test.ts`.
- [x] 4.2 `matches-line.tsx`: the near line with Add it. Add it adds the picks and joins them to the `added` set, so Remove matches takes them out. Make offer with it opens the builder with `addNear`.
- [x] 4.3 Top-up preset: a sell or buy near match added with no top-up opens the top-up with the payer set, no amount, and the reason line.
- [x] 4.4 Picker tags in `mine.ts` and `theirs.ts` (`near` with verb, `loose`), rendered under the card in `offer-picker.tsx` / `candidate-grid.tsx`. Lint, typecheck, test and build pass.

## 5. List page and help

- [x] 5.1 `show-my-matches.tsx` and `list-view.tsx`: show near matches dashed after the matches, add "· N more if you …" after the count, and keep the count and total to matches only. When nothing matches but near matches exist, show "Nothing here matches" with the near matches under it.
- [x] 5.2 `match-help.tsx`: add the Dashed ring row in Good to know.
- [x] 5.3 Messages in en, ko and ja for every new text, with the viewer as the one who acts. Lint, typecheck and build pass.

## 6. Check and docs

- [x] 6.1 Browser check on local dev: sodalove's row (strip, popover, dialog, drawer line, Add to list sale-only), Make offer and Add it with the top-up preset, the picker tags, Show my matches, and the help row, in light and dark, en and one other locale. No test data unless approved.
- [x] 6.2 Update `packages/api/AGENTS.md` (Trade matching: `nearFor` sits beside `indexFor` and both change together; near never enters the recount) and `apps/web/AGENTS.md` if the ring constants are listed there, or state that none changed.

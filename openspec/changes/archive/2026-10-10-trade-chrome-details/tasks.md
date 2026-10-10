## 1. Tab counts API

- [x] 1.1 In `packages/api/src/services/offer/trades.ts`, move the Needs you and In progress predicates into named helpers and use them in `fetchMine`. Verify My trades still lists the same groups (typecheck plus a read-only load of `/trade/mine`).
- [x] 1.2 Create `packages/api/src/services/trade-tabs.ts` with `tabCounts(userId)` (design decision 1). Add `tabCountsOutputSchema` to `schemas/trade.ts` and the `tabCounts` authed procedure to `routers/trade.ts`. Verify lint and typecheck pass for `@repo/api`.

## 2. Tab counts UI

- [x] 2.1 In `apps/web/src/features/trade/trade-tabs.tsx`, query `trade.tabCounts` for signed-in users only (`staleTime` 60s). Render each count after its label (hidden at 0, "99+" above 99), with the count in the tab's accessible name. Add messages to en/ja/ko.
- [x] 2.2 Invalidate `trade.tabCounts` wherever `offer.mine` is invalidated (`features/offers/actions.ts` and the send path). Verify a signed-out `/trade` sends no `tabCounts` request, and that lint, typecheck and build pass for `web`.

## 3. Freshness

- [x] 3.1 In `for-you-results.tsx`, add "Ownership checked <relative>" from `checkedAt` to the summary line. In `partner-row.tsx`, add "updated <relative>" after `TrustLine` from `partner.updatedAt`. Both are mono `<time>` elements rendered after hydration with the shared relative-time helper. Add messages to en/ja/ko. Verify lint, typecheck and build pass for `web`.

## 4. Mono

- [x] 4.1 Add `features/offers/mono.tsx` (`Mono`). Apply it to the O/T numbers, serials (`item-label.tsx`), top-up amounts, "n/m" progress and section counts in `my-trades-view.tsx`, `trade-view.tsx`, `leg-table.tsx`, `trade-steps.tsx`, `offer-body.tsx`, `offer-card.tsx`, `offer-item.tsx` and the For you / Browse headings.
- [x] 4.2 In `trust-line.tsx`, wrap the verified count and the percentage in `Mono`. Verify the screen reader text is unchanged, and that lint, typecheck and build pass for `web`.

## 5. Spec clean-up checks

- [x] 5.1 Confirm the code matches the corrected requirements, with no edits expected:
  - `browseSearchSchema` has only `type`/`slug`/`matches`, and an old `?season=` link is ignored;
  - `toBrowseInput` drops the artist scope for `slug`;
  - `NO_FILTERS.matchOnly` is `false` in `offer-picker.tsx`;
  - `createListInputSchema.matchSale` defaults to `false`, and the update path keeps the stored value.

  Record any mismatch instead of changing behaviour.

## 6. Verify

- [x] 6.1 Run `bun run check` and `bun run build --filter=web`. Both pass.
- [x] 6.2 Browser check at 1280px and 390px, signed in and signed out, on `/trade`, `/trade/for-you`, `/trade/mine` and a trade page. Read-only. Record the tab counts against the For you / My trades lists, the freshness lines, the mono data, and that the tab bar doesn't overflow at 390.
  - Result (read-only, signed in; 1280 px and 390 px): For you tab "31" = 31 partner rows and "People: 31"; My trades tab "4" = Needs you 0 + In progress 4; the tab's accessible name reads "For you, 31" and "My trades, 4"; "Ownership checked" and "updated" lines render as mono `<time>` elements; O/T numbers, "n/m" progress, verified count and percentage render in mono; no horizontal overflow at 390 px on `/trade`, `/trade/for-you`, `/trade/mine` and a trade page.
  - Signed out (isolated browser context): no tab shows a count and no `trade/tabCounts` request is sent.
  - Not exercised: a count above 99, a tab count after accepting or sending an offer (writes), and the ja/ko locales.

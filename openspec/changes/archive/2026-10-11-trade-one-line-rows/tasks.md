## 1. Shared pieces

- [x] 1.1 Add `features/trade/strip-fit.ts` with a pure `fitCount(width, total, { thumb, gap, fallback })` per design decision 2, and `strip-fit.test.ts` covering: all fit, one short (leaves room for "+N"), width 0 returns the fallback of 4, and a total smaller than the fallback. Verify `bun test apps/web/src/features/trade/strip-fit.test.ts` passes.
- [x] 1.2 Rewrite `post-side.tsx` as the one-line `PostStrip` (design decisions 2 and 3): label with the list type tone and the side's count, a `flex-nowrap overflow-hidden` row of `w-14` thumbnails measured with `useElementSize`, rings and sale prices kept, and a `more` render prop for the "+N" tile whose count is hidden items plus the server's `more`. Remove `STRIP_LIMIT`. Verify lint, typecheck and build pass for `web`.
- [x] 1.3 Add `trade-row.tsx` with `TradeRow` (byline / sides / actions / below / panel slots, `@container` grid, one column below ~48rem) and `TradeSides` (one or two strips, `ArrowsLeftRightIcon` between two, rotated when stacked). Verify lint, typecheck and build pass for `web`.

## 2. Browse

- [x] 2.1 Rebuild `browse-post.tsx` on `TradeRow`: byline = `TradeHeader` + tags + mono time; sides = `PostStrip`s with the "+N" linking to the list; actions = compact `TradeActions`; below = list link, truncated description with `title`, `MatchChip`, See in For you link. Update `BrowsePostSkeleton` to the same frame. Verify a one-sided (WTS, WTB) post spans the sides' width.
- [x] 2.2 In `browse-view.tsx`, drop `POSTS_PER_ROW`, `ROW_GRID` and the pairing; one post per virtual item with the gap on the item, `ssrCount = Math.min(SSR_POSTS, posts.length)`, the `undefined` guard kept, skeletons stacked one per row. Verify view-source of `/trade` shows posts and infinite loading continues. Verify lint, typecheck and build pass for `web`.

## 3. For you

- [x] 3.1 Rebuild `partner-row.tsx` on `TradeRow`: byline = `TradeHeader` with the updated time and "also" names, then chip, "N lists" popover and idle badge; sides = two `PostStrip`s of counted objekts (empty direction reads 0 and "none"), each "+N" opening the row; actions = `TradeActions` then the chevron; panel = the existing columns, dropped items and footer with Hide. Update `PartnerRowSkeleton`. Verify lint, typecheck and build pass for `web`.
- [x] 3.2 In `for-you-results.tsx`, make rows start closed (`open = toggled.has(id)`) and have a `partner=` target always added to the open set during render. Verify `?partner=<id>` opens, scrolls to and highlights that row, active or idle. Verify lint, typecheck and build pass for `web`.

## 4. Clean-up

- [x] 4.1 Remove now-unused exports and messages (e.g. `ROW_GRID`, any unused strip constants) and add any new messages (the "none" label, if no existing message fits) to en/ja/ko. Verify `bun run knip` reports no new unused exports, and lint, typecheck and build pass for `web`.

## 5. Verify

- [x] 5.1 Run `bun run check` and `bun run build --filter=web`. Both pass.
- [x] 5.2 Browser check at 1280 px and 390 px, light and dark, on `/trade` (signed in and out) and `/trade/for-you`, read-only (open popovers and the offer builder, send nothing). Record: one post per row; a pair's strips side by side with ⇄; strips one line ending in "+N" whose count changes on resize; WTS prices under thumbnails; stacked rows at 390 with no sideways scroll; For you rows closed with strips, opening to columns, dropped items and Hide; a `partner=` link opens its row.

## 6. Review fixes

- [x] 6.1 Top-align side-by-side strips (labels on one line), centre only the ⇄, and make the byline span the sides' and `below` rows in `trade-row.tsx`. Verify lint, typecheck and build pass for `web`.
- [x] 6.2 Move For you's match chip, "N lists" and idle label from the byline into `below`, and its skeleton with it. Verify lint, typecheck and build pass for `web`.
- [x] 6.3 Add `SOLO_PREVIEW_LIMIT = 20` and pass it from `assemblePost` for one-sided posts, with a test in `trade-feed.test.ts`. Verify `bun test packages/api/src/lib/trade-feed.test.ts` passes.

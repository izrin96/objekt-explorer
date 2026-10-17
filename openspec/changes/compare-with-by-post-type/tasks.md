# Tasks

## 1. Rule and request

- [x] 1.1 In `compare-rule.ts`, add `matchSale` and `matchHave` to `TradeList` and `tradeListsOf`, and give `canCompare` and `comparedList` an options object `{ mutual, type }` with the WTT, WTB and WTS rules (design 1, 2). The pure rule lives in `compare-rule.ts` (no Paraglide import, so `bun test` runs without a compile); callers import it from there. Add `compare-rule.test.ts` covering the matrix: All disables nothing; WTT disables a lone Buying only want list; WTB disables a lone want list; WTS disables a lone have list, a sale list, a lone Swaps only want list and a have and want pair with a Swaps only want list, and allows a want list open to buying alone or paired; Mutual unchanged. Verify `bun test apps/web/src/features/trade` passes, and lint, typecheck and build pass for `web`.
- [x] 1.2 In `browse-search.ts`, make `toBrowseInput` take `tradeLists` and send only a list the type can use; update `browse-loader.ts` and `browse-view.tsx` to pass them (design 3). Update `browse-search.test.ts`, with the stale-list case (`type=wtb`, a lone want list is not sent). Verify `bun test` passes, and lint, typecheck and build pass for `web`.

## 2. Controls and layout

- [x] 2.1 In `matching-controls.tsx` and `browse-view.tsx`, pass the effective type to `MatchingControls` and `ComparedLine`, disable options the type can't match, and read the menu value, the line and the person sheet through `comparedList` with the type; reset `list` in the Type `onChange` (design 4, 5). Verify lint, typecheck and build pass for `web`.
- [x] 2.2 Reorder per design 6 in `matching-controls.tsx`. Verify lint, typecheck and build pass for `web`, and in the dev server at `md` and above that Mutual only is rightmost, and below `md` the order is unchanged (record if sign-in was not possible). Verified in the browser by the supervisor (WTB, WTS and Mutual options, the reset, the stale link, the switch at the right edge).

## 3. Verify and document

- [x] 3.1 Run `bun run check`. Verify it passes.
- [x] 3.2 Browser check on `/trade/for-you` with WTB and WTS picked, read-only (record if sign-in was not possible). Verify the disabled options match the spec scenarios. Verified in the browser by the supervisor (WTB, WTS and Mutual options, the reset, the stale link, the switch at the right edge).
- [x] 3.3 State that no `AGENTS.md` changes: the packages' conventions and traps are untouched. Verify lint, typecheck and build pass for `web`.

# Tasks

## 1. API: paging and sale asks

- [x] 1.1 In `packages/api/src/lib/trade-feed.ts`, share one stack ranking between `previewSide` and `fullSide` that builds items only after slicing, and make `fullSide` take `offset` with a `SIDE_PAGE = 200` page in place of `FULL_SIDE_LIMIT`. `fullSide` also returns each page item's copy ids, which stay out of the output. `matched`, `near` and `copyCount` still count the whole side. Update `fullSide`'s tests in `trade-feed.test.ts` to cover the first page, a middle page, the last page, an offset past the end, and `matched` staying whole-side. Verify: `bun test packages/api/src/lib/trade-feed.test.ts`.
- [x] 1.2 Add the pure `stackAsk(copies)` to `lib/trade-feed.ts`. It folds `{ id, price, isQyop, note }[]` into `{ price?: { min, max }, qyop?: true, notes?: string[] }`, with notes trimmed, distinct and newest first, and empty fields left out. Its tests cover: one price; a range; priced plus QYOP; QYOP only; none; duplicate notes; blank notes. Verify: `bun test` for that file.
- [x] 1.3 In `schemas/trade.ts`:
  - `sideItemsInputSchema` gains `cursor` (a coerced whole number ≥ 0, optional);
  - `sideItemsOutputSchema` gains `nextCursor` (optional), and its items gain optional `price`, `qyop` and `notes`;
  - `previewItemSchema` and `feedSideSchema` stay unchanged.

  Verify: typecheck `@repo/api`.
- [x] 1.4 In `services/trade-feed/index.ts`, `fetchSideItems` changes as follows:
  - it passes `cursor` as the offset and returns `nextCursor` while `more > 0`;
  - it fetches collections for the page's slugs only;
  - for a sale list, it reads `price, is_qyop, note` from `list_entries` for the page's copy ids in one query and folds them through `stackAsk`.

  Verify: lint, typecheck and build of `@repo/api`. Then check read-only, against the dev server: `GET /api/v1/trade/lists/{id}/items` on a sale list of more than 200 collections returns 200 items, `nextCursor`, and `price`/`notes` on priced stacks. `?cursor=-1` returns 400. A have list's items carry no price fields.

## 2. Web: sheet, paging, prices

- [x] 2.1 Add `PanelCardGrid` to `features/objekt/virtual-card-grid.tsx`, sharing `VirtualCardGrid`'s rows: virtua's `Virtualizer` inside the surrounding panel's scroll area (`scrollRef`, a measured `startMargin`); both grids load the next page a viewport ahead. Existing callers stay unchanged. Verify: typecheck `web`; the offer picker and the attach pickers render as before.
- [x] 2.2 Add the pure `stackPriceText(ask, format)` in `features/trade/` beside its test. It returns one price, an en-dash range, QYOP or "No price" (with a muted flag), reusing `formatCurrency` and the list page's messages. Make `ObjektNote`'s popup keep line breaks (`whitespace-pre-line`). Verify: `bun test` for the new test; the list page's note popover reads as before.
- [x] 2.3 Make `sideItemsOptions` (`features/trade/queries.ts`) infinite: `orpc.trade.sideItems.infiniteOptions` with `initialPageParam: 0`, `getNextPageParam: (page) => page.nextCursor`, `enabled` only while open, and the same stale time and `retryUnlessRefused`. Verify: typecheck `web`.
- [x] 2.4 In `side-items-sheet.tsx` (`SideItemsSheet`):
  - `SheetPopup` keeps the end side, `sm:max-w-3xl` and `finalFocus`, and `SheetPanel` keeps the description, rules, tabs and cards, which go through `PanelCardGrid`;
  - pages are flattened and deduped by collection slug;
  - the matched tab loads more while fewer than `matched` ringed items are loaded, and All loads while `hasNextPage`;
  - sale cards get `price`, `priceMuted` and `note` from 2.2, and have and want cards none;
  - the "N more on the list page" line goes, and `trade_side_more` is removed from every `messages/*.json` if nothing else uses it.

  Update the imports in `post-side.tsx`, `person-row-view.tsx`, `person-page-view.tsx` and `browse-view.tsx`. Verify: lint, typecheck and build of `web`.
- [x] 2.5 Browser check on the dev server (read-only), following the user's browser-use rules:
  - At 1280 px, a "+N" opens the end-side sheet 48rem wide with six columns. Everything in the panel scrolls under its edge fades, with the thin overlay scrollbar.
  - At 390 px the sheet is the viewport less 3rem, with three columns.
  - On a sale list of more than 200 collections, scrolling loads more until the end, with no "more on the list page" line.
  - A sale stack shows a range or one price, QYOP and "No price" read as the list page's do, and the note button lists each note.
  - A have side shows no prices.
  - The matched tab holds only rings, and near matches sit dashed after them in All.
  - The post menu's Show all opens the sheet, and closing it returns focus to the menu button.
  - Light and dark, and ko/ja labels.

## 3. Docs

- [x] 3.1 Update `apps/web/AGENTS.md` (UI kit: `PanelCardGrid` for a long list inside a panel, and loading ahead) and `packages/api/AGENTS.md` if it describes `sideItems` or the 300 cap. Otherwise state that it is unchanged. Verify: `rg -n "side-items-dialog|FULL_SIDE_LIMIT" apps/web packages/api` finds nothing stale.

## Workflow follow-up

- Archive with `/opsx:archive` once applied and checked. Commit only when the user asks.

# Tasks

The code for groups 1–3 is already in the working tree, uncommitted; apply checks each task against it and ticks it, fixing only what falls short.

## 1. Shared card columns

- [x] 1.1 `apps/web/src/features/objekt/card-grid.tsx` exports `useCardColumns` (`max(3, floor(width / 112))`, plus `measured`), `CardGrid` and `CardGridSkeleton` (two rows, invisible until measured), and `VirtualCardGrid` takes its columns from `useCardColumns` with no `CELL_PX` of its own. Verify: `grep -n CELL_PX apps/web/src/features/objekt/*.tsx` finds only `card-grid.tsx` (the list page's Rules strip keeps its own); lint, typecheck and build pass for `web`.
- [x] 1.2 Every picker placeholder is `CardGridSkeleton`: `chat/attach/attach-owned-picker.tsx`, `attach-list-picker.tsx`, `offers/candidate-grid.tsx` and the three in `trade/composer/add-objekts.tsx`; `GridSkeleton` is gone. Verify: `grep -rn "GridSkeleton\b" apps/web/src` finds nothing outside `CardGridSkeleton`; in the browser, the composer's Add objekts sheet, the offer picker and chat's attach dialog show placeholders in the columns their loaded grid takes, at 390 px and 1280 px; lint, typecheck and build pass for `web`.

## 2. Trade's "+N" sheet

- [x] 2.1 `trade/side-items-dialog.tsx` is `trade/side-items-sheet.tsx` exporting `SideItemsSheet`, a `SheetPopup side="right"` at `sm:max-w-3xl` with `SheetHeader`, `SheetPanel` and `SheetFooter` (Open list, Close), its objekts in `CardGrid` and its loading state `CardGridSkeleton`; `post-side.tsx`, `browse-view.tsx`, `person-row-view.tsx` and `person-page-view.tsx` import from it, and comments that called it a dialog say sheet. Verify: `grep -rn "side-items-dialog\|SideItemsDialog" apps/web/src` finds nothing; lint, typecheck and build pass for `web`.
- [x] 2.2 Browser check of the spec's scenarios on `/trade` and a person page: "See all of a list" at 390 px (end-side sheet, three columns, tabs), "See all of a list on a desktop" at 1280 px (48rem, six columns), "Nothing matches", "Show all without a "+N" tile" (focus back on the ⋯ button), and the near-match tabs and key. Opening an objekt closes the sheet and opens the objekt view. Read-only: no writes. Checked 2026-11-02 on the local DB; the near-match key went unseen, since no local list had a near match (its markup is unchanged).

## 3. Composer "+N" sheet

- [x] 3.1 In `trade/composer/preview.tsx` the "all" sheet is `sm:max-w-3xl`, the rule sheet stays `sm:max-w-lg` and the Add objekts sheet keeps its height. Verify in the browser on `/trade/new` with a list over 22 objekts: "+N" opens a sheet as wide as Trade's, and Add rule's sheet is unchanged; lint, typecheck and build pass for `web`.

## 4. Docs

- [x] 4.1 `apps/web/AGENTS.md` says that a short objekt grid inside a scrolling `SheetPanel` or `DialogPanel` uses `CardGrid` from `features/objekt/card-grid.tsx`, since virtua gets no viewport there, and that every objekt grid's placeholder is `CardGridSkeleton`. Verify: the UI kit rule names both; lint, typecheck and build pass for `web`.

## Workflow follow-up

- Archive with `/opsx:archive` once the browser checks pass and the user has committed.

# Proposal

## Why

A list's "+N" view on Trade is a centred dialog from `sm` up and a bottom sheet below it, with a fixed four or six columns. The composer's "+N" opens a side sheet whose columns follow its width. Two views of the same thing should look the same, and a wider view shows more of a long list at once.

## What Changes

- On Browse, For you, person pages and post pages, a strip's "+N" tile (and a post menu's Show all) opens a sheet from the end side at every width, about 48rem wide from `sm` up, in place of the centred dialog and the phone's bottom sheet. Its contents, tabs, rings, footer and focus return stay as they are.
- Its objekts lay out like every other picker sheet: one column per 112 px of the sheet's width, at least three.
- The composer's "+N" side sheet on `/trade/new` widens to the same 48rem. Its rule sheet keeps its width.
- Loading placeholders in the objekt pickers (the composer's Add objekts sheet, the offer picker, chat's attach dialog) show the columns the loaded grid will have, so the grid doesn't jump when it fills.

Routes: `/trade`, `/trade/for-you`, `/trade/@<handle>`, `/trade/@<handle>/<slug>`, `/trade/new`, `/trade/@<handle>/offer`, `/messages/<id>`.

## Non-goals

- What the "+N" view lists, its tabs, rings, the 300-collection cap and the footer.
- The Ticked tray and the rule tile popover keep their fixed columns.
- Thumbnail strips on pages (the Trade strips, the composer preview, the trade page and the offer's sides).
- Renaming `SideAllDialog` in `post-side.tsx`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-browse`: Trade card ("All of a list" opens a sheet at every width, its grid follows its width), Post menu (Show all opens that sheet), Post preview (the composer's "+N" sheet is as wide as Trade's).
- `web-trade-near-matches`: "A near match is never counted" and "Near matches in a list's dialog" call the view a sheet.

## Impact

Code only in `apps/web`; no API, schema or migration.

- New `features/objekt/card-grid.tsx`: `useCardColumns`, `CardGrid` (unvirtualised, for a short list in a scrolling panel) and `CardGridSkeleton`. `VirtualCardGrid` takes its columns from `useCardColumns`.
- `features/trade/side-items-dialog.tsx` becomes `side-items-sheet.tsx` (`SideItemsSheet`); its importers follow.
- `features/trade/composer/preview.tsx`: the "all" sheet's width.
- `GridSkeleton` leaves `chat/attach/attach-picker-parts.tsx`; the pickers and `offers/candidate-grid.tsx` use `CardGridSkeleton`.

The code is already in the working tree, uncommitted.

# Design

## Context

Picker grids in a fixed-height dialog or sheet (the composer's Add objekts and "+N" sheets, the offer picker, chat's attach dialog) use `VirtualCardGrid`: virtua rows inside a measured container, `max(3, floor(width / 112))` columns, 8 px between columns, 12 px between rows. Trade's "+N" view (`side-items-dialog.tsx`) had its own `grid-cols-4 sm:grid-cols-6`, and each picker's loading placeholder its own breakpoint columns, so the placeholders and the loaded grid disagreed.

The "+N" view's body is a `SheetPanel` (formerly `DialogPanel`), which scrolls through a ScrollArea; the description, rules, tabs and ring key scroll with the objekts. The server caps the list at 300 collections.

## Goals / Non-Goals

**Goals:** one column rule for every objekt grid in a dialog or sheet, loaded or loading.

**Non-Goals:** thumbnail strips on pages and the small fixed grids in a popover or tray (see proposal).

## Decisions

**Share the column rule, not the virtualiser.** `features/objekt/card-grid.tsx` holds `useCardColumns` (width → columns, plus whether it has been measured), `CardGrid` and `CardGridSkeleton`; `VirtualCardGrid` reads its columns from the hook. The "+N" sheet uses `CardGrid`, a plain `<ul>`: virtua needs a scroll viewport of its own and a `SheetPanel` scrolls through a ScrollArea, which gives it none (the composer's Add objekts sheet notes the same trap). Giving the objekts a fixed-height scroller of their own would split the description and tabs from the cards they head. At 300 collections the plain grid renders what the dialog rendered before.

**Hide until measured.** A grid's width is known only after layout, so `CardGrid` and `CardGridSkeleton` render invisible until the first ResizeObserver report, keeping their space so the panel doesn't jump. `VirtualCardGrid` already rendered nothing until measured.

**Skeleton sized from the same hook.** `CardGridSkeleton` draws two rows of the measured columns, replacing `GridSkeleton` (`chat/attach/attach-picker-parts.tsx`) and the offer picker's inline placeholder, so every picker's loading state matches its grid.

**A sheet from the end side at every width.** Matches the composer's "+N" sheet. The cnippet `SheetPopup` with `side="right"` leaves 3rem of the page visible on a phone. `sm:max-w-3xl` gives about 720 px of grid, six columns, the count the dialog showed from `sm` up. The composer's "+N" sheet takes the same width; its rule form keeps `sm:max-w-lg`, a form needing no room.

**Rename the file and component** to `side-items-sheet.tsx` / `SideItemsSheet`, since the name said what it no longer is. `SideAllDialog` in `post-side.tsx` keeps its name (proposal Non-goals).

## Risks / Trade-offs

- [Phone users lose the bottom sheet they could swipe from below] → the end-side sheet is the composer's, closes on its button, Escape or the backdrop, and returns focus as before.
- [A long list renders up to 300 cards unvirtualised] → unchanged from the dialog; the cards load thumbnails lazily.
- [Spacing is written twice: `CardGrid`'s `gap-x-2 gap-y-3` and `VirtualCardGrid`'s per-row `gap-2 pb-3`] → a comment in `card-grid.tsx` ties them; both read from one file pair.

## Migration Plan

Web only; ships with the next web deploy. No data or API change, so rollback is a revert.

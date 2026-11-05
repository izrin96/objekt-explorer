# Design

## Context

The composer's preview draws each picked side's objekts through `EntryThumb` (`features/trade/composer/preview-entries.tsx`). Today that is a `Popover` holding `EntryRatioPicker` on a side that swaps, and a plain tile elsewhere. The same component fills the "+N" sheet (`AllObjekts`). The list page acts on an entry through its ⋯ menu (`list-view.tsx`): Set price, Set ratio and Remove from list. Each opens a dialog (`set-price-dialog.tsx`, `set-ratio-dialog.tsx`, `remove-from-list-dialog.tsx`) whose target `useEntryDialogs` holds.

## Goals / Non-Goals

**Goals:**
- One place to act on an objekt in the composer, with the list page's dialogs and rules for who gets what.
- The picks stay valid across every save.

**Non-Goals:**
- Composer-only dialogs, inline price fields, or bulk actions.

## Decisions

**The thumbnail is a `Menu` trigger.** It holds the thumbnail face, as the popover's trigger did. A menu, not a popover holding buttons, because the list page already words these as menu items (`objekt_menu_set_price`, `objekt_menu_set_ratio`, `objekt_menu_remove_from_list`) and the separator before Remove carries over. The items follow `list-view.tsx`'s rules:
- Set price where the list is a sale list with a currency.
- Set ratio where `PreviewSide.ratio` is set. The composer's own rule, not `ratioSideOf`, so a Buy post's want list stays without one.
- Remove everywhere, since the viewer owns every picked list.

**Reuse the three dialogs through `useEntryDialogs`, mounted once per side.** `useSideDialogs` wraps `useEntryDialogs()` and renders the three dialogs. `PickedSide` and `AllObjekts` each call it, since the sheet sits outside `PickedSide`. The thumbnails get its actions. Mounting the dialogs per thumbnail would hold about 23 `RemoveFromListDialog` mutations per side while they are closed, which `EntryRatioPicker` was written to avoid. The dialogs bring their mutations, invalidation (`useListInvalidation`, which refetches the side's entries) and toasts, so a refused save already says why and keeps the dialog open.

**Ratio moves to the list page's `SetRatioDialog`; `EntryRatioPicker` goes.** One ratio surface per thumbnail, and the list page's. The cost: one more step (menu, then Save) where a tap on a choice used to save. "Ratio for all" keeps its inline picker, and so do the rule chips (`preview-rules.tsx`).

**Focus after a remove goes to the next thumbnail, else the Add objekts tile.** On success the trigger leaves the grid, so the dialog's default return (the previously focused element) is gone and focus would land on the page. This is the same Safari trap `EditListDialog`'s `finalFocus` solves.
- Each of the three dialogs takes an optional `finalFocus` and passes it to its popup. The list page passes none.
- A remove can remount the thumbnail after the removed one: the "+N" sheet's virtual rows are keyed by position, so an objekt moving up a row gets a new node, and in the preview the objekt behind "+N" slides into view. A node stored when the dialog opens can be detached by the time it closes.
- So `finalFocus` is a function (Base UI accepts one) that looks the target up by entry id (`data-entry-thumb`) as the dialog closes. When the dialog opens, `useSideDialogs` records the objekt's id, the next thumbnail's id and the objekt's position among the grid's thumbnails and "+N".
- Price, ratio and a cancelled remove return to the objekt's own thumbnail. After a remove (`RemoveFromListDialog`'s `onRemoved`, called on success before it closes) focus goes to the next objekt, else whatever now holds the removed one's position (the objekt that slid in, or "+N"), else the fallback: the Add objekts tile in the preview, the sheet's title (`tabIndex={-1}`) in `AllObjekts`.

**On a sale side, the "+N" sheet draws each price and note under its card.** `PriceCaption`, split out of `ObjektCard`, sits outside the menu trigger, since the note's popover button can't nest in another button. The price opens Set price.

**The ratio chip lies over the card's corner, with the count as its pair.** As on Trade's strip, in the composer and in Trade's "+N" sheet, through `ObjektCard`'s `cornerBadge`. The chip is inert there, so the card (or the menu trigger) carries its worded tooltip. `QTY_BADGE` and `RATIO_ON_CARD` live in `objekt-card.tsx` and step up together at the `@[9rem]` container width, where the label's type also grows.

**The trigger's label names the objekt.** Add `trade_composer_objekt_options` ("Options for {name}") and `trade_composer_objekt_options_ratio` ("Options for {name}, ratio {ratio}") where a ratio applies. These replace `trade_composer_objekt_ratio` and `trade_composer_objekt_ratio_set`, which then have no caller and go from en, ko and ja.

## Risks / Trade-offs

- `RemoveFromListDialog` clears the global `useSelection` store on success. Nothing on `/trade/new` selects, so this is harmless, but the dialog is reused as is.
- On Edit post, a list already on Trade changes its live post at once: Add objekts already behaves this way and warns. Remove and Set price don't repeat the warning. The confirmation and toast are the same ones the list page shows for a list on Trade.
- A thumbnail is 3.5 rem wide. The menu opens from it on touch as on desktop. Check it at 390 px.

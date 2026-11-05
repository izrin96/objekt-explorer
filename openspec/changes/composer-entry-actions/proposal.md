# Proposal

## Why

Once objekts are added to a picked list in the composer, the viewer can't take one back out or price it there. A thumbnail in the preview only sets a ratio, and only on a side that swaps; on a sale side or a Buy post's want side it does nothing. Fixing a wrong add or pricing a sale means leaving for the list page and losing the picks.

## What Changes

- **A menu on every thumbnail.** Each objekt thumbnail in the preview, and in its "+N" sheet, opens a menu with the list page's entry actions:
  - **Set price**, on a sale list with a currency.
  - **Set ratio**, on a side that swaps.
  - **Remove from list**, on every side.
- **The list page's dialogs, reused.** Each item opens the list page's own dialog: Set price, Set ratio, or the Remove confirmation. Each saves to the list at once and keeps the composer's picks, as rules and ratios already do. Leaving the composer without posting keeps the change.
- **Ratio moves behind the menu.** Tapping a thumbnail no longer opens the ratio picker directly; Set ratio in its menu opens the list page's Set ratio dialog, which saves on Save. "Ratio for all" by the list's name is unchanged.
- **Prices in the "+N" sheet.** On a sale side the sheet draws each objekt's price and note under its card, as Trade's own sheet does; the price opens Set price. The preview's thumbnails stay too small for one.
- **One look for a card's ratio and count.** The ratio chip sits over a card's bottom-end corner in the composer and in Trade's "+N" sheet, as on the strip, with the worded ratio as its hover tooltip. A card's copy count becomes an opaque pill sized like it, a step up on a wide card.
- **Focus stays in the side.** After a remove, focus moves to the next thumbnail, else the side's Add objekts tile. In the "+N" sheet it moves to the next objekt, else the sheet's title.
- The menu button's label ("Options for <objekt>", with its ratio where one applies) and the "+N" sheet's description ("Pick one to change or remove it.") are translated (en, ko, ja).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-browse`: adds removing and pricing an objekt from the composer's preview, and moves a thumbnail's own ratio into its menu.

## Non-goals

- Showing prices on the preview's thumbnails, which are too small for one; the Set price dialog opens with the stored price.
- Acting on several objekts at once. The list page's selection bar stays the place for bulk changes.
- Add to list (another list) from the composer's menu.
- Any change to Post, Edit post or what `trade.savePost` saves, or to the list page's menu.

## Routes

- `/trade/new` (New post and Edit post): the thumbnails of each picked side of the preview and of its "+N" sheet.

## Impact

- `apps/web/src/features/trade/composer/preview-entries.tsx`: `EntryThumb` becomes a menu trigger with a price caption on a sale side in the sheet; `EntryRatioPicker` goes. `useSideDialogs` mounts a side's dialogs for the preview and for `AllObjekts`.
- `apps/web/src/features/trade/composer/preview.tsx`: `PickedSide` mounts the side's dialogs once, through `useEntryDialogs`.
- `apps/web/src/features/list/set-price-dialog.tsx`, `remove-from-list-dialog.tsx`, `set-ratio-dialog.tsx`: an optional `finalFocus` lookup, and `onRemoved` on the remove; the list page passes neither and is unchanged.
- `apps/web/src/features/objekt/objekt-card.tsx`: `PriceCaption` split out of the card, a `cornerBadge` slot, and the shared `QTY_BADGE` and `RATIO_ON_CARD` classes.
- `apps/web/src/features/trade/side-items-sheet.tsx`, `post-side.tsx`: the sheet's ratio chip moves onto the card's corner; both use the shared classes.
- `apps/web/messages/{en,ko,ja}.json`: the menu button's labels and the sheet's description.
- `apps/web/AGENTS.md`: the Post composer paragraph names the menu and adds removals and prices to what saves at once.
- No API, schema or server change. The dialogs save through the existing `list.updateEntryPrices`, `list.setRatio` and `list.removeObjektsFromList` mutations.

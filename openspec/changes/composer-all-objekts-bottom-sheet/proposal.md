# Proposal

## Why

The post composer's two sheets for a side's objekts work differently. Add objekts comes up from the bottom with filters, named cards and a Ticked tray. All objekts slides in from the side with unnamed cards, no filters, a menu on every tap and a separate Select mode. Of three prototypes, the user picked All objekts built like Add objekts (variant B, `composer/proto-all.tsx`).

## What Changes

Route: `/trade/new` (New post and Edit post), the preview's "+N" tile and each side's Select button.

- All objekts opens from the bottom at the Add objekts sheet's size: `88dvh`, and below `sm` the viewport less 3rem.
- Its title is "All of {list}". The description gives the count and says to tick cards, then change or remove them together.
- An Add objekts button in its header swaps the sheet for that list's Add objekts sheet.
- The Add objekts filter bar filters the list's objekts in the browser.
- Cards show their name and serial, and a side that swaps shows the ratio chip. On a sale side the price and note sit under each card. The price no longer opens Set price.
- There is one mode: a tap ticks a card. The sheet has no menu on its cards and no Select or Cancel toggle.
- From `md`, a column beside the grid holds:
  - the Ticked tray, with Tick all (Tick shown while a filter is on) and Clear;
  - Set ratio, Set price, Add to another list and Remove N, all disabled while nothing is ticked.
- Below `md`, a bar under the grid holds the ticked count, which opens the tray, a Change menu, and Remove.
- The actions open the same dialogs as today. Focus returns to the control that opened the dialog, or after a remove to the sheet's title.
- The preview's own thumbnails keep their menus. The Select button stays and opens the same sheet as "+N".
- The prototype is deleted; both sheets share the Ticked tray and the tick tile.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-browse`:
  - Post preview: "+N" opens a bottom sheet.
  - Objekt menu in the composer: the preview's thumbnails only.
  - Prices in the composer's "+N" sheet: the price is no longer a button.
  - Select several objekts in the composer: one tick mode, the tray and the action column.
  - Focus after an objekt action: the sheet's rules.
  - Six new requirements: the sheet, Add objekts from it, the Ticked column, Tick all, the phone row and accessible ticking.

## Impact

- **Web:**
  - `apps/web/src/features/trade/composer/`: `preview.tsx`, `preview-entries.tsx`, `use-side-dialogs.tsx`, `add-objekts.tsx` and `add-objekts-grids.tsx`.
  - New files there: `all-objekts.tsx`, `ticked-tray.tsx`, `tick-tile.tsx` and `ticked-name.ts`.
  - `proto-all.tsx` and `proto-variant.ts` are deleted.
- **Messages:** en, ko and ja (`apps/web/messages/`). Two keys change, one is deleted and eleven are added.
- **Docs:** `apps/web/docs/trade.md`.
- **API and data:** none. The sheet reads the entries the preview already loaded.
- **Overlap:** `slim-list-entries` moves the composer's entry reads to `useListEntries`. Whichever change lands second reads entries the way the first one left them.

## Non-goals

- Trade's "+N" sheet (`side-items-sheet.tsx`): it shows someone's post, with nothing to tick or change.
- A want rule's See objekts sheet (`RuleObjektsSheet`): it shows what a rule covers, no entries to act on, and keeps its `sm:max-w-3xl` drawer.
- The menus on the preview's 22 thumbnails, and focus after acting on one.
- Add objekts' behaviour; it only shares its tray and tile.
- Discord text, the CSV export and the changelog stay English; this change touches none of them.

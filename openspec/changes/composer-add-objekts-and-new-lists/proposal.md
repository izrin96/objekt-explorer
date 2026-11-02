## Why

The post composer lets the viewer pick lists but not fill them. Someone starting their first post has to leave for `/list`, create a have or sale list there, add objekts from the index or their profile, then come back and start over. Only a want list can be made in the composer today, and it starts empty with no way to add objekts except by rule. Making a post should be possible from one page.

## What Changes

- **New list on every side, inside its dropdown.** Each side's dropdown (Has, Selling for, Wants) ends with New have list…, New sale list… or New want list…, which opens a dialog (prototype variant B, picked 2026-11-02).
  - Want asks only for a name. Today's inline New want list form goes.
  - Have and sale open the list page's create dialog with the type fixed and the list bound to a Cosmo profile, since Trade only takes bound have and sale lists. Sale also asks for its currency, as the dialog already does.
  - The new list is picked instead of the dialog offering Post it.
  - A viewer with no linked Cosmo profile sees New have list… or New sale list… disabled, plus a note under the dropdown linking to link one.
  - A side with no list of its type still shows its dropdown, so New list is always where the lists are, and nothing sends the viewer to `/list`.
- **Add objekts from a "+" tile on each picked side of the preview**, the first thumbnail, there even when the list is empty. It opens a sheet from the bottom as wide as the page:
  - the filter bar across the top, the grid on the left, and a Ticked tray on the right with the count, Clear, each ticked card removable, and Cancel and Add N at its foot;
  - Has and Selling for: the bound profile's holdings, one card per copy. Selling for also takes an optional price, QYOP and note in the tray, set on what it adds;
  - Wants: every collection of the artists the viewer has selected;
  - adds save to the list at once, like rules and ratios, and the preview updates. Leaving without posting keeps them;
  - on Edit post, for a list already in the post (so on Trade), the sheet says what's added shows on Trade straight away.

## Non-goals

- Removing objekts, editing prices or picking serials from the composer: those stay on the list page.
- Picking objekts from any profile but the one a have or sale list is bound to.
- Marking what is already on the list inside the picker: duplicates are skipped on add.
- Any server or schema change. `list.create` and `list.addToList` already do everything this needs.
- A general collection browser: the want picker is for adding to the picked list only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-browse`: "New want list in the composer" becomes "New list in the composer", covering have and sale lists; adds "Add objekts in the composer".
- `web-lists`: "Trade line in the list form" — the create dialog opened from the composer picks the new list instead of offering Post it.

## Routes

`/trade/new` (New post and Edit post).

## Impact

- `apps/web/src/features/trade/composer/` (`settings.tsx`, `preview.tsx`, and a new picker sheet).
- `apps/web/src/features/list/create-list-dialog.tsx` gains a way to fix the type and hand the new list back.
- Reuses `useCreateList`, `useAddToList`, `PickerFilterBar`, `VirtualCardGrid`, `ownedCollectionOptions`, `collectionOptions` and `PriceFields`.
- New Paraglide messages in every locale.
- No API, database or worker change.

## Why

A list sits in at most one post, so the composer shows a list already on Trade as disabled ("In your Swap post"). Putting the same objekts in a second post, say selling the have list that is already in a Swap post, means leaving the composer, going to `/list`, using Copy as new list, landing on the new list and coming back. On `/list` the copy is one step, and the composer should offer the same thing in place.

## What Changes

- Each side's dropdown in the composer gets **Copy a list…**, next to its New … list… item. The side decides the copy's type; the source can be a list of any type.
- The item opens a copy dialog that starts with a **Copy from** choice over every list the viewer owns, of any type, including lists already in a post. Picking one fills the existing Copy as new list form from it, with the type fixed to the side's type, as New list does. The form also shows the carry-over hint when the copy converts entries.
- Creating the copy picks it for that side and keeps the viewer on the composer. Like a new list, the copy starts off Trade with no linked list. A refused copy says why and keeps the dialog's input and the previous pick. Closing the dialog returns focus to the dropdown.
- The item is hidden when the viewer has no lists. As with New list, Copy a list… in the Has and Selling for dropdowns is disabled without a linked Cosmo profile.
- Copy as new list on `/list` and in the list header does not change. It still opens the new list after saving.
- The dropdown no longer drops a list it was just given. The same guard fixes New … list…, which created the list but left the side unpicked.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-browse`: a new requirement, "Copy a list in the composer", next to "New list in the composer" and "New list form".
- `web-lists`: "Copy as new list" says that a copy made from the composer is picked there rather than opened.

## Routes

`/trade/new`, both for a new post and for Edit post (`?edit=`).

## Non-goals

- Changing the server. `list.copy` and `list.copyPreview` already convert between types and bindings, and this change sends them the same input.
- Making a list that is in a post pickable for a second post. The one-post-per-list rule stays.
- Copying someone else's list.
- Any change to New list… beyond the pick guard above, or to the copy action on `/list`.

## Impact

- `apps/web/src/features/list/copy-list-dialog.tsx` and `actions.ts`: the copy form can fix the type and return the new slug instead of navigating.
- `apps/web/src/features/trade/composer/settings.tsx`: the new dropdown item and its dialog.
- `apps/web/messages/{en,ko,ja}.json`: new `trade_composer_copy_*` messages.
- No API, schema or migration change.

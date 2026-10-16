# Proposal

## Why

A list's type and its profile binding are fixed once it is created. A user who picked the wrong type, or wants a have list as a sale list, or a general list bound to a profile, has to make a new list and add every objekt again. We keep both locked, because changing them in place would change what stored entries mean and what offers, chat cards and want alerts that point at the list mean. Instead we give the owner a way to start a new list from an existing one.

## What Changes

- The owner's menu on a list card (`/list`) and in the list header (`/list/<slug>`, `/@<nickname>/list/<profile-slug>`) gains **Copy as new list…**, next to Edit.
- It opens the create list dialog with these fields filled in from the source list:
  - name, with a copy suffix;
  - description, profile, currency, Open to, columns and hide serial.
- Type and profile binding are picked fresh. The linked list and Show on Trade start empty and off, so the copy never takes the source's partner or posts a duplicate on Trade.
- Saving creates a new list holding the source's entries, converted for the new binding:
  - bound → unbound: copies become collections;
  - unbound → bound: collections become the copies the chosen profile owns;
  - bound → bound: copies the profile still owns are kept.

  The source list is not changed.
- Before saving, when the binding or profile changes how entries carry over, the form says how many will be carried and how many left out. After saving, the toast reports the same counts, and the browser opens the new list.
- On sale → sale copies, price, quote-your-own-price and note go with every entry that carries over one to one.
- The edit form keeps the read-only type badge. Its description points to Copy as new list.

## Non-goals

- Changing a list's type or binding in place.
- Moving offers, chats, want alerts or Trade bumps from the source to the copy.
- Deleting the source after the copy. The user does that through Delete.
- Copying someone else's list. Only the owner sees the action.
- Prices on copies where the type or the entry shape changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-lists`: adds the Copy as new list requirement. Manage lists gains a pointer from the read-only type badge to Copy.

## Impact

- `packages/api`:
  - a `list.copy` procedure and a read-only `list.copyPreview`;
  - the create body moved into a shared service, so create and copy share validation;
  - a pure entry-conversion module with tests.
- `apps/web`:
  - `features/list`: the menu items in `list-card.tsx` and `list-header.tsx`, a copy dialog built on `ListForm`, and the carry-over hint;
  - new messages in `en`, `ja` and `ko`.
- No schema change and no migration.

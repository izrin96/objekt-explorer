# Proposal

## Why

A want list's Open to (Swaps only, Swaps or buying, Buying only) shows only through its Trade post's tags. A want list that is not on Trade shows it nowhere and cannot change it, yet it still decides the owner's own matches: For you, Can swap, Find matches and want-list alerts read every one of the owner's want lists, posted or not. The owner cannot see why a list matches sellers, or does not, nor change it without posting the list.

## What Changes

- On a want list that is not on Trade, its owner sees its Open to as a neutral badge in the list header, and on its row on `/list` and on their own profile's Lists tab. Screen readers read "Open to: <choice>".
- The edit form of a want list that is not on Trade offers Open to as three choices, each saying what it matches. The create form offers it for a new want list, starting at Swaps or buying, and so does Copy as new list. A want list linked to a have or sale list cannot pick Buying only; the option is disabled and says why.
- While a want list is on Trade, the post composer stays the only place that changes it; its form shows no choice, as today. Forms opened from the composer show no choice either: Post sets it there.
- `list.edit` takes an optional `openTo`. It is written only for a want list off Trade, ignored on Trade (an old tab or a post going up meanwhile still saves the rest), and refused as Buying only for a linked want list (`list_pair_buying_only`). The UPDATE re-checks both conditions, so a post or link made since the form opened wins.
- Visitors see nothing new. A want list on Trade still shows only its post's tags. Have, sale and general lists show and take no Open to.
- Messages: `list_open_to_badge_label`, plus the form's label, description, three option descriptions and the pair hint, in en, ko and ja. The three choice labels are reused.
- No schema or database change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-lists`: Manage lists, Show on Trade and Want list match option (the form sets a want list's Open to while it is off Trade), On Trade mark in the list header and List rows (off Trade, the owner sees Open to), and two new requirements, Open to on a want list off Trade and Open to in the list form.

## Impact

- **Routes:** `/list`, `/list/$slug`, `/@$nickname/list/$slug`, and `/@$nickname/list` (the Lists tab, owner only), and the list dialogs they open. `/trade/new` keeps its forms without the choice.
- **Web:** `features/list/list-open-to.ts` (new, tested), `features/list/list-type-badge.tsx`, `features/list/list-header.tsx`, `features/list/list-rows.tsx`, `list-draft.ts` (tested), `list-form.tsx`, `list-form-fields.tsx`, `edit-list-dialog.tsx`, `create-list-dialog.tsx`, `copy-list-dialog.tsx`, `messages/en.json`, `ko.json`, `ja.json`, `docs/trade.md`.
- **API:** `schemas/open-to.ts` (`openToEdit`, tested), `schemas/list.ts` (`openTo` on `editListInputSchema`), `services/list/edit.ts`, `services/list/create.ts` (exports `PAIR_MESSAGES`), `docs/trade.md`. An open tab sends no `openTo` and keeps the stored choice.
- **Worker, database:** none.

## Non-goals

- Changing a want list's Open to from its form while it is on Trade: the composer sets it there.
- Showing or changing a sale list's Sell only / Sell or swap off Trade, which is just as hidden; a possible follow-up.
- Showing Open to to visitors, or in words on a list that is on Trade.
- Linking or unlinking lists from the list form.

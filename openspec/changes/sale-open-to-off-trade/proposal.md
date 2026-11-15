# Proposal

## Why

A sale list's Open to (Sell only, Sell or swap) is set only by the composer's "Also open to swaps" and shows only as post tags. Off Trade it shows nowhere and its form cannot change it, yet a bound sale list still decides the owner's own matches: For you, Find matches, Browse and "Someone wants what you have" alerts read every bound sale list of the owner's, posted or not, and count it against want lists open to swaps only when it is Sell or swap. This is the twin of the want-list gap `show-open-to-off-trade` closed.

## What Changes

- On a sale list bound to a Cosmo profile and not on Trade, its owner sees its Open to as a neutral badge in the list header, and on its row on `/list` and on their own profile's Lists tab. Screen readers read "Open to: <choice>".
- The edit form of such a list offers Open to as two choices, each saying which want lists it matches. The create form offers it for a new bound sale list, starting at Sell only, and Copy as new list carries a sale list's choice into a sale copy. A sale list paired with a want list cannot pick Sell only; the option is disabled and says why.
- On Trade, and in forms opened from the composer, the form shows no choice: the post sets it. Post it already opens the composer with the stored choice; a scenario pins it.
- `list.edit` takes an optional `saleOpenTo`. It is written only for a bound sale list off Trade, ignored otherwise (an old tab or a post going up meanwhile still saves the rest), and refused as Sell only for a paired sale list (`list_sale_links_sell_only`). The UPDATE re-checks both conditions.
- `list.create` and `list.copy` take an optional `takesSwaps`, default false, so an old tab still makes a Sell only list.
- Visitors see nothing new. An unbound sale list (no matching, never on Trade), and have and general lists, show and take no choice: a have list always swaps.
- Messages: two option descriptions and a pair hint, in en, ko and ja; the rest is reused.
- No schema or database change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-lists`: Manage lists, Show on Trade, Sale list Open to and Copy as new list (the form sets a bound sale list's Open to while it is off Trade), On Trade mark in the list header and List rows (off Trade, the owner sees it), and two new requirements, Open to on a sale list off Trade and Sale list Open to in the list form.

## Impact

- **Routes:** `/list`, `/list/$slug`, `/@$nickname/list/$slug`, and `/@$nickname/list` (the Lists tab, owner only), and the list dialogs they open. `/trade/new` keeps its forms without the choice.
- **Web:** `features/list/list-open-to.ts`, `list-draft.ts` and `copy-draft.ts` (tested), `list-type-badge.tsx`, `list-type-labels.ts`, `list-form.tsx`, `list-form-fields.tsx`, `edit-list-dialog.tsx`, `messages/*.json`, `docs/trade.md`. The header, rows, create and copy dialogs already render `ListOpenToBadge` and pass `showOpenTo`.
- **API:** `schemas/open-to.ts` (`saleOpenToEdit`, tested), `schemas/list.ts`, `services/list/edit.ts`, `services/list/create.ts`, `docs/trade.md`. An open tab sends neither new field and keeps today's behaviour.
- **Worker, database:** none.

## Non-goals

- Changing a sale list's Open to from its form while it is on Trade: the composer sets it there.
- An Open to for an unbound sale list, which can neither match nor go on Trade.
- Showing a sale list's Open to to visitors, or in words on a list that is on Trade.
- Pairing or unpairing lists from the list form.

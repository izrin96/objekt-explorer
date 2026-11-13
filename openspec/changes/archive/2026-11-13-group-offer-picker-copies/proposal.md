# Proposal

## Why

Make offer's pickers draw one tile per copy. Twelve copies of HeeJin 101Z fill a screen with twelve identical cards that differ only in a serial, and the sender's own doubles crowd You give the same way. The owner wants one tile per collection in both pickers, with serials chosen in a dialog.

## What Changes

- Both pickers (You give, You get over lists, You get over a partner's collection) show one tile per collection:
  - a collection with one shown copy is picked at once by its serial, as today;
  - a collection whose copies are all hidden keeps "Any serial · N available" and its − / + count with "They choose the serial";
  - a collection with several shown copies, or with both shown and hidden copies, opens a serial dialog over the picker sheet. The picker stays a side sheet.
- The serial dialog lists each shown copy as a checkbox row with its serial, its flag and, across lists, its list name. It has Select all and Clear and a footer count, and it confirms with "Pick N copies". It never sends anything: its picks join the sheet's working selection, which Done writes to the builder.
- "Any serial" is offered on lists that show serials too, as one checkbox in the dialog worth one copy, for a collection with two or more available shown copies. A collection that also has hidden copies keeps the − / + count, now reading "Any serial · N more" on its tile.
- The server accepts an any-copy ask through entries that name copies on a list that shows serials, drawing only on those copies. Copies picked by serial in the same offer still never count toward it.
- Picker pages end on a collection: a collection's copies never split across two pages.
- The builder keeps one card per copy, and keeps one card with "× N" for an any-copy pick. A collection's cards sit together, the any card first.
- Matches added on open, near picks, Make offer for one objekt of a post, Market listings and counters keep prefilling per-copy picks, by the same rules as today.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-offers`: the pickers group copies by collection behind a serial dialog. Any serial reaches lists that show serials. Picker paging and the ratio and warning placement change to fit.

## Impact

- **Route:** `/trade/@<handle>/offer` (the offer page and its two picker sheets). The offer card, My trades and the trade page are unchanged.
- **API:** `packages/api/src/lib/offer-rules.ts` (`entriesFitting`, `anyCopyScope`), `lib/offer-prefill.ts` (`itemsOnLists`), `services/offer/picker/theirs.ts` (`resolveTheirItems`, `theirPickerPage`, `theirCollectionPage`), `picker/shared.ts` (`ownedPage`), `picker/mine.ts`, `schemas/offer.ts` (`CandidateItem.hidden`), `docs/offers.md`.
- **Web:** `features/offers/` (`offer-picker.tsx`, `offer-picker-grids.tsx`, `candidate-grid.tsx`, `candidate-tile.tsx`, a new `serial-dialog.tsx` and a pure `copy-groups.ts`, `quantity.ts`, `pick.ts`, `picker-selection.ts`, `builder/draft.ts`, `builder/side-column.tsx`, `builder/form.tsx`), `docs/offers.md`, and `messages/{en,ko,ja}.json`.
- **Database:** no migration.
- **Open tabs:** the candidates input is unchanged; a tab from before the deploy ignores the new `hidden` field.

## Non-goals

- The limit of 50 per side, the three recipient offer switches (Only offers with what I want, Let people ask from more than one post, Let people ask for anything I hold), and the matching rules.
- Any serial from a partner's collection (a partner with no lists) or on You give: both stay specific copies only.
- Search, filters, List, the matching switches, near-match tags and You give's "From your have lists" section: they keep working, over tiles instead of copies.
- The offer card in chat, My trades, the trade page, and how accept or the verifier fill an any-copy leg.

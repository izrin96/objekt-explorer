# Proposal

## Why

A have list paired with a want list set to Buying only becomes one WTT post whose want half refuses swaps: the tag says trade while the list says buy, and nothing on the post says so (the "Buying only" note shows on WTB posts only). A pair is someone trading, so its want list should be open to swaps.

## What Changes

- A want list linked to a have list SHALL be open to swaps: Swaps only or Swaps or buying. Buying only SHALL stay available for a want list on its own.
- The server SHALL refuse, with a new reason `list_pair_buying_only`:
  - saving a linked want list as Buying only;
  - linking a want list set to Buying only to a have list, from either list's form.
- The list form SHALL show Buying only disabled, with a short reason, while the want list's form holds a link. The have list's link menu SHALL show a Buying only want list disabled, with the same reason.
- The three Open to choices, the `match_have` column and what every existing list matches stay as they are. No existing pair is Buying only in the dev database; before deploying, production is checked read-only, and any pair found is unlinked with approval, which keeps the owner's choice.

Routes: the list create and edit dialogs (`/list`, `/@{nickname}/{list}`).

## Non-goals

- No change to Open to's choices or to matching.
- No change to the WTB "Buying only, not swapping" note.
- No "sell or swap" have list.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-lists`: Want list match option (a linked want list can't be Buying only; the form and the server enforce it).
- `web-trade-browse`: Posts from lists on Trade (a paired want list is open to swaps, so a WTT pair never buys only).

## Impact

- `packages/api`: a pure rule beside `resolveOpenTo` (`schemas/open-to.ts`), applied in `services/list.ts` (create, through `checkLinkedList`) and `routers/list-crud.ts` (edit); `list_pair_buying_only` in `LIST_REFUSALS`.
- `apps/web`: `list-form.tsx` (Open to radio and link menu), `lib/refusal.ts`, strings in `en`, `ko`, `ja`.
- No migration and no cache key change.

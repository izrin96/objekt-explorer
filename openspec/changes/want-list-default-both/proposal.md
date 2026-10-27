# Proposal

## Why

A want list made in the app is Swaps only until a post says otherwise. Matching reads every one of the user's want lists, posted or not, so an unposted want list matches only people who swap. A seller with a Sell only sale list holding a wanted collection is left out, and since near-matches only shows it as "1 more if you buy". Most users who list what they want would pay for it too. Starting a new want list open to both swaps and buying matches what they expect, and a post can still narrow it.

## What Changes

- A new want list, from Create list (`/list`, the account menu, Add to list's Create one) or from a request that leaves the choice out, saves **Swaps or buying** instead of Swaps only.
- Copy as new list, picking Want from another type, starts at Swaps or buying, as Create does. A want list copied from a want list keeps its own choice, as it does today.
- Posting still sets Open to: a Swap post without "also pay" saves Swaps only, with it Swaps or buying, a Buy post Buying only. The composer is unchanged.
- No existing list changes. No migration: the column default is already true for both.

## Non-goals

- Sale lists: a new sale list stays Sell only.
- Have and general lists: they carry no Open to choice.
- An Open to control in the list form: the post keeps owning it.
- Changing want lists made before this change.
- Any matching rule: what Swaps or buying matches is unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-lists`: "Want list match option" names Swaps or buying as the default for a new want list and for a create request that leaves the choice out; "Copy as new list" starts a want copy from another type at that default.

## Impact

- `apps/web/src/features/list/list-form.tsx`: `EMPTY_DRAFT.matchSale` becomes true, which Create list and Copy as new list (`copy-list-dialog.tsx`) both read.
- `packages/api/src/schemas/list.ts`: `createListInputSchema.matchSale` defaults to true.
- `packages/api/src/schemas/list.test.ts`: a test for the default.
- Routes: `/list` and every surface that opens Create list or Copy as new list. `list.create` is on `/rpc` only, not `/api/v1`; an open tab that omits the field gets the new default, which is the intent.
- No migration, no cache key change, no new strings.

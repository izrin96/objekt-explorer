# Proposal

## Why

Near matches tell a viewer "1 more if you swap" or "if you buy" when one of their sale lists is Sell only, but a sale list's form never says which it is: Open to is set only in the post composer, and the form shows a Show on Market and Trade switch instead. Have and want lists already show a Trade line in that place, with their post, its tags and one click to Edit post. A sale list should read the same way, and the switch, a second way to put the list on Trade, can split a Sell or swap pair: turned off, it takes the sale list off and leaves its want list on Trade alone. Mockup: https://claude.ai/artifact/SS3Qu6XDsV4y7NemR8C3Dj

## What Changes

- **BREAKING (behaviour)**: a sale list's form, in create, edit and Copy as new list, no longer has the Show on Market and Trade switch. A sale list goes on and off Trade and Market only through the post composer, like a have or want list.
- The edit form of a sale list shows the Trade line in its place: "In your Sell post" with its tags and a detail line naming its Open to (Sell only, or Sell or swap), its paired want list, "Would also pay" and "Also on Market", with Edit post; off Trade it reads "Paired with … · Off Trade" or "Not on Trade" with Post it; unbound, it says why it can't go on Trade, with no button.
- Creating a sale list bound to a Cosmo profile ends on the same "List created" step a have or want list gets, offering Post it, which opens the composer on Sell with the list picked.
- `list.edit` no longer writes a sale list's Trade state; a request that still sends it keeps the list's current state.
- Existing sale lists on Trade stay on Trade and read as a one-list Sell post: no data change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-lists`: Manage lists (no sale switch; the sale form shows the Trade line), Show on Trade (every type through the composer), Trade line in the list form (covers sale lists, names Open to, create offers Post it for a bound sale list).
- `web-trade-browse`: Trade feed (posts come only from the composer) and its Sale list on Market scenario.

## Non-goals

- No change to the post composer, Open to rules, sale pairs, Market, matching or near matches.
- No Open to control on the list form: the Trade line only reads it and opens the composer.
- No change to `list.create` or `list.copy` input; the forms just stop offering Trade.
- The Your posts row and the Trade line's look for have and want lists stay as they are.

## Routes

`/list` and every list page's Edit list (`/@<nickname>/list/<slug>`, `/list/<slug>`), the Create list dialog wherever it opens, and Copy as new list.

## Impact

- `apps/web`: `features/list/list-form.tsx` (switch removed, Trade line for sale), `create-list-dialog.tsx` (Post it after a bound sale list), `features/trade/trade-line.tsx` (sale detail and hints); `en`, `ko`, `ja` messages (two switch strings dropped, four Trade line strings added).
- `packages/api`: `schemas/trade-post.ts` `tradeLineOf` reports a sale post's Open to; `routers/list-crud.ts` and `schemas/list.ts` stop taking `discoverable` on `list.edit`. `list.edit` is RPC-only, not on `/api/v1`.
- Tabs open before the deploy still show the switch; their save is ignored for Trade, and a reload shows the Trade line.
- No schema change and no migration.

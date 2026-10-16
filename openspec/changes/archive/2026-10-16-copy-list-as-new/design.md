# Design

## Context

- `list.create` (`packages/api/src/routers/list-crud.ts`) validates in this order: currency, profile required for binding, profile ownership, linked list. It then generates `slug` and `profileSlug` and inserts the list in one transaction, linking the partner both ways. That linking clears any other list's link to the same partner, and Show on Trade can turn the partner on. The procedure returns nothing.
- Entry shape depends on binding (`services/list.ts` `addEntries`):
  - A bound list's rows carry `objektId` and `collectionSlug`, and only copies the profile owns go in (`insertTokens`, `onConflictDoNothing` on `(list_id, objekt_id)`).
  - An unbound list's rows carry `collectionSlug` only, duplicates allowed unless `skipDups`.
  - Price, quote-your-own-price and note live on the row, and `insertTokens` does not write them.
- `resolveEntryTokens` looks up the source list by slug alone. Its caller is trusted to have checked ownership.
- `CreateListDialog` takes an `initial` draft but seeds `useState` once, so a later `initial` is ignored. `EditListDialog` fetches with `listFindOptions` and mounts its form once the data arrives.
- `ListForm` already handles create vs edit, and its `changeType` defaults binding when entering have or sale.

## Goals / Non-Goals

**Goals:**
- One request creates the copy and all its entries, or nothing.
- Create and copy share one validation path.
- The conversion rules are a pure, tested module.

**Non-Goals:**
- Reusing `addEntries` as it is. It opens its own transactions and reports duplicates the way adding does, not the way copying needs.
- Any change to `list.edit` or to the stored schema.

## Decisions

1. **New `list.copy` procedure, not a `copyFrom` field on `create`.**
   - Input: `createListInputSchema` plus `sourceSlug`. Output: `{ slug, carried, leftOut, unit }`, so the client can navigate and toast.
   - The body of `create` moves into `insertList(tx, input, userId)` in `services/list.ts`, which returns the new row. Both procedures call it, so currency, profile, `generateProfileSlug`, `resolveOpenTo`, `resolveDiscoverable` and the partner link stay in one place.
   - Alternative: an optional field on `create`. It would put source ownership checks and indexer reads into the hottest list write, and a `void` output that older tabs depend on. Rejected.

2. **Source ownership is checked up front.** `findOwnedList(sourceSlug, user.id)` runs first and throws `NOT_FOUND` for a foreign or unknown slug, the same as other owner-only list calls.

3. **Pure conversion plan in `packages/api/src/lib/list-copy.ts`.**
   - `copyMode(source, target)` returns one of:
     - `rows`: unbound to unbound;
     - `distinct-collections`: bound to unbound;
     - `tokens`: bound to bound, same profile;
     - `expand`: any list to a bound list on another profile, or unbound to bound.
   - `buildCopyRows(mode, sourceEntries, owned, carryPrices)` returns `{ rows, carried, leftOut }`. In `tokens` mode, `owned` is the set of token ids still held. In `expand` mode it maps each collection slug to the copies held, sorted by serial.
   - `carryPrices` is true only when source and target are both sale lists, and only `rows` and `tokens` keep price, `isQyop` and note, since those map one to one.
   - Units: `carried` and `leftOut` count collections in `expand` and `distinct-collections` modes, and copies in `tokens` and `rows` modes. The UI message names the unit.
   - It imports nothing from `@repo/db`, so `list-copy.test.ts` covers each mode, order, duplicates and the price rule. This follows the root `AGENTS.md` pure-module rule.

4. **Indexer reads happen before the transaction; inserts happen inside it.** The `tokens` and `expand` lookups reuse the queries `addEntries` already uses (owner filter, `TOKEN_CHUNK_SIZE` chunks). The transaction then runs `insertList` and inserts the planned rows in chunks, with `onConflictDoNothing` for token rows, then `touchList` after commit. A copy whose plan carries zero entries still creates the list. The count tells the user.

5. **Preview is a separate read-only `list.copyPreview`.**
   - Input: `{ sourceSlug, isProfileBind, profileAddress, listTypeNew }`. Output: `{ carried, leftOut, unit }`.
   - It runs the same lookups and `buildCopyRows` without writing.
   - The dialog queries it only while the mode is `tokens` or `expand`. The `rows` and `distinct-collections` modes lose nothing, so the client computes nothing for them. The query is keyed on those inputs and debounced through React Query's normal key change.
   - Alternative: compute after saving only. It is cheaper, but the user was promised the count before saving. Rejected.

6. **`CopyListDialog` beside `CreateListDialog`, both on `ListForm`.**
   - It follows `EditListDialog`: it fetches the source with `listFindOptions(slug, open)` and mounts the inner form once the data is in, keyed by slug. That avoids the seed-once trap.
   - `toCopyDraft(list)` sets `name` to `m.list_copy_name({ name })`, `linkedListId: null` and `discoverable: false`, and keeps type, binding, profile, currency, Open to, columns and hide serial.
   - `ListForm` stays in `mode="create"`, so type and binding are editable. It gains an optional `notice` slot under the binding control for the carry-over hint. That is preferred over a third `mode`, because the form's behaviour does not change, only one line of text.
   - Alternative: give `CreateListDialog` a `source` prop. It would mix a fetch and a remount into a dialog that also serves the plain create menu item. Rejected, keeping each dialog small.

7. **After a save:** a `useCopyList` mutation in `actions.ts` reuses `useListInvalidation()` with no slug, then toasts `m.list_copy_success({ carried, leftOut })` (or the collection-unit variant) and navigates to `/list/$slug`. That route already redirects a list filed under a profile to its profile-scoped address, so the client needs no nickname.

8. **Edit form pointer.** In `mode="edit"`, under the type description, one muted line reads `m.list_edit_type_locked_hint()` and names the Copy as new list menu item. It is text, not a button, since the menu that holds the action is one click away.

## Risks / Trade-offs

- A large source of up to 50 000 entries in `expand` mode can mean many indexer reads, twice: once for the preview and once on save. → Both use the existing chunked queries, the preview runs only when the binding differs, and the save re-reads rather than trusting a stale preview.
- Holdings can change between the preview and the save. → The save's counts are authoritative and the toast reports them.
- `expand` can add more copies than the source had, for example three owned copies of a collection the source listed once. → This is intended and the spec's scenario states it.
- The `insertList` refactor touches the create path. → Create keeps its input and output. The existing create flows are checked by hand to the request boundary.

## Migration Plan

No schema change. The two procedures are additive, and older tabs keep calling `list.create` unchanged.

# Tasks

## 1. Conversion plan

- [x] 1.1 Add `packages/api/src/lib/list-copy.ts` with `copyMode(source, target)` and `buildCopyRows(mode, entries, owned, carryPrices)`, as design decision 3 describes. Add `list-copy.test.ts` cases for:
  - each of the four modes;
  - kept source order;
  - duplicates kept in `rows` mode and collapsed in `distinct-collections` mode;
  - `expand` adding every owned copy, sorted by serial, and counting unowned collections as left out;
  - `tokens` mode dropping copies no longer owned;
  - prices carried only sale to sale in `rows` and `tokens` modes.

  `bun test` passes, and lint, typecheck and build pass for `@repo/api`.

## 2. API

- [x] 2.1 Move the body of `list.create` into `insertList(tx, input, userId)` in `services/list.ts`. Keep `create`'s input, output, validation order and refusal codes unchanged, and keep `touchList` after commit. Lint, typecheck and build pass for `@repo/api`. Check that create still sends the same request from the web create dialog (read-only verified to the request boundary).
- [x] 2.2 Add `copyListInputSchema` (`createListInputSchema` plus `sourceSlug`), `copyPreviewInputSchema` and their output schemas to `schemas/list.ts`, with `unit: "collections" | "copies"`. Typecheck passes.
- [x] 2.3 Add the owner-only `list.copy` to `list-crud.ts`:
  1. `findOwnedList(sourceSlug)`;
  2. the source entries in id order;
  3. the indexer lookups for `tokens` and `expand`, reusing `addEntries`' queries, factored out if needed;
  4. one transaction running `insertList` and the planned rows;
  5. `touchList` on the new list and any re-linked partner.

  It returns `{ slug, carried, leftOut, unit }`. Lint, typecheck and build pass for `@repo/api`.
- [x] 2.4 Add the read-only `list.copyPreview`, which runs the same steps 1 to 3 and `buildCopyRows` without writing. Call it for real against one of the user's own lists in each mode. Lint, typecheck and build pass for `@repo/api`.

## 3. Web

- [x] 3.1 Add messages in `apps/web/messages/en.json`, `ja.json` and `ko.json`:
  - `list_copy_action`: the menu item;
  - `list_copy_title`;
  - `list_copy_name`, taking `{name}`;
  - the carry-over hint and success toast in copy and collection units;
  - `list_copy_error`;
  - `list_edit_type_locked_hint`.

  `paraglide:compile` succeeds, and typecheck passes for `web`.
- [x] 3.2 Add `useCopyList` to `features/list/actions.ts`. It reuses `useListInvalidation()`, toasts the counts on success, shows `refusalText` on error, and navigates to `/list/$slug`. Typecheck passes for `web`.
- [x] 3.3 Add `features/list/copy-list-dialog.tsx`:
  - it fetches with `listFindOptions` and mounts the inner form keyed by slug;
  - `toCopyDraft` clears the linked list and Show on Trade;
  - it renders `ListForm mode="create"` with the preview hint passed through a new optional `notice` prop, queried only for the `tokens` and `expand` modes.

  Lint, typecheck and build pass for `web`.
- [x] 3.4 Add the owner-only Copy as new list menu item next to Edit in `list-card.tsx` and `list-header.tsx`, each controlling its own `CopyListDialog`. Show `list_edit_type_locked_hint` under the type description in `ListForm`'s edit mode. Lint, typecheck and build pass for `web`.

## 4. Check in the running app

- [x] 4.1 Run the app and open Copy as new list from the card and from the header of one of the user's own lists. Check:
  - the prefilled fields, with no linked list and Show on Trade off;
  - the hint's counts updating as type, binding and profile change;
  - the edit form's locked-type hint;
  - that a visitor sees no menu item.

  Saving is checked to the request boundary only (read-only verified): no list is created on the shared database without the user's explicit approval.
- [x] 4.2 `bun run check` and `bun run build --filter=web` pass.
- [x] 4.3 Update `packages/api/AGENTS.md` and `apps/web/AGENTS.md` if the change alters their conventions or traps (for example, `insertList` as the one place a list row is created), or state here that none changed.

## Workflow follow-up

- `/opsx:archive` once the change is reviewed and shipped.

# Tasks

Each task ends with `bun run lint --filter=web`, `bun run typecheck --filter=web` and `bun run build --filter=web` passing. Tests are `bun test` on pure modules only. Before editing a `.tsx` in `apps/web`, load `vercel-react-best-practices` (the repo's hook holds the edit until it is loaded) and `frontend-ui-engineering`. No commits, no `git stash`, no database writes.

## 1. Starting point

- [x] 1.1 `openspec validate show-open-to-off-trade --strict` passes, and each MODIFIED requirement in `specs/web-lists/spec.md` differs from its block in `openspec/specs/web-lists/spec.md` only in the sentences this change sets. If another change has edited those requirements since, stop and ask the owner.

## 2. Helper and messages

- [x] 2.1 Add `apps/web/src/features/list/list-open-to.ts` (`offTradeOpenTo`) and `list-open-to.test.ts`. Verify with `bun run test --filter=web`.
- [x] 2.2 Add `list_open_to_badge_label` to `apps/web/messages/en.json`, `ko.json` and `ja.json`, after `list_create_match_buying_label`. Run `bun run paraglide:compile` in `apps/web`.

## 3. Badge, header and row

- [x] 3.1 Add `ListOpenToBadge` to `features/list/list-type-badge.tsx`.
- [x] 3.2 Render it in `features/list/list-header.tsx` after the type badge.
- [x] 3.3 Render it in `features/list/list-rows.tsx` after `ListTradeMark`.
- [x] 3.4 Browser pass (read only): as the owner, an off-Trade want list shows its Open to in the header and on `/list`; a posted one shows only its tags; a signed-out visitor sees no Open to; at 375 px and in ko and ja the badge wraps with its row.

## 4. Docs

- [x] 4.1 No `AGENTS.md` changes: no convention, trap or workflow changes. `apps/web/docs/trade.md` and `packages/api/docs/*` are unchanged.

## 5. Open to in the list form: API

- [x] 5.1 Repeat 1.1 for the blocks this update adds: Manage lists, Show on Trade and Want list match option.
- [x] 5.2 Add `openToEdit` to `packages/api/src/schemas/open-to.ts` with its cases in `open-to.test.ts`. Verify with `bun run test --filter=@repo/api`.
- [x] 5.3 Add `openTo` to `editListInputSchema`, export `PAIR_MESSAGES` from `services/list/create.ts`, and write Open to in `services/list/edit.ts` through `openToEdit` and the `CASE` columns.

## 6. Open to in the list form: web

- [x] 6.1 Add `list_open_to_label`, `list_open_to_desc`, `list_open_to_swaps_desc`, `list_open_to_both_desc`, `list_open_to_buying_desc` and `list_open_to_pair_hint` to `en.json`, `ko.json` and `ja.json`, after `list_open_to_badge_label`. Run `bun run paraglide:compile` in `apps/web`.
- [x] 6.2 `toEditInput` takes `storedOpenTo` and sends `openTo` only on a change; update `list-draft.test.ts`. Verify with `bun run test --filter=web`.
- [x] 6.3 Move `OPEN_TO_LABEL` to `list-type-labels.ts`, add `OpenToField` to `list-form-fields.tsx`, and render it in `list-form.tsx` behind `showOpenTo`.
- [x] 6.4 Pass `showOpenTo` from `edit-list-dialog.tsx` (off Trade, not in the composer, with `storedOpenTo` to `toEditInput`), `create-list-dialog.tsx` (not `lockType`) and `copy-list-dialog.tsx` (no `fixedType`).
- [x] 6.5 Browser pass (read only, nothing saved): the edit form of an off-Trade want list shows Open to after the Trade line, with Buying only disabled and its hint on a paired one; a posted want list's form shows none; the create and copy forms show it for Want only; composer Edit list, New want list… and Copy a list… show none; changing it shows the Trade line's save-first note; at 375 px and in ko and ja the options wrap.

## 7. Docs

- [x] 7.1 Update `packages/api/docs/trade.md` (Open to after create, the pair refusal, what `list.edit` takes) and `apps/web/docs/trade.md` (composer forms show no Open to). No `AGENTS.md` changes: no convention, trap or workflow changes.

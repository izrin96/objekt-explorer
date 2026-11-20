# Tasks

Each task ends with `bun run lint`, `bun run typecheck` and `bun run build` passing for the package it touched (`--filter=web` or `--filter=@repo/api`). Tests are `bun test` on pure modules only; no test touches the database. Before editing a `.tsx` in `apps/web`, load `vercel-react-best-practices` (the repo's hook holds the edit until it is loaded) and `frontend-ui-engineering`. No commits, no `git stash` (use a WIP commit only if the owner asks for commits), no database writes. Browser passes run against the local dev server, signed in on the local database, and save nothing on production.

## 1. Starting point

- [x] 1.1 `openspec validate sale-open-to-off-trade --strict` passes, and each MODIFIED requirement in `specs/web-lists/spec.md` differs from its block in `openspec/specs/web-lists/spec.md` only in the sentences this change sets. If another change has edited those requirements since, stop and ask the owner. Confirm the owner's answers to the two Open Questions in `design.md`; if create and copy are dropped, skip group 6 and remove the create and copy scenarios from the spec delta first. Checked on 2026-11-20: valid, no edits to `openspec/specs/web-lists/spec.md` since 0be73c11, each MODIFIED block differs only in this change's sentences; the Open Questions were answered by what shipped (see `design.md`).

## 2. Badge

- [x] 2.1 Add `offTradeSaleOpenTo` to `apps/web/src/features/list/list-open-to.ts`, with its cases in `list-open-to.test.ts` (bound off Trade, on Trade, unbound, other types, missing `takesSwaps`). Verify with `bun run test --filter=web`.
- [x] 2.2 Add `SALE_OPEN_TO_LABEL` to `list-type-labels.ts` (reusing `trade_line_sell_only`, `trade_line_sell_or_swap`), and let `ListOpenToBadge` in `list-type-badge.tsx` draw a sale list's choice too (its `Pick` gains `isProfileBind` and `takesSwaps`).
- [x] 2.3 Browser pass (read only): as the owner, a bound off-Trade sale list shows Sell only or Sell or swap in its header and on `/list`, and on its profile's Lists tab; a posted one shows only its tags; an unbound one shows none; a signed-out visitor sees none; at 375 px and in ko and ja the badge wraps with its row.

## 3. Edit rule: API

- [x] 3.1 Add `saleOpenToEdit` to `packages/api/src/schemas/open-to.ts` with its cases in `open-to.test.ts` (omitted, other types, unbound, on Trade, Sell only paired, Sell only unpaired, Sell or swap paired). Verify with `bun run test --filter=@repo/api`.
- [x] 3.2 Add `saleOpenTo` to `editListInputSchema` in `schemas/list.ts`, optional, with a one-line comment as `openTo` has; confirm a body without it still validates.
- [x] 3.3 In `services/list/edit.ts`, refuse through `saleOpenToEdit` with `list_sale_links_sell_only`, write `takesSwaps` as a `CASE` column (design decision 8), and run a Sell only write inside `lockTradeLists`, beside the Buying only case. Verify by lint, typecheck and build; 4.6 exercises the write.

## 4. Edit form: web

- [x] 4.1 Add `list_sale_open_to_sell_desc`, `list_sale_open_to_both_desc` and `list_sale_open_to_pair_hint` to `apps/web/messages/en.json`, `ko.json` and `ja.json` after `list_open_to_pair_hint`, worded as in `design.md` Messages. Run `bun run paraglide:compile` in `apps/web`.
- [x] 4.2 Add `takesSwaps` to `ListDraft`, `EMPTY_DRAFT` and `toDraft`; `toEditInput` takes `storedSaleOpenTo` and sends `saleOpenTo` only on a change. Update `list-draft.test.ts`. Verify with `bun run test --filter=web`.
- [x] 4.3 Add `SaleOpenToField` to `list-form-fields.tsx`, sharing the radio markup with `OpenToField`, and render it in `list-form.tsx` behind `showOpenTo` for a bound sale list, with Sell only disabled and its hint when paired.
- [x] 4.4 In `edit-list-dialog.tsx`, compute `storedSaleOpenTo` with `offTradeSaleOpenTo` from the seed (null without the Trade line), pass it to `toEditInput`, and show the field when either stored value is non-null.
- [x] 4.5 Browser pass (read only, nothing saved on production): the edit form of a bound off-Trade sale list shows Open to after the Trade line at its stored value; a paired one has Sell only disabled with its hint; a posted one, an unbound one and composer Edit list show none; changing it shows the Trade line's save-first note and disables Post it; the request `list.edit` would send carries `saleOpenTo` only after a change; at 375 px and in ko and ja the options wrap.
- [x] 4.6 With the owner's go-ahead, and on the local database only, save Sell or swap on a bound off-Trade sale list holding a collection that a local partner's want list, open to swaps only and on Trade, asks for: the badge updates, Browse and For you count the collection on the next load, and Post it opens the composer on Sell with "Also open to swaps" ticked. Skip and say so if no such local data exists. Done on the local database on 2026-11-16 except the Browse and For you count: no local partner has a want list on Trade open to swaps only that asks for a collection the test account can list. Closed on 2026-11-20 with that count skipped; `open-to.test.ts` and `list-open-to.test.ts` cover the rule.

## 5. Docs for the edit path

- [x] 5.1 Update `packages/api/docs/trade.md` ("Which lists swap, and Open to", and the Trade posts paragraph's sentence on what `list.edit` takes) for `saleOpenTo` off Trade and its `CASE`, and `apps/web/docs/trade.md` (composer forms hide the sale choice too). Verify each named function exists as written.

## 6. Create and copy

- [x] 6.1 Add `takesSwaps: z.boolean().default(false)` to `createListInputSchema`, and store it in `writeList` (`services/list/create.ts`) only for a bound sale list. Confirm a body without it validates to false.
- [x] 6.2 `toCreateInput` sends `takesSwaps` for a bound sale list only; `toCopyDraft` and `CopySource` carry a sale source's choice into a sale copy and nothing else. Update `list-draft.test.ts` and `copy-draft.test.ts`. Verify with `bun run test --filter=web`.
- [x] 6.3 Browser pass (read only, nothing saved on production): the create form shows Open to at Sell only for a bound sale list and hides it when binding is turned off; Copy as new list of a Sell or swap sale list starts at Sell or swap as a sale list and shows no sale choice as a have list; composer New sale list… and Copy a list… show none.
- [x] 6.4 Note in `packages/api/docs/trade.md` that `list.create` and `list.copy` take `takesSwaps` for a bound sale list.

## 7. Wrap-up

- [x] 7.1 `bun run check` passes from the root, and `openspec validate sale-open-to-off-trade --strict` still passes. Both passed on 2026-11-20.
- [x] 7.2 No `AGENTS.md` changes: no convention, trap or workflow changes. Re-read the root, `apps/web` and `packages/api` `AGENTS.md` against the diff and confirm, or update the one that changed. Confirmed on 2026-11-20: the change set no convention, trap or workflow; `packages/api/docs/trade.md` and `apps/web/docs/trade.md` carry its behaviour.

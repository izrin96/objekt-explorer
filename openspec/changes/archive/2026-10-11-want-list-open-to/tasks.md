## 1. Restore the Match with code

- [x] 1.1 Run `git checkout cd0f6269 --` on every code file `e8fbf708` changed, apart from migrations, `openspec/` and `apps/web/messages/*.json`. Confirm the list with `git show --stat e8fbf708`:
  - `packages/api/src/services/trade-lists.ts`
  - `packages/api/src/services/trade-feed/{query,entries,viewer}.ts`
  - `packages/api/src/services/trade-matches/candidates.ts`
  - `packages/api/src/lib/{trade-feed,trade-rank}.ts` and their `.test.ts`
  - `packages/api/src/schemas/list.ts`, `packages/api/src/routers/list-crud.ts`
  - `apps/worker/src/job/want-alerts/pairs.ts`
  - `apps/web/src/features/list/{list-form,edit-list-dialog}.tsx`
  - `packages/db/src/schema.ts`

  Done when `git diff cd0f6269 -- <those paths>` is empty.
- [x] 1.2 Run `bun run --filter=@repo/db db:generate` to produce a new migration. Do not run `db:migrate`; that needs the user's approval. Done when the new migration is the single line `ALTER TABLE "lists" ADD COLUMN "match_sale" boolean DEFAULT true NOT NULL;`, and `20261010152345_drop_want_match_sale` is unchanged.

## 2. Messages

- [x] 2.1 Run `git checkout cd0f6269 -- apps/web/messages/en.json apps/web/messages/ja.json apps/web/messages/ko.json`. Then set:
  - `list_create_match_with_label`, `list_create_match_trades_label` and `list_create_match_sales_label` to the en, ja and ko texts in design.md;
  - `trade_match_help_trades_only` and the three Browse table cells to the design.md wording, translated in ja and ko with the same terms.

  Done when `grep -n "Trades only\|Trades and sales\|Match with" apps/web/messages/en.json` finds nothing.
- [x] 2.2 Open the create dialog with type Want, the Browse `?` and the For you `?` at desktop width and at 390 px. Done when "Open to" shows Trade only / Trade or buy, the link field has no trades-only note, the help shows the new wording, and nothing scrolls sideways.

## 3. Specs and checks

- [x] 3.1 Delete `openspec/changes/derive-trades-only-from-link/`, which this change supersedes. Run `openspec validate want-list-open-to` and `openspec validate --specs`, and confirm both pass.
- [x] 3.2 Run `bun run lint`, `bun run typecheck`, `bun run test` and `bun run build --filter=web`, and confirm they pass. Confirm `grep -rn "takesSales\|wantTakesSalesSql" packages apps --include=*.ts --include=*.tsx` finds nothing.
- [x] 3.3 After the user approves `db:migrate` on the local DB (`.env.local`, never production), check with a script that calls `fetchTradeCandidates` and `fetchFeedRows` directly and restores every row it changes. Do not go through the app, since `.env.local` has no local `REDIS_URL`:
  - a Trade only want list does not count a partner's sale entry, and Trade or buy does;
  - linking the want list to a have list changes neither result;
  - a want list on its own is WTT when Trade only and WTB when Trade or buy.

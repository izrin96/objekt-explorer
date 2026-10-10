## 1. Shared rule

- [x] 1.1 In `packages/api/src/services/trade-lists.ts`:
  - add `wantTakesSalesSql(alias)`, which returns `(<alias>.linked_list_id IS NULL)`;
  - change `offerMatchesWantSql(offer, takesSales: SQL)` to take the expression, with its comment rewritten around the link.

  Done when `bun run typecheck --filter=@repo/api` shows errors only at the old call sites, which tasks 2.x fix.
- [x] 1.2 In `packages/api/src/lib/trade-feed.ts`:
  - drop `matchSale` from `TradeList`;
  - add a pure `takesSales(list)`, which returns `list.linkedListId === null`;
  - use it in `postTag`, typed on `want: { linkedListId: number | null } | null`, and in `indexFor`;
  - reword the `Viewer` comment ("the want lists linked to a have list").

  Update `trade-feed.test.ts`:
  - the WTT case uses a want list with a `linkedListId`;
  - the WTB case uses one with `linkedListId: null`;
  - add a `takesSales` test.

  Done when `bun test packages/api/src/lib/trade-feed.test.ts` passes.

## 2. Queries

- [x] 2.1 In `services/trade-feed/query.ts`:
  - `on_trade` and `posts` stop selecting `match_sale`;
  - `TAG_WHERE` reads `posts.linked_list_id`, carried through from `on_trade` as `a.linked_list_id`. WTT is `type = 'have' OR (type = 'want' AND linked_list_id IS NOT NULL)`, WTB is `type = 'want' AND linked_list_id IS NULL`;
  - `matchesIndex` uses `wantTakesSalesSql("t")`.

  Done when `/trade?type=wtt` and `?type=wtb` on the local dev DB put a linked lone want list under WTT and an unlinked one under WTB.
- [x] 2.2 In `services/trade-feed/entries.ts`, drop `matchSale` from `feedListColumns` and `FeedList`. In `viewer.ts`, select `linkedListId` and build `tradeOnlyIds` from `linkedListId !== null`. Done when `bun run typecheck --filter=@repo/api` is clean for these files.
- [x] 2.3 In `services/trade-matches/candidates.ts`:
  - `my_want` aggregates `bool_or(${wantTakesSalesSql("l")}) AS takes_sales`;
  - `partner_lists` selects `${wantTakesSalesSql("l")} AS takes_sales`;
  - `matched` calls `offerMatchesWantSql("p", sql\`w.takes_sales\`)`, and the reverse arm uses `p.takes_sales OR h.on_have`;
  - the `they_want` triple and `Candidate.theyWant` carry `takesSales`.

  In `lib/trade-rank.ts`, rename `matchSale` to `takesSales` and update `trade-rank.test.ts` to the new name. Done when `bun test packages/api/src/lib/trade-rank.test.ts` passes.
- [x] 2.4 In `apps/worker/src/job/want-alerts/pairs.ts`:
  - `cand` selects `l.linked_list_id` in place of `l.match_sale`;
  - the forward arm passes `wantTakesSalesSql("wl")`;
  - the reverse arm passes `wantTakesSalesSql("c")`.

  Done when `bun run typecheck --filter=worker` and `bun run lint --filter=worker` pass.

## 3. Schema and inputs

- [x] 3.1 Remove `matchSale` from `lists` in `packages/db/src/schema.ts`. Run `bun run --filter=@repo/db db:generate` to produce a new migration that drops `match_sale`. Leave `20261008120518_want_match_sale` untouched. Do **not** run `db:migrate`; that needs the user's approval. Done when the new migration's SQL is one `ALTER TABLE "lists" DROP COLUMN "match_sale";`.
- [x] 3.2 In `schemas/list.ts`, drop `matchSale` from `createListInputSchema` and `editListInputSchema`. In `routers/list-crud.ts`, stop writing it. Done when parsing `{ ...validEditInput, matchSale: true }` with `editListInputSchema` succeeds and the output has no `matchSale`, checked in a one-off `bun -e` or a schema test.

## 4. Web

- [x] 4.1 In `features/list/list-form.tsx`:
  - remove the Match with `RadioGroup`, `MATCH_WITH` and `matchSale` from the draft, the defaults and the submit payload;
  - remove `matchSale` from `edit-list-dialog.tsx`;
  - delete the five `list_create_match_*` keys in en, ja and ko;
  - reword `list_create_link_list_desc` in all three to add that a linked want list matches trades only, not sale lists.

  Done when the create and edit dialogs for a want list show no Match with choice and the link field shows the note. Check at desktop width and at 390 px.
- [x] 4.2 In `features/trade/match-help.tsx` messages, in en, ja and ko:
  - `trade_match_help_trades_only` says a want list linked to a have list never matches a sale list, whether it is yours or theirs;
  - the Browse table cells read WTS → "Want lists not linked to a have list", WTT → "Have list, or a want list linked to one", WTB → "Want list not linked to a have list".

  Done when Browse's and For you's `?` popovers show the new text, with no horizontal scroll at 390 px.

## 5. Specs and checks

- [x] 5.1 Confirm `trade-chrome-details` is archived before this change, since this change removes its "Want list match option". Run `openspec validate derive-trades-only-from-link` and confirm it passes.
- [x] 5.2 Run `bun run lint`, `bun run typecheck`, `bun run test` and `bun run build --filter=web`, and confirm they pass. Run `grep -rn "matchSale\|match_sale" packages apps --include=*.ts --include=*.tsx` (excluding `migrations/` and generated `paraglide/`) and confirm it finds nothing.
- [x] 5.3 On the local dev DB (`.env.local`), not production, after the user approves `db:migrate`, check these, and record any that cannot be exercised as read-only verified:
  - a linked want list's post is WTT and a sale entry does not count toward it in Browse or For you;
  - unlinking it makes the post WTB and the sale entry counts.

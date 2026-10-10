## Context

`lists.match_sale` (added on `feat/trade` by `20261008120518_want_match_sale`, default `true`) is read in five places:

- `offerMatchesWantSql` in `services/trade-lists.ts`, used by the For you candidates and both want-alert directions in `apps/worker/src/job/want-alerts/pairs.ts`;
- the Browse feed: `TAG_WHERE`, the `posts` CTE and `matchesIndex` in `services/trade-feed/query.ts`, `feedListColumns` in `entries.ts`, and `postTag` and the match side in `lib/trade-feed.ts`;
- the viewer's want index in `trade-feed/viewer.ts` (`saleWant`, `tradeHave`);
- For you: `my_want` and `partner_lists` in `trade-matches/candidates.ts`, and the `theyWant` recount in `lib/trade-rank.ts`;
- the list form and the create and edit inputs (`schemas/list.ts`, `routers/list-crud.ts`, `list-form.tsx`, `edit-list-dialog.tsx`).

Links are mirrored. `list-crud` sets `linked_list_id` on both lists, clears any other list pointing at the same target, and the FK is `ON DELETE SET NULL`. `checkLinkedList` allows only have↔want between one owner's lists. A read-only count on the database in the root `.env` found 84 linked want lists out of 370, and none whose link is one-sided or points anywhere but the owner's have list pointing back. A link change already reports both lists as changed and bumps the owner's trade version.

## Goals / Non-Goals

**Goals:**
- One definition of "takes sales" (the want list has no link), used by every query that used `match_sale`.
- Drop the column and the setting with no behaviour left behind it.

**Non-Goals:**
- Any change to how links are created, mirrored or cleared.
- Caching or indexing changes. `linked_list_id` is already on every row these queries read.

## Decisions

**A want list takes sales when `linked_list_id IS NULL`, read off the want row itself.**
- Links are mirrored and cleared on delete, so the want row's own column is exact, and it costs nothing: every query already reads that row.
- Rejected: an `EXISTS` over the owner's have lists. It is robust to a one-sided link, but no such link exists and `list-crud` cannot create one. It would add a subquery per want row in the hottest queries.
- Rejected: keeping `match_sale` and writing it on every link change. Every unlink path (edit, relink elsewhere, delete through the FK) would have to flip it, and a missed path silently mis-tags a post.

**One SQL helper for the predicate, and `offerMatchesWantSql` takes it as an expression.**
- In `trade-lists.ts`, `wantTakesSalesSql(alias)` returns `(<alias>.linked_list_id IS NULL)`.
- `offerMatchesWantSql(offer, takesSales: SQL)` returns `(<offer>.list_type_new = 'have' OR <takesSales>)`.
- The second argument is an expression, not an alias, because `candidates.ts` matches against `my_want`, an aggregate per collection. It needs `bool_or(${wantTakesSalesSql("l")}) AS takes_sales` and passes `sql\`w.takes_sales\``. A want row passed through a CTE (`cand` in `pairs.ts`, `on_trade` in `query.ts`) carries `linked_list_id` or a `takes_sales` alias computed from the helper. It never holds a second copy of the rule.

**In TypeScript the field becomes `takesSales`, derived from the link.**
- `matchSale` named a setting that no longer exists. `takesSales` says what it means.
- `FeedList` drops `matchSale`, since it already carries `linkedListId`. `lib/trade-feed.ts` gets a pure `takesSales(list)` that returns `list.linkedListId === null`. `postTag` and the match side use it.
- The For you `theyWant` triple and `trade-rank.ts` keep a boolean, renamed `takesSales`, filled in SQL from the helper.
- The existing tests move to the new name. `trade-feed.test.ts` drives the WTT and WTB cases through `linkedListId`.

**The column is dropped by a new migration, generated from the schema.**
- Remove `matchSale` from `packages/db/src/schema.ts` and run `db:generate` to get `ALTER TABLE "lists" DROP COLUMN "match_sale"`. `20261008120518` stays as it is.
- Dropping it before the deploy is safe, because the code running in production (`main`) never reads `match_sale`. The usual rule of dropping a column only after a deploy, which is what `hide_user` follows, is not needed here.

**Old `/rpc` inputs stay valid by dropping the field from the schemas.**
- `createListInputSchema` and `editListInputSchema` are plain `z.object`, which strips unknown keys. A stale tab that sends `matchSale` passes validation, and the field is discarded.
- No `z.preprocess` is needed, since nothing maps the old field to a new one.

**The UI reuses what is there.**
- The Match with `RadioGroup` and `MATCH_WITH` go from `list-form.tsx`, along with the five `list_create_match_*` messages.
- `list_create_link_list_desc` gains the trades-only note, so the rule shows where the link is set. It's one message, shown for both have and want lists.
- `trade_match_help_trades_only` (For you) is reworded around the link.
- The Browse help table's WTT and WTB cells say "linked" and "not linked", not "set to Trades only/Trades and sales". In WTS's "Matches your" cell, "Want lists set to Trades and sales" becomes "Want lists not linked to a have list".

## Risks / Trade-offs

- [A user with a linked want list who would also buy stops seeing sellers.] → The workaround is a second, unlinked want list with the same entries, which the link field's note makes discoverable. Accepted in the proposal.
- [An unlinked want list on its own now matches sellers, so someone who wanted trades only gets WTB and seller matches.] → Linking a have list gives them trades only. The help table says so.
- [`REMOVED` targets a requirement that only exists in the unarchived `trade-chrome-details`.] → Archive `trade-chrome-details` first. Archiving this change before it would fail on the missing requirement.
- [The uncommitted Browse help table on `feat/trade` is the base for the help wording.] → Commit or keep it before applying. Task 4.2 edits its cells.

## Migration Plan

1. Merge the code and the new migration together.
2. Run `db:migrate`, which needs the user's approval, on each database before deploying `feat/trade`. That's local, staging, then production, in the same pre-deploy step as the branch's other migrations.
3. Rollback: the column can be re-added with its old default (`true`). Nothing reads it, so the only cost is a migration.

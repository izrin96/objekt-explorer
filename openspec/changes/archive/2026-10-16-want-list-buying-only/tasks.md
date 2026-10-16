## 1. Schema

- [x] 1.1 In `packages/db/src/schema.ts`, add `matchHave: boolean("match_have").notNull().default(true)` beside `matchSale` and a check constraint `lists_open_to_something` on `match_sale OR match_have`. Then run `bun run --filter=@repo/db db:generate`. Do not run `db:migrate`; that needs the user's approval.
  - Done when the new migration holds only the `ADD COLUMN "match_have" boolean DEFAULT true NOT NULL` and the `ADD CONSTRAINT ... CHECK`, and no past migration changed.
  - Lint, typecheck and build pass for `@repo/db`.

## 2. API: lists

- [x] 2.1 In `schemas/list.ts`:
  - add `matchHave` to the list output (nullish);
  - add it to `createListInputSchema` (`.default(true)`);
  - add it to `editListInputSchema` (`.optional()`).

  In `list-crud.ts`, normalise as design.md says:
  - a want list with `matchSale` false saves `matchHave` true;
  - a non-want list saves both as true;
  - an edit that leaves `matchHave` out keeps the row's value, unless `matchSale` turns false.

  Return `matchHave` from `services/list.ts` wherever `matchSale` is returned.

  Put the normalisation in a pure function with a `*.test.ts` that covers:
  - an old-tab edit with `{ matchSale: false }` on a Buying only list, which gives swaps only;
  - an untouched old-tab edit, which keeps Buying only;
  - a new create with no `matchHave`.

  Done when `bun test` passes and lint, typecheck and build pass for `@repo/api`.

## 3. API: matching

- [x] 3.1 `services/trade-lists.ts`: `offerMatchesWantSql` adds the `match_have` guard on the have side.
  - Done when the For you candidates query and the worker's pairs read it unchanged.
  - Lint and typecheck pass.
- [x] 3.2 `trade-matches/candidates.ts`:
  - `my_want` gets `bool_or(match_have)`;
  - `my_have` gets `on_sale`;
  - the reverse branch becomes `(p.match_have AND h.on_have) OR (p.match_sale AND h.on_sale)`;
  - `they_want` and `Candidate.theyWant` carry `matchHave`.

  Lint and typecheck pass.
- [x] 3.3 `lib/trade-rank.ts` `recount`:
  - `MyWant.matchHave`;
  - a sale-only verdict beside the have-only one;
  - `MyHaves.sale`;
  - the three-way choice for a partner want.

  `trade-matches/index.ts` builds `myHaves.sale` and selects `matchHave` for `myWants` and for partner lists.

  Add cases to `trade-rank.test.ts`:
  - a Buying only want of mine is not answered by a partner have entry, and is answered by a partner sale entry;
  - a partner's Buying only want is answered only by my sale list;
  - a mixed slug, with both have and sale entries, against a Buying only want counts through the sale entry only.

  `bun test` passes.
- [x] 3.4 Browse:
  - `lib/trade-feed.ts`:
    - `TradeList.matchHave`;
    - `Viewer` and `MatchIndex` gain `tradeWant` and `saleHave`;
    - `indexFor` matches a have side against `tradeWant`, and a want side against `have`, `tradeHave` or `saleHave`;
    - `narrowViewer` and `matchIndexOf` follow.
  - `trade-feed/viewer.ts` builds the two new indexes.
  - `trade-feed/entries.ts` selects `matchHave`.
  - `trade-feed/query.ts`:
    - `postsCte` selects `match_have`;
    - `matchesIndex` uses `tradeWant` for have entries and a three-arm `CASE` for want entries.
  - The post output gains a `buyingOnly` flag, always present (open tabs ignore it) for a WTB post whose want list has `matchHave` false.

  Add `trade-feed.test.ts` cases:
  - a lone Buying only want is tagged `wtb`;
  - a have list linked to one is tagged `wtt`;
  - rings follow the new indexes.

  `bun test` passes.
- [x] 3.5 Bump the cache versions `trade:foryou:4`, `trade:mutual-people:2`, `trade:mutual-count:3` and `trade:person:3`.
  - Done when `grep -rn "trade:foryou:4\|mutual-people:2\|mutual-count:3\|trade:person:3" packages/api/src` finds nothing.
  - Lint, typecheck and build pass for `@repo/api`.

## 4. Worker

- [x] 4.1 `apps/worker/src/job/want-alerts/pairs.ts`: add `l.match_have` to the `cand` select, so `offerMatchesWantSql(ol, c)` reads it in the reverse direction.
  - Done when lint, typecheck and build pass for `worker`.
  - Done when the read-only check in 7.2 shows no have-list pair against a Buying only want list in either direction. Note: covered by 7.2 (2026-10-16, local DB): no have-list pair against the Buying only want list in either direction.

## 5. Web: list form

- [x] 5.1 `list-form.tsx`, List type:
  - Move it to the top as a segmented `RadioGroup`, with four equal segments and the type's description beneath, as design.md says.
  - Currency gets its own row, shown for sale lists only.
  - Edit mode shows `ListTypeBadge` at the top instead of the disabled Select.
  - Switching type keeps Name and Description.
  - Done when the create dialog at desktop width and at 390 px shows type first, arrow keys move the choice, nothing scrolls sideways, and the dev overflow guard stays quiet.
  - Lint, typecheck and build pass for `web`.
- [x] 5.2 `list-form.tsx`, Open to:
  - `MATCH_WITH` gets a third option, Buying only (`matchSale: true`, `matchHave: false`).
  - The radio value derives from both flags, and the draft and submit carry `matchHave`.
  - `edit-list-dialog.tsx` seeds `matchHave`.
  - `openToLabel` in `list-type-badge.tsx` becomes three-way.
  - Done when creating a Want list with Buying only sends `{ matchSale: true, matchHave: false }`, verified at the request boundary only (never submit on production).
  - Done when the edit dialog of such a list shows Buying only selected.

## 6. Web: Browse and messages

- [x] 6.1 Add the new keys and reword the existing ones in `en`, `ja` and `ko` (design.md Copy):
  - `list_create_match_buying_label`, `list_create_match_buying_desc` and `trade_wtb_buying_only`;
  - `trade_browse_help_wtb_list`.

  Done when `paraglide:compile` succeeds and the three files have the same keys.
- [x] 6.2 `browse-post.tsx`: show `trade_wtb_buying_only` beside a WTB tag when `post.buyingOnly`.

  `match-help.tsx` Mutual table:
  - Split the have row into a yes row (Swaps only, Swaps or buying) and a no row (Buying only).
  - Add a sale × Buying only yes row.
  - Rename the sale × Swaps or buying row's want cell if needed for clarity.

  Done when the help popover at 390 px has no sideways scroll, and a Buying only post shows its note. Lint, typecheck and build pass for `web`. Note: browser render of the note skipped by the user's choice; covered by type-check and tests.

## 7. Checks and docs

- [x] 7.1 Run `bun run lint`, `bun run typecheck`, `bun run test` and `bun run build`, and confirm they all pass. Then run `openspec validate want-list-buying-only --strict`.
- [x] 7.2 This step runs only after the user approves `db:migrate` on the local DB (`.env.local`, never production). Check with a script that calls `fetchTradeCandidates`, `fetchFeedRows` and the worker's `fetchPairs` directly and restores every row it changes.
  - A Buying only want list:
    - counts a partner's sale entry;
    - does not count their have entry;
    - is WTB on its own;
    - leaves a linked have list's post WTT.
  - A partner's Buying only want counts only the user's sale list.
- [x] 7.3 Update `packages/api/AGENTS.md` "Trade matching". State that a have list counts only against a want list open to swaps (`match_have`), a sale list only against one open to buying (`match_sale`), that the two never are both false, and the new cache versions. Confirm that no other package's `AGENTS.md` changes: the worker and web conventions are unchanged.

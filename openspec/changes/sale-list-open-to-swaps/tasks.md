# Tasks

## 1. Schema

- [x] 1.1 Add `lists.takes_swaps` (boolean, not null, default false, `CHECK (NOT takes_swaps OR list_type = 'sale')`) to `packages/db/src/schema.ts`; generate the migration and apply it to the LOCAL database only, after approval. Lint, typecheck and build pass for `@repo/db`.

## 2. Pure rules

- [x] 2.1 `schemas/open-to.ts`: `SaleOpenTo`, `saleOpenToOf`, `offersSwaps(list)`. `schemas/trade-post.ts`:
  - `tagsOf` gives a sale post WTS then WTT when it takes swaps;
  - `groupPosts` and `partnerOf` pair a sale list that takes swaps with its want list;
  - `composerWrites` and `planPost` take `alsoSwap` and an optional want list on Sell;
  - `PostChoice.alsoSwap` is optional and keeps the current value.
- [x] 2.2 Tests beside them, covering:
  - tags for Sell only and Sell or swap, alone and paired;
  - a Sell post with a want list and no `alsoSwap` is refused;
  - an edit that leaves `alsoSwap` out keeps it;
  - unticking on a pair asks to unpair.

  Lint, typecheck, test and build pass for `@repo/api`.

## 3. Matching

- [x] 3.1 `services/trade-lists.ts`: `offersSwapsSql`, and `offerMatchesWantSql` on it. `candidates.ts`:
  - the swap flag and `my_have.on_have` use the predicate;
  - entries carry `swap` and `sale`.

  `lib/trade-rank.ts` `recount` judges haves on `swap` and sales on `sale`, with tests for an entry that is both. Bump the For you cache keys named in the design.
- [x] 3.2 `trade-feed/viewer.ts`: `tradeHave` takes sale lists that take swaps. `trade-feed/query.ts`: `postsCte` folds a want list into a sale list that takes swaps, and `TAG_WHERE.wtt` matches it. The feed's list columns carry `takesSwaps`. Lint, typecheck, test and build pass for `@repo/api`.

## 4. Lists and posts

- [x] 4.1 `checkLinkedList` takes a sale list that takes swaps as a want list's partner, and refuses a Sell only one with the new `list_sale_links_sell_only` (en/ko/ja `api_errors_*`). `list.edit` keeps a sale list's link. `trade.savePost` writes `takes_swaps` and the link. `fetchList` and `fetchOwnedLists` return `takesSwaps`. Lint, typecheck and build pass for `@repo/api`.

## 5. Web

- [x] 5.1 Post composer (`features/trade/post-list-dialog.tsx`):
  - Sell gains "Also open to swaps" and, with it ticked, a want list picker (reusing the Swap step's rows);
  - its tag preview reads WTS and WTT;
  - unticking on a pair goes through the unpair prompt.
- [x] 5.2 `openToLabel` names "Sell or swap" on the list header and card. The "?" help tables gain the rows from the design. Add one changelog line. en/ko/ja strings. Lint, typecheck and build pass for `web`.

## 6. Verify

- [x] 6.1 Local database:
  - a Sell or swap list matches a swaps-only want list in For you and in a person's Can swap;
  - a Sell only list still doesn't;
  - a sale and want pair shows as one post tagged WTS and WTT;
  - one want-alert pass on the local database, with approval before it writes rows.
- [x] 6.2 Browser at desktop and phone width in en/ko/ja: the composer's Sell step, the list header, Browse post tags and the Post type menu, the help popover; no horizontal overflow.
- [x] 6.3 Update `packages/api/AGENTS.md`:
  - "Trade matching": the swap predicate, the entry's `swap` and `sale`;
  - "Trade posts": a sale pair, the tags.

  State that `apps/worker` and `packages/db` conventions are unchanged, or update them.

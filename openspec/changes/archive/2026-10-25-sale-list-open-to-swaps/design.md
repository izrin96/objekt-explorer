# Design

## Context

Matching decides "is this a swap" from the list type in a handful of places:
- `offerMatchesWantSql` (`services/trade-lists.ts`): a have list against `match_have`, a sale list against `match_sale`. Candidates and the want-alert pairs both use it.
- `candidates.ts`: `trade = p.list_type = 'have'` and `my_have.on_have`.
- Entry JSON in `candidates.ts`: `'sale', NOT trade`, which `recount` splits through `judgeOffers(sale)`.
- The viewer's indexes (`trade-feed/viewer.ts`): `tradeHave` is the non-sale lists, `saleHave` the sale lists.
- `TAG_WHERE` and `postsCte` (`trade-feed/query.ts`): a want list folds only into a have list.
- `groupPosts`, `tagsOf` and `composerWrites` (`schemas/trade-post.ts`).
- `checkLinkedList` (`services/list.ts`) and the list edit, which clears the link on anything but have and want.

A want list's Open to is two booleans (`match_have`, `match_sale`) read through `schemas/open-to.ts`. `resolveOpenTo` writes `both` on every non-want list, so sale lists already hold `match_have = true`. Those columns can't be reused for a sale list's choice.

## Goals / Non-Goals

**Goals:**
- A sale list that also takes swaps.
- It counts everywhere a have list counts for swapping, with one source of truth per rule.
- It pairs with a want list into one post.
- Existing lists unchanged.

**Non-goals:** as in the proposal.

## Decisions

1. **A new column, not the want flags.** `lists.takes_swaps boolean NOT NULL DEFAULT false`, with `CHECK (NOT takes_swaps OR list_type = 'sale')`.
   - The default keeps every sale list Sell only.
   - The check keeps have lists out of it.
   - `schemas/open-to.ts` gains `SaleOpenTo = "sell" | "both"` beside `OpenTo`, with `saleOpenToOf` and the labels.
   - Reusing `match_have` was rejected: existing sale lists already hold `true` there, so every one would become Sell or swap.

2. **"Swappable" is one predicate.** "Offers swaps" becomes `list_type = 'have' OR (list_type = 'sale' AND takes_swaps)`.
   - It lives once in SQL, as `offersSwapsSql(alias)` in `trade-lists.ts`, and once in TS, as `offersSwaps(list)` in `schemas/open-to.ts`.
   - `offerMatchesWantSql` becomes `(offersSwaps AND want.match_have) OR (sale AND want.match_sale)`, which fixes candidates and want alerts together.
   - `candidates.ts`:
     - `trade` becomes the swap predicate;
     - `my_have.on_have` becomes `bool_or(<swaps>)` and `on_sale` stays;
     - partner want rows match on `(match_have AND on_have) OR (match_sale AND on_sale)` as now.

3. **An entry can be both a swap and a sale.** Candidate entries carry `swap` and `sale` booleans in place of `'sale', NOT trade`. `recount`'s `judgeOffers` reads `swap` for haves and `sale` for sales, so a Sell or swap entry is judged under both.
   - The type in `lib/trade-rank.ts` changes. `CandidateEntry.sale` stays for the cache's old shape, and the For you cache keys are bumped (`trade:foryou:10`, `mutual-people:8`, `person:7`, `oneway-people:4`), since the values change meaning.
   - The viewer's `tradeHave` takes have lists and sale lists that take swaps; `saleHave` keeps every sale list.

4. **Pairs: a sale list folds a want list as a have list does.**
   - `postsCte` joins the partner when `a.list_type = 'have' OR (a.list_type = 'sale' AND a.takes_swaps)`, and its `NOT EXISTS` absorbs the want list into either.
   - `groupPosts` and `partnerOf` do the same through `offersSwaps`.
   - `TAG_WHERE.wtt` adds `(posts.type = 'sale' AND posts.takes_swaps)`, and `tagsOf` adds WTT to a sale post, after WTS.
   - `checkLinkedList`:
     - takes a sale list as the want list's partner only when it takes swaps, refusing with `list_sale_links_sell_only`;
     - refuses a want list linking to a Sell only sale list with the same code;
     - keeps `pairRefusesOpenTo` for the want side.
   - `list.edit` keeps a sale list's link instead of clearing it.

5. **The composer owns the choice, as with a want list's Open to.**
   - `composerWrites("sell")` takes `sale`, an optional `want` and `alsoSwap`.
   - With a want list it requires `alsoSwap`, refusing `trade_post_wrong_type` otherwise, links them, and saves the want list Swaps only.
   - `PostChoice.alsoSwap` is optional and defaults to the list's current value, so an open tab's Sell edit keeps the choice.
   - `planPost` writes `takes_swaps`. Unticking on a pair goes through the existing unpair prompt (`trade_post_list_paired`).
   - The web composer (`features/trade/post-list-dialog.tsx`) adds the toggle and a want picker to the Sell step, reusing the Swap step's "also pay" row and want picker.

6. **Labels.** `openToLabel` returns "Sell or swap" for a sale list with `takes_swaps`, and nothing for Sell only. `fetchList`, `fetchOwnedLists` and the feed's list columns carry `takesSwaps`.

7. **Help and changelog.**
   - "What matches your want list" gains a row: Sale list (open to swaps), ✓ ✓ ✓.
   - "What counts toward Can swap":
     - adds Sale list open to swaps ↔ want list open to swaps, ✓;
     - renames the sale row to "Sale list, Sell only".
   - One changelog line.

## Risks / Trade-offs

- **Shape change.** The shape change in the candidate entries touches cached values, so the cache keys are bumped. A stale tab only reads, so nothing breaks.
- **Double counting.** A Sell or swap entry counts as a swap and a sale toward one person. Counts are per collection, so a collection still counts once.
- **Wider alert reach.** Alerts reach more people the moment a list turns Sell or swap. The reverse alert fires for every matching swaps-only want list, grouped per list per day as now.

## Migration Plan

- One migration: add `takes_swaps` with its default and check. No backfill.
- Apply locally, then staging and prod with approval, before the code that reads it.
- Rollback: drop the column. Sale pairs would then show as two posts until unlinked.

## Open Questions

- Should "Also pay" be allowed on the want side of a sale pair later? It's left out for now.

## Context

Today a want list's Open to choice is one column, `lists.match_sale boolean NOT NULL DEFAULT true`, and the input default makes a new want list Swaps only. Have and sale lists store `true` and never read it. The rule "a have list matches any want list, a sale list matches only a want list with `match_sale`" lives in these places:

- `offerMatchesWantSql` (`services/trade-lists.ts`). The For you candidates query and both directions of the worker's `want-alerts/pairs.ts` read it.
- `candidates.ts`:
  - `my_want` has `bool_or(match_sale)`;
  - the reverse branch has `(p.match_sale OR h.on_have)`.
- `recount` (`lib/trade-rank.ts`):
  - `MyWant.matchSale` filters my wants against a partner's sale-only collection;
  - `myHaves.all` and `myHaves.trade` answer a partner want, depending on its `matchSale`.
- Browse:
  - `Viewer` and `MatchIndex` (`lib/trade-feed.ts`) hold `have`, `tradeHave`, `want` and `saleWant`, built in `trade-feed/viewer.ts`;
  - `indexFor` and `query.ts`'s `matchesIndex` use them, with a `CASE` on `match_sale`;
  - `TAG_WHERE` and `postTag` tag a lone want list.

## Goals / Non-Goals

**Goals:**
- Add the third state in a way that keeps every current `match_sale` predicate correct for the sale side.
- Leave old `/rpc` clients and existing rows unaffected.

**Non-Goals:**
- Renaming `match_sale`, or replacing the booleans with an enum. See the alternative below.

## Decisions

**A second boolean, `lists.match_have boolean NOT NULL DEFAULT true`, plus `CHECK (match_sale OR match_have)`.**

| Open to | `match_have` | `match_sale` |
|---|---|---|
| Swaps only | true | false |
| Swaps or buying | true | true |
| Buying only | false | true |

- Existing rows read the same as today, and so do have and sale lists, with both columns true.
- Each match site gains one `match_have` guard on the have side and leaves its sale side alone.
- Alternative: an `open_to` text/enum column.
  - It is cleaner to read, but it rewrites every `match_sale` site.
  - It still has to output `matchSale` for open tabs, and it needs a later drop migration.
  - Rejected.

**Matching, site by site:**
- `offerMatchesWantSql`(offer, want) becomes `(offer.type = 'have' AND want.match_have) OR (offer.type = 'sale' AND want.match_sale)`. This covers the candidates' forward branch and both worker directions. The worker's `cand` CTE selects `l.match_have`, since the reverse direction reads the want side from it.
- `candidates.ts`:
  - `my_want` adds `bool_or(match_have)`.
  - `my_have` adds `bool_or(list_type_new = 'sale') AS on_sale`.
  - The reverse branch becomes `(p.match_have AND h.on_have) OR (p.match_sale AND h.on_sale)`.
  - `they_want` carries `match_have`, and `Candidate.theyWant` gains `matchHave`.
- `recount`:
  - `MyWant` gains `matchHave`.
  - For a partner collection, the code already computes the verdict over all entries and over have entries alone (`trade`). It adds the verdict over sale entries alone.
  - My want counts when it takes swaps and the have-only verdict is ok, or when it takes buying and the sale-only verdict is ok.
  - `MyHaves` gains `sale`, my sale lists alone, which answers a partner want with `matchHave` false. The three cases are `all` / `trade` / `sale`, chosen by the partner want's two flags.
  - `trade-matches/index.ts` builds `sale` beside `trade` and selects `matchHave` for `myWants`.
- Browse:
  - `Viewer` and `MatchIndex` gain `tradeWant` (my want lists open to swaps) and `saleHave` (my sale lists alone).
  - A partner's have side is matched against `tradeWant` instead of `want`.
  - A partner's want side picks `have`, `tradeHave` or `saleHave` from its two flags.
  - `indexFor`, `narrowViewer`, `matchIndexOf`, `fetchViewer` and the `matchesIndex` `CASE` all follow.
  - `postsCte` selects `match_have`.
  - `TAG_WHERE` and `postTag` need no change: a lone Buying only list has `match_sale` true, so it is WTB already, and a pair is WTT.
- Bump the cache versions `trade:foryou:4`, `trade:mutual-people:2`, `trade:mutual-count:3` and `trade:person:3`. Their values change meaning.

**API input: `matchHave` beside `matchSale`.**
- Create: `matchHave: z.boolean().default(true)`.
- Edit: `matchHave: z.boolean().optional()`.
- The server normalises a want list:
  - when the saved `matchSale` is false, it saves `matchHave = true`;
  - otherwise it saves the input `matchHave`, or keeps the current value when the input leaves it out.
  - Non-want lists save both as true.
- That makes the check unreachable from input, so no new refusal code is needed.
- The open-tab edit trap:
  - An old dialog shows a Buying only list as Swaps or buying, since `matchSale` is true.
  - Saved untouched, it sends `matchSale: true` and no `matchHave`, so the list stays Buying only.
  - Switched to Swaps only, it sends `matchSale: false`, and the server restores `matchHave`.
- Outputs keep `matchSale` and add `matchHave` (nullish), on list rows and on partner lists.
- A Browse post gains a `buyingOnly` flag, always present; open tabs ignore it, for the byline note.
- Alternative: an `openTo` enum input. It is nicer for the form, but it adds a second vocabulary to map against the columns. Rejected. The form maps its three radios to the two booleans in one table, as `MATCH_WITH` does now.

**Buying only linked to a have list: allowed, and the pair stays WTT.**
- Pairing never changes matching, which the existing spec states.
- The have side really does offer swaps.
- Refusing the link would add a refusal code, three translations and a state where changing Open to breaks an existing link.

**List form: List type first, as a segmented radio group.**
- Use the vendored `RadioGroup` (`components/ui/radio-group.tsx`), laid out as four equal segments, with the type's description beneath.
- It gives radio semantics and arrow-key movement, which `Tabs` would get wrong: tabs imply panels. `ToggleGroup` would need the single-select mode and announces as pressed buttons rather than a choice.
- Segments carry the type colour only on the selected state, through the existing `toneChip` tokens. This keeps "Quiet gallery" chrome.
- Currency moves to its own row, shown for sale lists only. That removes today's two-column grid.
- Edit mode renders `ListTypeBadge` at the top instead of the disabled Select.

**Copy (en, ja, ko):**
- New keys:
  - `list_create_match_buying_label` "Buying only";
  - `list_create_match_buying_desc` "Sale lists only, for when you want to buy, not swap.";
  - `trade_wtb_buying_only` "Buying only, not swapping".
- `trade_browse_help_wtb_list` becomes "A want list open to swaps or buying, or buying only, not linked to a have list on Trade".
- The Mutual help table:
  - the have row's "Either setting" splits into a yes row for swaps settings and a no row for Buying only;
  - a "Sale list × Buying only = Yes" row is added.

## Risks / Trade-offs

- [The Browse match filter `CASE` grows to three arms, run per post entry.] → It uses the same arrays and parameter count plus two more, so it adds no new join.
- [An old tab's For you cache entries hold counts under the old rule.] → The key versions are bumped, so new entries never mix with old ones.
- [Old tabs show a Buying only list as Swaps or buying.] → The note on the list header reads correctly once the tab reloads, and an untouched save keeps it.

## Migration Plan

1. Edit `packages/db/src/schema.ts` and run `db:generate`. This gives the `ADD COLUMN ... DEFAULT true NOT NULL` and the check constraint.
2. With the user's approval, run `db:migrate` on local, then staging, then production before the deploy.
3. Rollback: the column is additive and every row starts true, so old code ignores it. To undo it, a further migration drops the constraint and the column.

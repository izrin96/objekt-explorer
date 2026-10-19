# Design

## Context

- `mutualOf` (`packages/api/src/schemas/trade.ts`) is `Math.min(theyHave, youHave)`. Every Mutual reader goes through it: `countsFit("mutual")`, `mutualRankOf`, `mutualPeople`, and so `getMutualPeople`, `mutualCount`, the Mutual section and Mutual only. The web's `headerSentence` (`apps/web/src/features/trade/person-row.ts`) calls it with `tradeTheyHave` and `tradeYouHave` zeroed.
- `matchCounts` (`lib/trade-person.ts`) already fills the swap counts. `tradeTheyHave` counts matches with `trade: swaps`, which in `recount` means the person's have list answered by a want list of the viewer's open to swaps. `tradeYouHave` counts `trade: ok.some(swaps) && myHaves.trade ok`: the person's want list open to swaps, answered by the viewer's have (not sale) lists. These are the two swap counts the spec names. Since decision 15 they are filled but read by nothing.
- `fetchTradeCandidates` (`services/trade-matches/candidates.ts`) prefilters `"mutual"` with `HAVING` on `a` and `b` (sale included) and orders by `least(a, b)`. It runs before the ownership check, so it is a superset filter and a pre-rank, not the score.
- The `people` output's `counts` is a `MatchCounts`, so the web already receives `tradeTheyHave` and `tradeYouHave`.

## Goals / Non-Goals

**Goals:** one definition of the mutual score, swaps only, read everywhere Mutual is shown or ranked; no change to the one-way counts.

**Non-Goals:** see the proposal. Also not dropping `tradeTheyHave`/`tradeYouHave`, which become the score's inputs.

## Decisions

1. **`mutualOf` reads the swap counts.** `Math.min(counts.tradeTheyHave, counts.tradeYouHave)`. All server readers follow without other edits. *Alternative:* a new `swapCounts` field. Rejected: the fields exist, are filled, and open tabs already parse them.

2. **The web header sentence uses the person's full counts.** `headerSentence` takes `MatchCounts | undefined` and calls `mutualOf(counts)` directly, no zeroing. "You can swap M" then shows the swap score, and a sale-only person falls through to "You have B they want" / "They have A you want". `PersonRow` already passes `person.counts`. A tab open before the deploy keeps its old bundle and its old reading until reload; the server's Mutual membership changes at once, which the Freshness requirement already tolerates for 5 minutes.

3. **The candidate SQL's Mutual prefilter and order use swap counts.** `grouped` adds `a_t` (`they_have AND trade`, a have list on the person's side) and `b_t` (`NOT they_have AND match_have AND trade`, where the second branch's `trade` is `h.on_have`). `HAVING.mutual` tests `a_t > 0 AND b_t > 0`; `ORDER.mutual` becomes `least(a_t, b_t) DESC, a + b DESC`. `ORDER.all` keeps `least(a, b)`, as `trade.forYou` and `personMatches` read it, and `"sum"` stays. Without this, a sale-only person could take one of the 1000 candidate places that a real swap partner needs.

4. **Cache keys bump.** The cached Mutual people and counts change meaning: `trade:mutual-people:5` → `:6`, `trade:mutual-count:5` → `:6`, `trade:foryou:6` → `:7`. `trade:person:5` caches `MatchCounts`, whose fields do not change, so it stays. `trade:oneway-people:3` ranks by the sum, which is unchanged.

5. **Help popover: the Mutual table becomes two rows and one line.** `match-help.tsx` keeps the have-list rows (Swaps only or Swaps or buying: Yes; Buying only: No) and drops the three sale rows for one line, "Sale lists never count toward Mutual." `trade_help_mutual_score` changes to "Someone's mutual score is what you can swap: the smaller of what they have that you want and what you have that they want, have lists only." `trade_help_both_ways` loses its sale-list half. New and changed strings in `en`, `ko`, `ja`. This also shortens the popover, as asked.

## Risks / Trade-offs

- [Fewer people are Mutual; some viewers' Mutual N drops, maybe to 0] → They are still listed under One way under Any. This is the intent.
- [A have list paired with a Buying only want list is still offered under Mutual and now lists nobody] → Kept as a non-goal; Mutual's empty state offers Any.
- [Notifications or other surfaces that say "mutual"] → `mutualOf` has no other caller (checked with grep); the want-list alerts do not read it.

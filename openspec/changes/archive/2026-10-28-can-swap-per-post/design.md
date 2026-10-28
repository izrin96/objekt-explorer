# Design

## Context

The mutual score today is `mutualOf(counts)` (`packages/api/src/schemas/trade.ts`): `min(tradeTheyHave, tradeYouHave)`, both counted over every list on each account. `recount` (`lib/trade-rank.ts`) builds each partner's `theyHaveIWant` and `iHaveTheyWant` matches, each with `slug`, `trade`, `myListIds` and `partnerListIds`, and `matchCounts` (`lib/trade-person.ts`) turns them into `MatchCounts`. Everything that says Can swap reads `mutualOf`: `rankPartners` and `mutualPeople`, `getMutualPeople` / `mutualCount` (`services/trade-matches/mutual.ts`), the people order (`buildPeopleOrder`), `mutualPartnerIds` for the alert worker, `countsFit`, and on the web `matchBand` and `swapThroughRules` (`features/trade/person-row.ts`). `candidates.ts` prefilters and orders Mutual in SQL on pooled swap counts (`least(a_t, b_t)`).

A post is still its lists. On the viewer's side, `pickedSides` (`schemas/list.ts`) already decides what a list's pair is: the list plus a linked list of the other side that takes part. On the partner's side, `postsCte` pairs a have or sale list with its linked want list, and both share one listing state.

See proposal.md for why; the specs for what each surface shows.

## Goals / Non-Goals

**Goals:**
- One per-post swap score, computed once in the recount, that every Can swap reader takes instead of the pooled minimum.
- The pure scoring lives beside its tests; no reader recomputes it.

**Non-Goals:**
- No change to the one-way counts, list counts, rings, near matches, `suggestOffer`, the offer picker, post-card matches or the candidate query's shape beyond carrying each list's link.
- No post table or post id.

## Decisions

**1. Post keys, both sides.** A post key is the id of the pair's offering list (the have list, or the sale list open to swaps). The viewer's keys come from `resolveTradeSides`' lists through `pickedSides`, so the rule for "what is a pair" stays in one place; a list whose `paired` is missing has no key. The partner's keys need `linked_list_id`: `partner_lists` in `candidates.ts` selects it and the candidate carries a `postOf` map (list id → key) for the lists it matched. A partner pair counts only when the linked list is of the other side and swap-capable on the offering half; otherwise no key. Alternative considered: pass whole posts from `postsCte`; rejected, since the matches already carry list ids and only the link is missing.

**2. Swap-only list ids on each match.** Today `myListIds` / `partnerListIds` mix swap and sale lists. `recount` adds `swapMyListIds` and `swapPartnerListIds`, the lists through which `trade` holds (want lists with `matchHave`, the partner's swap-capable haves, and the reverse). Readers of the existing fields (chips, popovers, `matchesThrough`, the picker) are untouched.

**3. `swapScore` is pure.** A new function in `lib/trade-person.ts` takes the two match lists and both `postOf` maps, groups the swap slugs by `(myPost, theirPost)` per direction, and returns the highest `min` over the pairings, plus that pairing's they-have count. `matchCounts` adds them to `MatchCounts` as `swap` and `swapTheyHave`; `mutualOf` returns `counts.swap`. Every reader of `mutualOf` follows with no edit. Alternative: keep `mutualOf` pooled and filter afterwards; rejected, since rankings, order and the count would each need the filter.

**4. Cross-post reads as One way.** `matchBand` returns `swap` when `counts.swap > 0`; when both counts are above zero and both pooled swap counts (`tradeTheyHave`, `tradeYouHave`) are too, the person can only swap across posts, so the band is `oneWay` (no chip); otherwise it stays `noSwap` ("No swap · buy or sell"). `swapThroughRules` reads `swapTheyHave` in place of `tradeTheyHave`, and counts only rule matches inside the counted pairing, which `swapScore` returns as `swapPair` (the viewer's list ids in it and the person's post key, which is that feed post's `id`), so the rules note measures that pairing alone.

**5. SQL prefilter stays pooled.** `candidates.ts`' Mutual `HAVING` and `least(a_t, b_t)` order are a superset of the per-post rule, so they stay as a cheap cut before the ownership check; the recount decides. The `mutual` filter's `countsFit` then drops cross-post people.

**6. Alerts: an unlinked list alerts on swap listings, one way.** `AlertList` gains `swapPair: boolean` (has a link to a list of the other side that can swap with it) and, for a want list, `takesSwaps` (`match_have`), read where the job loads its lists. In `judge`, a recipient list on Can swap with no pair skips the match when it is not a swap (the offer list is Sell only, or the want list doesn't take swaps), skips the two-way question, and records the alert with `match: "any"` so its link opens `match=any`. A paired list keeps today's path through `mutualQuestions`. `mutualPartnerIds` is unchanged: for a paired list `resolveCompareSides` already compares the pair, and the per-post score now applies inside it. Alternatives considered: plain Any for an unlinked list (rejected: Can swap promises no sale listings), never alerting (rejected: the default mode would silence lone lists), a fourth setting (deferred until users ask for one-way swap alerts on every list).

**7. Caches.** The values of `trade:mutual-people`, `trade:mutual-count`, `trade:person` and `trade:people-order` change meaning, and person counts gain fields, so each version goes up by one; `trade:oneway-people` holds no counts that change meaning, but its people come from the same recount, so it goes up too, keeping every ranking from one build.

**8. Help and settings copy.** `match-help.tsx` keeps its sections: the Can swap table edits its two yes rows and adds one no row; Good to know gains a Post row and the Lists row changes. `notification_alert_mutual_desc` adds "inside one of your posts". New and changed strings in `en`, `ko` and `ja`. No new component.

## Risks / Trade-offs

- [Open tabs from before the deploy compute `mutualOf` from the old fields and may still show a Can swap chip for a cross-post person until reloaded] → the feed order and the Can swap list come from the server and are right at once; accepted, as for earlier matching changes.
- [Fewer Can swap alerts for linked lists, since Can swap is the default mode] → intended. Unlinked lists get more: one-way swap listings now alert, sale listings still don't.
- [The pooled SQL cut could keep a cross-post person among the 1000 candidates in place of a per-post one] → the cut is far above real candidate counts today; revisit only if Mutual lists approach it.
- [A partner's list whose linked list is not among their listed lists] → it has no key and counts one way only. The viewer's own pairs count posted or not, since the viewer's lists never need to be listed.

## Notes for whoever applies this

- The `web-trade-browse` requirement "Matches to the signed-in viewer" still says there is no match chip and no popover of matched lists. That sentence is stale: the app has both (`MatchChip`, `MatchedListsChip`), and this change keeps the sentence as it was. Don't remove either from the code to match it.
- The UI target is the mockup at https://claude.ai/artifact/Q8E4wKmQaaYb8JaWsB3QQC: its For you, Browse and ? popover screens, with Option A selected.

## Migration Plan

No database change. Deploy web, API and worker together. The cache version bumps make the first reads rebuild. Rollback is a redeploy of the previous build; the old cache versions are still readable by it.

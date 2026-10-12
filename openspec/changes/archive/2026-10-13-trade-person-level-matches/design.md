## Context

See proposal.md for why. Current state:
- **Browse counts per post.** `assemblePost` (`packages/api/src/lib/trade-feed.ts`) counts each post's own entries against the viewer's `Viewer` index (`services/trade-feed/viewer.ts`) and returns `match: { youHave, youWant, haveListIds, wantListIds }`. The same `match` drives Only matches (`matchesViewer` in `browseFeed`) and the rings come from `previewSide`.
- **For you counts per person.** `fetchTradeCandidates` (`services/trade-matches/candidates.ts`) aggregates in SQL over the partner's discoverable have, sale and want lists, idle or not, pre-ranks by `least(a, b)` and keeps `CANDIDATE_LIMIT = 200`. `computeTradeMatches` then judges ownership (`fetchHoldings`, `collectionVerdict`), runs `recount` and `rankPartners` (`lib/trade-rank.ts`) and keeps `PARTNER_LIMIT = 50`. The result is cached for 5 minutes under `trade:foryou:${userId}:${version}:${market}:${filter}:${list}`; `tabCounts` and `listMatchCount` read the same entry.
- **Sale lists already split in both.** `Viewer.tradeHave` / `saleWant` and `MyHaves.trade` exist so a trades-only want list never matches a sale list. Mutual itself, though, is `Math.min(theyHave, youHave)` in `MatchChip` and in `rankPartners`, over totals that include sale lists. Mutual only goes through `filterFits` (`schemas/trade.ts`) on `{ have, want }` booleans.
- **Browse's link.** `browse-view.tsx` reads `forYouOptions("mutual")` and passes `mutual` to `BrowsePost`, which shows the chip and the See in For you link even when the post's own counts are one way.
- **No-lists case.** `canMatch` (any list passing `canBeOnTrade`) hides the Only matches switch and `MatchHelp`. The Post a list dialog opens through `setPostOpen(true)` in `browse-view.tsx`.

## Goals / Non-Goals

**Goals:** one computation of a person's counts, used by both tabs; one definition of mutual, used by the server's ranking and filters and by the chip; Browse inputs unchanged, outputs additive.

**Non-Goals:** caching Browse's person pass up front; changing Only matches, rings or the facet narrowing; changing For you's limits (50 partners, 200 candidates).

## Decisions

1. **Mutual is defined once, in `schemas/trade.ts`.** `MatchCounts = { theyHave, youHave, tradeTheyHave, tradeYouHave }`. `mutualOf(counts) = Math.min(tradeTheyHave, tradeYouHave)`, and `countsFit(filter, counts)` is `mutualOf(counts) > 0` for `mutual` and `filterFits(filter, { have: youHave > 0, want: theyHave > 0 })` otherwise. Both live beside `filterFits`, so the server and `MatchChip` import the same function. `filterFits` stays as it is: For you's Compare with uses it to decide which kinds of list a view can take, which trades-only doesn't change.
   *Alternative:* the server sends `mutual` and the chip reads it. That works too, but two derived numbers (sum for ranking, mutual for the chip) are easier to keep straight when the inputs travel and one function reads them.

2. **`recount` marks trade matches.** `Match` gains `trade: boolean`:
   - they have, I want: the collection still counts when only the partner's have-list entries are judged (`collectionVerdict` over the entries whose list isn't a sale list returns `ok`);
   - I have, they want: `myHaves.trade.get(slug)?.verdict === "ok"`.

   `Candidate.theyHave` entries gain `sale: boolean`, read from the candidate SQL (decision 3). A new pure `lib/trade-person.ts` exports `matchCounts({ theyHaveIWant, iHaveTheyWant })` (distinct collections per direction, and those with `trade`) and `viewerListIds(...)` (the user's lists behind each direction, as `matchedLists` in `partner-row.tsx` builds them today). `rankPartners` sorts on `mutualOf(matchCounts(p))`, then the sum, then the change, and filters with `countsFit`. `trade-person.test.ts` and the updated `trade-rank.test.ts` cover: a have-list match is trade, a sale-only match isn't, a collection on both a sale and an owned have entry is trade, a collection on a have and a sale entry that counts only through the sale entry (the have entry's objekt no longer owned) isn't trade, my sale-only "you have" isn't trade, Mutual only drops a sale-only partner, ranking puts trades-only 1 ⇄ 1 above sale 3 ⇄ 2, and the one-way filters still count sale lists.

3. **The candidate SQL pre-ranks on trades.** In `candidates.ts`, `matched` gains a `trade` column (`p.list_type_new = 'have'` for they-have rows, `h.on_have` for they-want rows), the they-have JSON array gains the sale flag, and `grouped` adds `a_t` and `b_t`. `HAVING` for `mutual` tests `a_t > 0 AND b_t > 0`; `ORDER` for `all` and `mutual` is `least(a_t, b_t) DESC, a + b DESC`. Without it, partners matched mostly through sale lists could fill the 200-candidate pre-rank and push trades-mutual partners out before ownership is checked.

4. **Browse reuses For you's pipeline, scoped to the page's owners.** `computeTradeMatches` is split: a `recountPartners(userId, sides, filter, ownerIds?)` runs `fetchTradeCandidates` (with an optional `ownerIds` filter, `l.user_id = ANY(...)` in `partner_lists`), the user's entries, `fetchHoldings` and `recount`; `computeTradeMatches` keeps ranking, hydration and caching on top. `browseFeed` calls a new `personMatches(viewerId, ownerIds)` (`services/trade-matches/person.ts`) once per page with `resolveTradeSides(viewerId, undefined, "all")` and filter `all`, concurrently with the users, addresses and reputation reads, and only when the viewer has a list that takes part. Each post gains `person: { counts, haveListIds, wantListIds }` for its owner, or no `person` when the owner matches nothing or the viewer is signed out. Uncached for now: the scoped SQL reads at most 24 owners' lists.
   - *Alternative:* look owners up in For you's cached `all` result. It holds at most 50 partners of 200 candidates, so an owner past the cap would get no chip, and "no match" and "past the cap" would look the same.
   - *Alternative:* count the person in Browse with the `Viewer` index across the owner's lists. It would be a second implementation of For you's rules (idle lists, sale rules, ownership), free to drift.

5. **`match` stays; `person` is added.** `match` keeps driving Only matches on the server, and old bundles read it. `browse-post.tsx` moves the chip and popover to `person`. Inputs are unchanged, so an open tab sends what it sent and it validates; after the deploy an old bundle ignores `person` and the For you `counts`, showing its per-post chip until reload.

6. **For you sends `counts`.** Each partner in `computeTradeMatches`'s result gains `counts: matchCounts(partner)` and each `Match` its `trade` flag. The cache value changes shape, so the key gains a version segment (`trade:foryou:2:…`); otherwise the first five minutes after the deploy would serve entries without the new fields. `tabCounts` and `listMatchCount` read the same key. `partner-row.tsx` passes `partner.counts` to the chip and builds the popover from it.

7. **The chip words its counts.** `MatchChip` takes `counts` and the popover, computes `M = mutualOf(counts)` and picks one of four messages: `trade_match_they_have`, `trade_match_you_have` (both exist), a new `trade_chip_both`, and `trade_chip_mutual` reworded to "Mutual {mutual} · they have {theyHave} · you have {youHave}". The text is the accessible name, so the `aria-hidden` text and `sr-only` copy go; `trade_chip_counts` and `trade_match_mutual` are removed if nothing else uses them. Tone stays `toneChip("progress")` when M > 0, neutral otherwise. `MatchedLists` takes `{ counts, haveListIds, wantListIds }` and keeps its headings.

8. **Browse's link needs both.** `BrowsePost` takes `forYouMutual` (the owner is in `forYouOptions("mutual")`, the existing query) and shows See in For you only when that holds and `mutualOf(person.counts) > 0`. Without the query the link could promise a row For you doesn't list (past its 50); without the count it could contradict the chip while For you's cache lags.

9. **The want-only WTT hint is derived in the browser.** `post.tag === "wtt" && post.sides.every((side) => side.role === "want")` adds a muted `text-xs` note, `trade_wtt_trades_only` ("Trades only, not buying"), after `TagBadge` in the byline. No API field: the tag and the sides already say it.

10. **The prompt takes the switch's place.** In `browse-view.tsx` the Only matches slot becomes three-way: `canMatch` keeps the switch and `MatchHelp`; signed in without `canMatch` shows a muted line, `trade_browse_matches_need_list`, with a small outline Post a list button calling `setPostOpen(true)`; signed out shows `trade_browse_matches_sign_in` with a Sign in link to `/login?redirect=/trade`. It reuses the existing `Button` and `Link`; no new component. The test stays `canMatch`, which is what matching uses: a list that takes part (any want list, or a bound have or sale list), on Trade or not. The committed dialog already handles both cases a viewer can land in: an empty state linking to `/list`, and an unbound list's disabled switch with the reason.

11. **Help copy.** `trade_match_help_mutual` (shown in both tabs' help) becomes "Mutual: the smaller of the two counts, trades only. Sale listings count one way, not toward mutual." in en, ja and ko.

## Risks / Trade-offs

- [Each signed-in Browse page runs one more candidate query, an entries read and an indexer holdings check] → scoped to the page's owners and skipped for viewers with no list; measure the feed's latency in the browser check, and if it's slow, cache the pass for 60 s on viewer version, market version and the owner set.
- [Browse's counts are fresh while For you's are cached up to 5 minutes] → they can differ right after a list edit; the spec allows For you's caching delay, and the link rule (decision 8) never shows a link the chip contradicts.
- [Mutual drops for people who traded through sale lists] → expected by the decision; the help line says so, and the one-way counts still show their sale matches.
- [A person's counts include their idle lists, which Browse doesn't list] → For you counts them too; the popover names the viewer's lists, and each post links to its own lists.
- [Longer chip text] → the list line already wraps (`flex-wrap`); check 390 px in the browser.
- [`rankPartners` tests use bare slug arrays] → they move to `Match`-shaped fixtures with `trade`.

## Migration Plan

Deploy `packages/api` and `apps/web` together (one web image). No database change. The For you cache key bump leaves old entries to expire on their 5-minute TTL. Roll back by reverting the commit; the old key is read again and its entries were never overwritten.

## Open Questions

- The prompt shows when the viewer has no list that takes part in matching (no want list, no bound have or sale list), not when they have no list on Trade, because matching never reads Show on Trade. A viewer whose lists are all off Trade still gets matches and the switch. If the prompt should follow Show on Trade instead, only its condition and copy change.
- Hint wording settled as "Trades only, not buying": sale lists can be priced in any currency, so "no COMO" could be misread as "no Cosmo currency".

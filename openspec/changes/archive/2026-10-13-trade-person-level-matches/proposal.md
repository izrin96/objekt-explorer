## Why

Browse and For you disagree on "mutual". Browse counts each post alone, so a person whose have and want lists aren't linked shows one-way chips ("1 ⇄ 0", "0 ⇄ 1") on two posts, while both link "See in For you" as mutual because For you counts the person. The chip is cryptic, and mutual counts sale listings, which aren't trades. A want-only WTT post reads oddly, and a viewer with no list that can match sees Only matches vanish without a reason.

This is change 1 of 2. Change 2 folds For you into Browse; this one ships alone.

## What Changes

- **Counts belong to the person.** Every post by a person shows that person's counts against the viewer's lists, the same counts as their For you row.
- **Mutual counts trades only**: the smaller of the collections on their have lists that the viewer's want lists ask for, and the collections on the viewer's have lists that their want lists ask for. Sale lists still count one way ("They have 2 you want"), never toward mutual. For you ranks by this score, Mutual only keeps it, and its help line stops saying sale listings count.
- **A worded chip**: "They have 2 you want", "You have 1 they want", both joined, or "Mutual 1 · they have 2 · you have 1".
- **See in For you** shows only when the chip is mutual and For you lists the person under Mutual only.
- **Want-only WTT hint**: "Trades only, not buying" beside the WTT tag of a post with only a want side.
- **Prompts instead of a missing switch**:
  - signed in with no want list and no bound have or sale list: a line saying matches need one, with Post a list;
  - signed out: a line inviting sign-in to see matches.
- **Only matches stays per post**: it keeps posts holding an objekt that matches the viewer, narrowed and ringed as today.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-trade-browse`: "Filters" (Only matches per post, chip per person), "Matches to the signed-in viewer" (person counts, trades-only mutual, link rule, prompts), "Trade card" (worded chip, WTT hint), "Trade colours" (chip examples).
- `web-trade-for-you`: "Both directions and mutual-first ranking" (trades-only score, worded chip), "Filters" (Mutual only).

## Routes

`/trade` (Browse) and `/trade/for-you` (For you). The list header's Find matches count follows the new Mutual only rule.

## Non-goals

- A Matches control (Off / Any / Mutual) or Compare with on Browse.
- A person sheet, retiring For you, merging the tabs (change 2).
- A swap feature built on mutual.
- Changing what Only matches, the facet filters or the rings pick.
- No database change. Inputs are unchanged; outputs only gain fields.

## Impact

- `packages/api`:
  - new pure `lib/trade-person.ts` with tests;
  - `schemas/trade.ts` (shared `mutualOf`);
  - `lib/trade-rank.ts` (trade matches, ranking);
  - `services/trade-matches/` (candidate SQL, owner-scoped pass in a new `person.ts`, cache key);
  - `services/trade-feed/index.ts` (posts gain `person`);
  - `listMatchCount` and `tabCounts` read the same cache, so a paired list's mutual count can drop.
- `apps/web/src/features/trade/`: `match-chip.tsx`, `browse-post.tsx`, `browse-view.tsx`, `partner-row.tsx`, `matched-lists.tsx`.
- en/ja/ko messages.

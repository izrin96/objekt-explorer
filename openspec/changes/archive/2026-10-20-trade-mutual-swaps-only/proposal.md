# Proposal

## Why

Mutual says "You can swap N" and Mutual only lists WTT posts only (since 2026-10-15), yet the mutual score still counts sale lists (decision 15 of the archived `trade-merge-for-you-into-browse`). A person matched both ways only through sale lists reads "You can swap 1" and counts in Mutual N, but never appears under Mutual only. Two sales are not a swap, so the score, the count and the list disagree. This change reverses decision 15: Mutual means a swap.

## What Changes

- The mutual score SHALL be the smaller of the two **swap** counts: the person's have lists against the viewer's want lists open to swaps, and the person's want lists open to swaps against the viewer's bound have lists. Sale lists, the person's or the viewer's, never count toward it.
- The one-way counts ("They have N you want", "You have N they want"), the per-list counts and the rings are unchanged: sale lists keep counting there, so a person matched only through sale lists reads "You have N they want" (or "They have N you want") and is listed under One way.
- Everything that reads the mutual score follows: the header sentence, Mutual only, Mutual order, the Mutual section under Any, Mutual N, and the list header's Find matches count.
- The help popover's "What counts toward Mutual" table shrinks to the swap rows and says sale lists never count toward Mutual.
- Spec catch-up from `8ec9482c` and `5ce50573`: matching ranks up to 1000 candidates, not 200, and a person who only moved within a ranking between loads is still listed.

Routes: `/trade/for-you` (Mutual only, Any's sections, Mutual N), `/trade` (header sentences), and the list header's Find matches on `/@{nickname}/{list}`.

## Non-goals

- No change to which lists match one way, to Open to, or to the Post type rules.
- Compare with keeps offering a have list paired with a Buying only want list under Mutual; it can now list nobody, and shows Mutual's empty state.
- No new count or second ranking for sale matches (decision 15's rejected alternative stays rejected).
- `trade.forYou` and `listMatchCount`, kept only for open tabs, follow the new score but get no other change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-browse`: Matches to the signed-in viewer (the mutual score leaves sale lists out), Matches and Compare with (the 1000-candidate catch-up, the help text, the sale-only scenarios), Buying only note (the Mutual help table).

## Impact

- `packages/api`: `mutualOf` (`schemas/trade.ts`) reads the swap counts that `matchCounts` already fills (`tradeTheyHave`, `tradeYouHave`); the candidate SQL's Mutual prefilter and order (`services/trade-matches/candidates.ts`); cache key versions for the Mutual people, Mutual N and For you caches.
- `apps/web`: `headerSentence` (`features/trade/person-row.ts`) takes the swap counts from the person's counts; the help popover (`features/trade/match-help.tsx`) and its `en`/`ko`/`ja` strings.
- No schema, migration or `/rpc` input change. The `people` output already carries `tradeTheyHave` and `tradeYouHave`.

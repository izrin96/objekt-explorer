## Context

See proposal.md for why. Current state:
- `features/trade/trade-tabs.tsx` renders three `TabsTab` links with labels only.
- `trade.forYou` returns `{ checkedAt, partners[].updatedAt, ... }` through `getTradeMatches`, cached for 5 minutes per user, filter and list (`trade:foryou:<user>:<version>:<market>:<filter>:<list|all>`). The web app shows neither time.
- `offer.mine` (`services/offer/trades.ts` `fetchMine`) builds Needs you / Waiting / In progress / History with row-returning queries. No count read exists.
- `TrustLine` renders "31 verified · 100% · since Mar 2025" with `tabular-nums` in the body font. O/T numbers (`offerNo`, `tradeNo`) and serials (`itemLabel`) are strings placed in body text.
- Browse `browseSearchSchema` has only `type`, `slug` and `matches`. `toBrowseInput` scopes to the selected artists unless `slug` is set. That's the behaviour the corrected Filters requirement describes.
- The offer picker's `NO_FILTERS.matchOnly` is `false` for both pickers.
- Want-list matching uses `offerMatchesWantSql` in `services/trade-lists.ts`, applied in For you candidates, the Browse feed and viewer matches, and the worker's want alerts.

## Goals / Non-Goals

**Goals:** counts that cost at most one cached matches read plus two indexed counts; freshness from data already returned; one place that decides the mono styling for each data kind.

**Non-Goals:** no live push for counts, and no change to the matches cache.

## Decisions

1. **`trade.tabCounts`, an authed procedure with no input** (an empty `z.object({})`, so it can grow later).
   - `forYou`: `getTradeMatches(userId, await resolveTradeSides(userId, undefined, "all"), "all")` then `.partners.length`. It reads the same cache entry as For you's default load, so opening For you right after costs nothing extra.
   - `mine`: one SQL with two `count(*) FILTER` subqueries, open unexpired offers `to_user_id = me` and in-progress trades where the user is a party. These match the Needs you and In progress predicates in `fetchMine`, so move those predicates into named helpers shared by both.
   - Output: `{ forYou: number, mine: number }`.
   *Alternative:* derive counts on the client from the For you and My trades queries. That needs both pages' data loaded on every Trade tab.
2. **The client query lives in `trade-tabs.tsx`.** `useQuery(orpc.trade.tabCounts.queryOptions({ enabled: signedIn, staleTime: 60_000 }))`. It isn't in a route loader, so a slow count never blocks a Trade page. Counts render only once data is there, with no skeleton, so the tab bar doesn't jump. Each count is a `<span className="font-mono text-xs tabular-nums text-muted-foreground ms-1.5">`, with `aria-hidden` on the visual and the count included in the tab's `aria-label` through a message. Moving between tabs refetches if the data is stale. Accepting or sending an offer already invalidates `offer.mine`, and the same mutation hooks also invalidate `trade.tabCounts`.
3. **Freshness uses the existing relative-time helper.** Browse's post time already uses `relativeTime(ms, now)` with a client `now`. Reuse it. "Ownership checked" goes in the For you summary line in `for-you-results.tsx`, and "updated" goes after `TrustLine` in the `PartnerRow` header from `trade-card-compact-rows`. Both are `<time dateTime=…>` elements in `font-mono`, rendered once hydrated, following Browse's `suppressHydrationWarning` pattern.
4. **Mono through small typed helpers, not ad-hoc classes.** Add a `Mono` component (`<span className="font-mono tabular-nums">`) in `features/offers/` and use it wherever a formatter's output is data: `offerNo`, `tradeNo`, the serial part of `ItemLabel`, `topupText`'s amount, progress "n/m" and section counts. `TrustLine` wraps its two numbers in `Mono` and keeps the words in the body font. A component, rather than changing `format.ts` to return markup, keeps the formatters plain strings, which notifications and `aria` text also use.
5. **Spec-only corrections need no code.** For Filters, the switch default and the want-list option, the code already behaves as the corrected requirements say. The tasks only verify that.

## Risks / Trade-offs

- [The For you count runs the full match on a cache miss, on every Trade page] → it's the same work For you does, cached for 5 minutes per user, and `staleTime` on the client stops a refetch on every tab switch. If the cost shows up in traces, the count can come from a cheaper cached field later without changing the spec.
- [The count is up to 5 minutes behind For you's live result] → the spec allows this.
- [Mono everywhere gets busy] → it's limited to the listed data kinds. Names and sentences stay in the body font.

## Migration Plan

No migration. It adds a new procedure only. Deploy as usual. Rollback is a revert.

## Open Questions

- Whether to change `lists.match_sale`'s database default to `false`, and whether to move existing want lists to Trades only. Either is a separate migration the user decides on. The spec here describes today's behaviour, where older lists keep Trades and sales.

# Design

## Context

Which listings Market counts is decided once, in `countedListings` (`packages/api/src/services/market/aggregate.ts`), used by the summary, the stats, the listing table and the hourly price snapshot. It filtered per row (sale list, discoverable, collection set, seller not sanctioned, profile still held), so nothing compared one listing with another.

## Goals / Non-Goals

**Goals:** one rule, in the same place, that every Market read and the snapshot inherit; per-collection reads stay index-driven.

**Non-Goals:** holdings checks against the indexer; any change to output shapes or the web.

## Decisions

- **A correlated `NOT EXISTS` in `countedListings` (`cheapestOfCopy`)**: a listing counts unless the same seller has another counted listing of the same `objekt_id` that ranks before it. The rank is the row `(tier, usd, newer created_at, higher id)`, compared as a Postgres row value, which gives a strict order, so exactly one listing per seller and copy survives. Per-collection reads probe `list_entries_objekt_idx` for each row. Considered a `ROW_NUMBER()` window over a subquery: one pass for the summary, but every Drizzle builder (summary, stats, both listing reads, snapshot) would read from a derived table; the anti join keeps them as they are. Keep the hide-serial test inside the `NOT EXISTS`: an `OR` outside it turned the anti join into a subplan per row (9.7 s on the summary).
- **Rank by USD**: one seller's lists can differ in currency, so the rule takes the rate table. `countedListings` and `usdPriceExpr` now take it, and `usdPriceExpr` takes the currency and price columns so the inner query can use aliased tables.
- **Hide-serial listings never merge** (owner's choice, 2026-11-29): when a hidden listing and a visible one of the same copy merge, whichever survives tells which copy the hidden one is, by comparing the visible list page with Market. Both sides of the comparison must show serials.
- **One jsonb lookup for USD** (`usdPriceExpr`): the rate table holds about 200 currencies, and the old CASE evaluated them in turn for every row, on both sides of each duplicate pair. `price * coalesce(rates ->> upper(currency), 1)` gives the same values (EXCEPT over all 13,563 collections' summary rows: 0 differences) and cut the summary from 5.6–7 s to 0.9–1.7 s.
- **Per seller (`lists.user_id`), not per profile**: two lists under different profiles of one account are one seller.
- **The sale-list rules are shared** (`shownSaleList`) by the outer and inner query, so a hidden or non-sale list never hides a shown listing. Sanctions are per user, the same on both sides, so the inner query skips them. The inner query also needs a collection on the duplicate, or a duplicate Market never counts could hide one it does.

## Risks / Trade-offs

- [The rule adds a second scan of `list_entries` to the summary] → offset by the jsonb lookup (net 3.2–4.0 s to 0.9–1.7 s); the summary is served from its Redis copy and the snapshot runs hourly.
- [Sellers can drop when the kept listing's list has no profile; the grid's newest-listing order ignores dropped listings] → accepted; both follow from counting the kept listing only.
- [The tie keeps the newest listing, while the listing table's price sort would show the lower id first] → only among one seller's listings of one copy, where just one shows anyway.
- [The listing count in price history drops on the deploy day] → expected; past records stay as they were (Daily price history).
- [Floating-point USD ties] → both sides use the same expression, and the `created_at` and `id` terms break any tie.

## Migration Plan

No migration. Deploy the web and the worker (the snapshot job imports `aggregate.ts`). Rollback is a revert; the next recording writes the old counts again.

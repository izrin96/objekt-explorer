# Proposal

## Why

Market counts a listing, not a copy. A seller who puts one objekt in two sale lists shows as two listings, so a collection reads "(2)" when one copy is for sale. A user reported it on Nakyoung d207 and sees it on many collections. On production (read-only, 2026-11-28), 5,726 copies are listed more than once; the busiest collection shows 590 listings for 329 seller-and-copy pairs. The count overstates supply, and the duplicates also weigh the median and the daily history.

## What Changes

- When one seller lists the same copy in several discoverable sale lists, Market keeps only that seller's cheapest listing of it: a priced listing before a QYOP one, a QYOP one before an unpriced one, the lowest USD price among priced ones, and the newest on a tie.
- The rule applies to every Market figure: the collection grid's count and floor, the listing table, the drawer's Market tab figures (listings, floor, median, highest, sellers) and the daily price history recorded from now on.
- Different sellers of one copy each keep their listing, and listings in hide-serial lists never merge: which one survived would tell which copy the hidden listing is.
- Side effects: the drawer's Sellers figure counts the profiles of the kept listings, so a seller whose cheapest copy sits on a list with no profile can drop out of it; and re-listing a copy the seller already sells cheaper no longer moves the grid's newest-listing order.
- The listing stays on its own list page; only Market's reads change.

Routes: `/market` (grid), the drawer's Market tab, `GET /api/v1/market/{collectionSlug}/stats` and `GET /api/v1/market/{collectionSlug}/history`.

## Non-goals

- Stale listings: a copy listed by someone who no longer holds it (457 copies are listed by more than one seller today). Checking holdings against the indexer is a separate change.
- Showing a merged row's other listings ("+1 more listing") or a "same copy" mark.
- Rewriting past days' price history.
- Trade v2's Market reads, which follow their own change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-market`: adds the rule that a seller's copy counts once, at its cheapest listing, across Market's figures and the daily price history; Daily price history and Most listed ordering name it among their counting rules.

## Impact

- `packages/api/src/services/market/aggregate.ts`: the shared counting rule every Market read and the hourly snapshot use.
- `packages/api/src/services/market/listings.ts`: passes the rate table to the rule.
- `usdPriceExpr` converts through one jsonb lookup instead of a CASE over the ~200 currencies of the rate table. Same results (checked on production), and it pays for the new rule.
- No schema, input or output shape change; `/rpc` and `/api/v1` keep their shapes. The cached summary (`market:summary:2`) keeps its key, since its shape does not change.
- Production, read-only, full rate table (2026-11-29): the all-collections summary takes 0.9–1.7 s, down from 3.2–4.0 s; the busiest collection's stats 16–70 ms, from about 16 ms.

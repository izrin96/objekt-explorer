## Why

`/market` can sort by Most listed (`sort=supply`), but it can't narrow the grid to what went on sale recently, so "what's new on the market this week" means scrolling Recently listed by eye. Most listed also leaves ties in catalogue order, so two collections with the same count swap places for no visible reason.

## What Changes

- **Listed filter on `/market`.** A select beside Floor price offers Any time, Last 24 hours, Last 7 days and Last 30 days, carried as `listed=24h|7d|30d`.
  - It keeps a collection whose newest live listing was added within the window.
  - It combines with every other filter (Priced only, Floor price, facets, Compare).
  - It shows an active chip, "Listed: Last 7 days", and Reset clears it.
  - On phones it moves into the Filters sheet and counts toward the sheet button's badge, as Floor price does.
- **Most listed ties get a fixed order.** Equal counts order by floor price (cheapest first, unpriced last), then the newest listing, then the collection slug, the same in both directions.
- The listing total under the grid still sums every live listing of the collections shown. Most listed still counts listings, not sellers.
- An unreadable `listed` value is ignored. On any other surface `listed` filters nothing and shows no chip, though it still counts as a filter for Reset.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-market`: adds "Listed-within filter" and "Most listed ordering". "Priced collection grid" is unchanged.

## Routes

`/market` only. `listed` joins the filter parameters every filtering route shares, so the same parameter parses on `/`, profiles, lists and `/trade`. It filters nothing there, because their rows carry no listing time.

## Non-goals

- Any server, `/rpc` or `/api/v1` change: `market.summary` already returns each collection's listing count and newest listing time.
- Sorting or counting by distinct sellers.
- Per-window listing counts, such as "3 listed this week".
- A new sort value or a `mostListed` alias for `sort=supply`.
- Defining "listed" as when a list was put on Market. It is when the listing was added (see design).

## Impact

- `apps/web/src/features/filters/`:
  - new pure `listed-window.ts` with `listed-window.test.ts`;
  - `search-schema.ts` gains `listed`;
  - `filter-utils.ts` applies the window in `filterObjekts` and moves the Most listed comparison into an exported `compareSupply`, with a new `filter-utils.test.ts`;
  - `active-chips.tsx` gains the Listed chip.
- `apps/web/src/features/market/`: new `filter-listed.tsx`; `market-view.tsx` adds it to `extras`.
- `apps/web/messages/{en,ko,ja}.json`: five `filter_listed*` messages.
- `apps/web/src/components/layout/changelog.tsx`: one line.
- Sibling `market-price-history` moves `market.summary`'s query into `packages/api/src/services/market-aggregate.ts` and edits the drawer's Market tab. This change touches neither, so the two only meet in the message files.

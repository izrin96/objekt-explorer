## Why

The drawer's Market tab shows today's floor, listing count and sellers, and nothing about where the price was yesterday or last month. A collector can't tell whether a floor is cheap for that collection, and the data to answer it is lost every day because nothing records it. Recording starts the day this ships, so it should ship before any later market work.

## What Changes

- **One floor definition.** The floor rules (sale lists, discoverable, a collection slug, seller not trade-blocked or banned, prices converted to USD through the rate table) move into one shared server module. Market's summary, stats and listings and the new snapshot job all read it. No behaviour change.
- **Daily price history.** A new table holds one row per collection per UTC day: floor, median, listing count and priced count, in USD. A worker job writes today's rows every hour; the last run of the day stands. Collections with no priced listing get no row. Past days are never rewritten.
- **`market.stats` gains `medianPrice` and `maxPrice`**, both nullable.
- **`market.priceHistory`**: a collection's daily points for 7 days, 30 days, 90 days or all, plus when tracking began and how many days it holds.
- **Market tab**:
  - five figures: Floor, with its 30-day change, then Listings, Sellers, Median and Highest;
  - a 30-day sparkline with a History toggle;
  - a chart with a range toggle, plotted in the viewer's currency, with gaps shown as gaps.
  - On day one it shows live figures and says when tracking started.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-market`: adds "Daily price history" (what a day's row records and when it is written) and "Price history chart" (the chart, its ranges, day one, gaps).
- `web-objekt-browser`: "Objekt drawer" (the Market tab's figures, change and sparkline).

## Routes

The objekt drawer's Market tab, wherever the drawer opens (`/`, `/market`, profiles, lists). `/rpc` gains `market.priceHistory`. `/api/v1/market/{collectionSlug}/stats` gains the two new fields, since `openApiRouter` mounts `market.stats`; `market.priceHistory` is not mounted there.

## Non-goals

- Backfilling days before the first snapshot.
- A `collection_market_stats` table or any precomputed summary.
- Most listed sort and the Listed window filter on `/market` (a separate change).
- `market.priceHistory` on `/api/v1`.
- History per currency: rows are USD, plotted at today's rate.
- Telling "nothing listed that day" apart from "the job didn't run".

## Impact

- `packages/db`: `collection_price_history` table and one new migration (applied by the user).
- `packages/api`:
  - new `services/market-aggregate.ts`, used by `routers/market.ts`;
  - new pure `schemas/price-history.ts` with tests (in `schemas/`, not `lib/`: the web build denies client imports of the rest of `packages/api/src`);
  - `schemas/market.ts` (stats fields, history input and output);
  - `market.priceHistory`.
- `apps/worker`: new `job/snapshot-price-history.ts`, registered hourly in `src/index.ts`.
- `apps/web`:
  - `features/objekt/drawer/market.tsx` and `features/objekt/queries.ts`;
  - new files in `features/market/`: `price-history-chart.tsx`, `price-history-rows.ts`, `price-sparkline.tsx`, `price-delta.tsx`;
  - en/ko/ja messages.
- `packages/api/AGENTS.md`, `apps/worker/AGENTS.md`.

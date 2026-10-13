## Context

See proposal.md for why. Current state:
- **The floor is computed in the router.** `packages/api/src/routers/market.ts` holds `usdPriceExpr(rates)` (a `CASE` over `upper(lists.currency)` per rate code plus `CURRENCY_ALIASES`, `ELSE` the raw price), `listingsWhere(slug)` (sale, discoverable, `notTradeSanctioned`, slug equals) and `fetchMarketSummary()`, whose `WHERE` repeats those rules with `isNotNull(collectionSlug)` instead of a slug match. `market.stats` and `findListings` (behind `marketListings` and `listingsForViewer`) read `listingsWhere` and `usdPriceExpr`; `market.summary` caches `fetchMarketSummary` for 60 s under `market:summary:${marketVersion()}`.
- **Rates.** `currency_rates` has `code` as its primary key, one row per code. `getUsdRates()` (`services/currency-rates.ts`) reads it through the Redis key `currency-rates` (1 h), which `updateCurrencyRates` deletes after each daily refresh. With no rates `usdPriceExpr` returns the raw price and logs a warning, so a floor computed then is in mixed currencies.
- **`notTradeSanctioned`** (`services/safety.ts`) excludes active `trade_block` and `ban` sanctions.
- **`/api/v1`.** `openApiRouter` (`routers/index.ts`) mounts the market procedures by name: `summary`, `marketListings`, `rates`, `stats`. `market.stats` is public there, so its output is a public contract. A procedure left out of that map is `/rpc` only.
- **Worker.** `apps/worker` depends on `@repo/api` and already imports `services/safety`, which loads `services/redis` and the API's `serverEnv`. Jobs register in `src/index.ts` with `safeRun`, a startup run, then `cron(...)`; jobs that write the indexer sit inside `if (indexerWrites)`. Three jobs run at `0 * * * *`.
- **Drawer.** `features/objekt/drawer/market.tsx` renders `StatRow` (`./stat-row.tsx`, a local component, `detail?: string`) with Floor, Listings and Sellers in `grid-cols-3`, from `marketStatsOptions` in `features/objekt/queries.ts`. Prices go through `useCurrency()` (`fromUsd`, `formatUsd`). `features/profile/progress/member-progress-chart.tsx` draws recharts through `components/ui/chart.tsx`. Nothing in `apps/web/src` renders a change or trend pill today.

## Goals / Non-Goals

**Goals:** one SQL definition of a listing that counts and of its USD price, used by every market read and the snapshot; history writes that are idempotent per hour; a history read cached until the next snapshot.

**Non-Goals:** changing `market.summary`'s output (it is `/api/v1/market`); reading history anywhere but the drawer; storing `updated_at` or the rates used per row.

## Decisions

1. **`services/market-aggregate.ts` owns the floor rules.** It exports:
   - `usdPriceExpr(rates)`, moved unchanged, warning included;
   - `countedListings()`: sale list, discoverable, `collection_slug IS NOT NULL`, `notTradeSanctioned(lists.user_id)`;
   - `pricedUsd(rates)`: the `CASE` that is NULL for QYOP or unpriced entries, else `usdPriceExpr`;
   - `fetchMarketSummary(rates)`, the summary select on `countedListings()`, output unchanged;
   - `fetchPriceSnapshot(executor, rates)`: per slug `count(*)`, `count(pricedUsd)`, `min(pricedUsd)` and `percentile_cont(0.5) WITHIN GROUP (ORDER BY pricedUsd)`, each cast to `float8`/`int`, `HAVING count(pricedUsd) > 0`. The executor is `db` or a transaction.

   It imports `db`, the schema and `services/safety` only, never `getCache` or `marketVersion`: caching stays in the router. The router's `listingsWhere(slug)` becomes `and(countedListings(), eq(collectionSlug, slug))`, so stats, both listings reads and the summary share one filter. Adding `IS NOT NULL` beside a slug match changes no result. `market.summary` reads `getUsdRates()` inside the cache closure, and again in the Redis-unavailable fallback, so a cache hit costs no rate read.
   - *Alternative:* port upstream's `latest_rates` CTE with an inner join on `currency`. Rejected: our table has one row per code already, and an inner join drops aliased codes (`WON`, `RMB`…) and lists whose currency is NULL, both of which `usdPriceExpr` prices today.
   - *Alternative:* have the job call `fetchMarketSummary`. It has no median and no priced count, and its shape is a public contract, so the job gets its own select over the same pieces.

2. **`market.stats` gains `medianPrice` and `maxPrice`** (`z.number().nullable()`), as `percentile_cont(0.5) WITHIN GROUP (ORDER BY pricedUsd)::float8` and `max(pricedUsd)::float8`. Both aggregates skip NULLs, so they ignore QYOP and unpriced rows and are NULL when nothing is priced, like `floorPrice`. The output is additive on `/rpc` and on `/api/v1/market/{collectionSlug}/stats`; `documented()` describes the new fields.

3. **`collection_price_history`** in `packages/db/src/schema.ts`:
   - columns: `collection_slug varchar(255)`, `date date` (string mode, UTC day), `floor_usd real`, `median_usd real`, `listing_count integer`, `priced_count integer`, all NOT NULL;
   - primary key `(collection_slug, date)`, which serves the per-collection read;
   - index on `date`, for the job's same-day delete.

   Every row has a priced listing, so floor and median are never NULL. `real` matches `list_entries.price`. No foreign key: collections live in the indexer database. The migration comes from `db:generate` and only adds a table, so it is safe before the deploy; the user applies it.

4. **Pure `packages/api/src/schemas/price-history.ts`** with `price-history.test.ts`. It lives in `schemas/`, not `lib/`, because `apps/web/vite.config.ts` denies client imports of `packages/api/src` outside `schemas/` and `constants.ts`, and the web imports `floorChange`, `rangeStart`, `rangesLocked`, `utcDate` and the range list from it. For the same reason it imports nothing from `lib/` and defines its own minute, hour and day constants. Its exports:
   - `SNAPSHOT_CRON = "5 * * * *"`, off the hour, where three jobs already run;
   - `PRICE_HISTORY_RANGES = ["7d", "30d", "90d", "all"] as const`;
   - `utcDate(now)`: the `YYYY-MM-DD` UTC day;
   - `historyCacheSeconds(now)`: seconds to the next minute 10, five minutes after the snapshot starts. Expiring at "next snapshot + 300 s" instead would let a request between :05 and the job's commit cache the previous hour for about 65 minutes;
   - `rangeStart(range, now)`: today minus N − 1 days in UTC, or `null` for `all`;
   - `floorChange(first, current)`: `(current − first) / first`, or `null` when either is null or `first` is 0;
   - `rangesLocked(since, now)`: true while the history spans 7 days or fewer, counting both ends (13 October since 7 October is 7 days).

   Tests cover: the day boundary at 23:59/00:00 UTC; `historyCacheSeconds` at :04:59 (301 s), :09:59 (1 s) and :10:00 (3,600 s); `rangesLocked` at 7 days (locked) and 8 days (open); each range across a month end; and `floorChange` for 10 → 12 = 0.2, a fall, and nulls. "Today" is always computed in JS and passed in: `current_date` follows the session's TimeZone. The worker takes the cron from here and the API takes the cache TTL, so the two cannot drift.

5. **`apps/worker/src/job/snapshot-price-history.ts`.** `snapshotPriceHistory()`:
   1. `getUsdRates()`, unless the caller passed `rates` (an optional argument, used to stub an empty map in a scratch check); when the map is empty, log and return, writing nothing.
   2. `today = utcDate(new Date())`.
   3. In one `db.transaction`, run `fetchPriceSnapshot(tx, rates)`.
   4. Upsert today's rows in chunks of 1,000 (6 parameters a row, well under Postgres's 65,535) with `onConflictDoUpdate({ target: [slug, date], set: excluded values, setWhere: <any of the four columns IS DISTINCT FROM excluded> })`, so an unchanged hour writes no new row version.
   5. Delete today's rows whose slug is not in the snapshot (`collection_slug <> ALL(${sql.param(slugs)}::varchar[])`, one array parameter: a bare array inside drizzle's `sql` expands to `(p1, p2, …)`).

   It registers outside `if (indexerWrites)`, since it reads and writes the app database only: `await safeRun(...)()` on startup, then `cron(SNAPSHOT_CRON, ...)`. Past days are never touched, so a later trade block or ban leaves them as recorded, and the last run of a UTC day (23:05) stands for that day.
   - *Alternative:* one run at 00:05 for the day before. Rejected: today's point should exist from day one, and a missed midnight run would lose the whole day.

6. **`market.priceHistory`**, `pub`, with no `.route()` and not added to `openApiRouter`.
   - Input: `{ collectionSlug, range }`, where `range` is `z.enum(PRICE_HISTORY_RANGES).default("30d")`.
   - Output: `{ points: { date, floorUsd, medianUsd, listingCount }[], tracking: { since, snapshots } | null }`.
   - Points are ascending by date from `rangeStart`. `tracking` is `min(date)` and `count(*)` over all of the collection's rows, and is null when it has none. `priced_count` stays in the table and out of the output.
   - Cached with `getCache(\`market:history:${slug}:${range}\`, historyCacheSeconds(now), ...)`, with the summary's Redis fallback. The five minutes after :05 cover the job's run time.
   - The key skips `marketVersion()`, because a sanction never rewrites stored rows.

7. **Web data.** `priceHistoryOptions(slug, range)` in `features/objekt/queries.ts` (`staleTime` 5 minutes). The Market tab fetches the `30d` range with the stats; Base UI's `TabsPanel` unmounts inactive panels, so neither runs until the tab opens. The change and the sparkline need it, and opening History on its default range then makes no new request. The 30-day change is `floorChange(points[0].floorUsd, stats.floorPrice)` when the 30-day points number 2 or more and the live floor is not null; the sparkline needs only the 2 points. `floorChange` is imported from `@repo/api/schemas/price-history`, which is pure, as `browse-search.ts` already imports runtime values from `@repo/api/schemas`.

8. **Market tab figures.** `StatRow` stays (it is local, not a registry file). `Stat.detail` widens to `ReactNode` so `PriceDelta` can sit on Floor's line, and the row becomes `grid-cols-3 sm:grid-cols-5`: Floor, Listings, Sellers, Median, Highest, with "—" for a null price. Under it, one line holds the sparkline and a History toggle (`Button`, `aria-expanded`) whenever `tracking` is not null; the day-one line replaces the sparkline when `tracking.snapshots === 1`. The chart section opens below that line, above the On Trade line and the listings.

9. **New `features/market/` files.** Nothing in the app shows a change or a small trend, so each piece is new:
   - `price-delta.tsx`: Phosphor `CaretUpIcon`/`CaretDownIcon` (fill) with the percentage formatted by `Intl.NumberFormat` (percent, one decimal), in `text-success` or `text-destructive`, and a `sr-only` direction label; the icon is `aria-hidden`.
   - `price-sparkline.tsx`: an inline SVG over 30 points, `aria-hidden`, since the change carries the meaning. A pure `sparklinePath(values, width, height)` builds the `d`, skipping missing days, and is tested in `price-sparkline.test.ts`; the component renders it in `currentColor`. recharts would cost a `ResponsiveContainer` per drawer for one line.
   - `price-history-rows.ts`: pure `toRows(points, start, today, convert)`. It returns one row per UTC day from `start` (the first point for `all`) to today, with `floor`, `median`, `listings` and `bridge`. A day missing between two recorded days gets null values, and `bridge` is the floor on the two recorded days around each gap and, on the gap's own missing days, a linear interpolation between those two floors. Everywhere else `bridge` is null: recorded days not next to a gap, and days before the first record. `price-history-rows.test.ts` covers a gap (5 → 8 over three days gives `[5, 6, 7, 8]`), two gaps in a row (`[5, 5.5, 6, 6.5, 7]`), two non-adjacent gaps (records on days 1, 3, 4, 5, 7: bridge is null on day 4), leading empty days, a single point and conversion.
   - `price-history-chart.tsx`: a `ComposedChart` in `ChartContainer` with `ChartTooltip`/`ChartTooltipContent`, as `member-progress-chart.tsx` does. It draws:
     - the floor `Area` and the median dashed `Line`, both on the price axis;
     - a faded dashed `Line` on `bridge`, without `connectNulls`, so the null on a recorded day between two gaps splits it and two separate gaps never join across recorded days;
     - the listing `Bar`s on a second, hidden axis, with `maxBarSize` 16 so a single day does not fill the chart.

     Colours come from the `--chart-*` tokens, in keeping with the monochrome chrome. A `ToggleGroup` holds 7d/30d/90d/All, with every option but All disabled while `rangesLocked(tracking.since, now)`. For a non-USD viewer the tooltip shows `objekt_market_approx` as a muted line under its rows, wrapping to the rows' width (`w-0 min-w-full`, so it does not widen the tooltip); values carry no "≈" prefix and nothing sits under the chart. "Current floor vs {date}" with its change sits under the chart only when the range has 2 or more points; "Tracking since {date}" is always there. Dates are formatted with `timeZone: "UTC"`, so `2026-10-13` never shows as the 12th west of UTC.
   - The chart is loaded with `React.lazy` from `market.tsx`, inside `Suspense` with a skeleton: `bun run build --filter=web` showed recharts entering the drawer's chunk otherwise. `formatUtcDay` lives in `features/market/format-utc-day.ts`, so the drawer imports it without pulling in the chart.

10. **Messages** in en, ko and ja: `objekt_market_median`, `objekt_market_highest`, `objekt_market_history`, `objekt_market_range_7d`, `objekt_market_range_30d`, `objekt_market_range_90d`, `objekt_market_range_all`, `objekt_market_vs`, `objekt_market_tracking_since`, `objekt_market_tracking_started`, `objekt_market_change_up`, `objekt_market_change_down`, `objekt_market_approx`, `objekt_market_chart_floor`, `objekt_market_chart_median` and `objekt_market_chart_listings`.

## Risks / Trade-offs

- [A gap means either "nothing priced" or "the worker was down"] → accepted. The faded bridge doesn't claim which, and no backfill guesses.
- [Converted history uses today's rate, so a KRW viewer's past floors move with the exchange rate] → the tooltip says approximate; per-currency history is a non-goal.
- [Listings that change between 23:05 and 00:00 UTC never reach that day's row] → accepted with hourly cadence; the live header floor is unaffected.
- [A listing in a code with no rate is priced as USD, as the floor already is] → unchanged behaviour, now shared rather than duplicated.
- [The job commits after :10 and the cache serves the previous hour until the next :10] → acceptable for daily points.
- [Unchanged hourly upserts on thousands of rows] → `setWhere` skips identical rows, so steady state writes almost nothing.
- [Five figures at 390 px] → `grid-cols-3` wraps them to two rows; check in the browser.

## Migration Plan

1. `db:generate` writes the migration; the user reviews and applies it (expand only).
2. Deploy `packages/api`, `apps/web` (one image) and `apps/worker` together. The worker's startup run writes today's rows immediately.
3. Roll back by reverting the code. The table can stay, since nothing else reads it. Dropping it later takes a new migration.


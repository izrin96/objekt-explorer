## 1. Shared floor definition (no behaviour change)

- [x] 1.1 Create `packages/api/src/services/market-aggregate.ts` with `usdPriceExpr`, `countedListings`, `pricedUsd` and `fetchMarketSummary(rates)` (design decision 1); import only `db`, the schema and `services/safety`. In `routers/market.ts`, delete the moved code, build `listingsWhere(slug)` on `countedListings()`, and have `summary` call `fetchMarketSummary(await getUsdRates())` inside the existing cache closure (and in the Redis-unavailable fallback). Verify lint, typecheck and `bun test` pass for `@repo/api`, and that `market.summary`, `market.stats` and the listings read return the same bodies before and after.
  - Verified: lint, typecheck and `bun test` pass. The old and new router modules were called directly (`market.summary`, `market.stats`, `market.marketListings` by price and by date, which share `findListings` with `listingsForViewer`) against local Postgres, read-only, for three collections (not SeoYeon 204Z, which the local data lacks); the bodies were identical. Not run through `/rpc` on the dev server.

## 2. Schema and migration

- [x] 2.1 Add `collectionPriceHistory` to `packages/db/src/schema.ts` (design decision 3) and run `bun run --filter=@repo/db db:generate`. Do not run `db:migrate` or `db:push`: the user reviews the SQL and applies it. Verify lint and typecheck pass for `@repo/db`, and that the generated migration only creates the table, its primary key and the `date` index.

## 3. Pure history helpers

- [x] 3.1 Add `packages/api/src/schemas/price-history.ts` and `price-history.test.ts` with the exports and cases in design decision 4, including `historyCacheSeconds` and `rangesLocked`. Verify `bun test packages/api/src/schemas/price-history.test.ts` passes, and lint and typecheck pass for `@repo/api`.
  - Verified: 13 tests pass, lint and typecheck pass. `historyCacheSeconds` at :04:59 is 301 s.

## 4. Snapshot job

- [x] 4.1 Add `fetchPriceSnapshot(executor, rates)` to `services/market-aggregate.ts` (design decision 1). Verify lint and typecheck pass for `@repo/api`, and that its SQL, run once as a read-only SELECT, gives SeoYeon 204Z the same floor as `market.stats`.
- [x] 4.2 Add `apps/worker/src/job/snapshot-price-history.ts` and register it in `src/index.ts` outside `if (indexerWrites)`, with a startup run and `cron(SNAPSHOT_CRON, ...)` (design decision 5). Verify lint, typecheck and build pass for `worker`.
  - Verified: lint, typecheck and build pass. `snapshotPriceHistory(rates?)` takes an optional rates argument so the check can stub an empty map.
  - Never start the worker (`dev`, `start` or `src/index.ts`) to test it: every job starts on import, against production. Once the user has applied the migration locally, and only while `.env.local` points both `DATABASE_URL` and `REDIS_URL` at local hosts, call `snapshotPriceHistory()` alone from a scratch script and check that: a second run changes no row; rows exist only for priced collections; and an empty rates map (stubbed in the scratch call) writes nothing.
  - Verified after the user applied the migration locally, from a scratch script outside the repo that asserted both hosts were local: the first run wrote 9,051 rows for the current UTC day, the second left every row identical (`xmin` included), no row belongs to a collection without a priced listing, and an empty rates map wrote and removed nothing. A seeded stale row for a collection with no priced listing survived the empty-rates run and was removed by the next real run.

## 5. API

- [x] 5.1 Add `medianPrice` and `maxPrice` to `marketStatsOutputSchema` and to the `market.stats` select (design decision 2). Verify lint and typecheck pass for `@repo/api`, and that `/rpc` `market.stats` and `GET /api/v1/market/{collectionSlug}/stats` both return the two fields, with `null` for a collection whose listings are all QYOP.
  - Verified: lint and typecheck pass. The procedure was called directly against local Postgres: a priced collection returned all three fields and a QYOP-only collection returned `null` for each. The HTTP `/api/v1` route was not requested.
- [x] 5.2 Add the history input and output schemas to `schemas/market.ts` and `market.priceHistory` to `marketRouter`, leaving `openApiRouter` unchanged (design decision 6). Verify lint, typecheck and `bun test` pass for `@repo/api`; that `/api/v1/spec.json` lists no history operation; and, only while `.env.local` points both `DATABASE_URL` and `REDIS_URL` at local hosts, that the procedure returns ascending points from `rangeStart`, `tracking` with the first date and count, and `tracking: null` for an unlisted collection.
  - Verified: lint, typecheck and `bun test` pass, and `priceHistory` is absent from `routers/index.ts` (`/api/v1/spec.json` itself was not fetched). After the user applied the migration locally, with rows seeded in the local database only (21 days over three weeks, with gaps) and then deleted, the procedure returned ascending points from `rangeStart` for 7d, 30d, 90d and all, `tracking` with the first date and count, and `tracking: null` for an unlisted collection.

## 6. Web

- [x] 6.1 Add `features/market/price-history-rows.ts` with `price-history-rows.test.ts`, the `sparklinePath` builder with `price-sparkline.test.ts`, and the `price-sparkline.tsx` and `price-delta.tsx` components (design decision 9). Verify `bun test` passes for `web`, and lint, typecheck and build pass for `web`.
- [x] 6.2 Add `features/market/price-history-chart.tsx` (design decision 9) and `priceHistoryOptions` in `features/objekt/queries.ts` (design decision 7). Verify lint, typecheck and build pass for `web`, and check whether recharts lands in the drawer's chunk; if it does, load the chart with `React.lazy`.
  - Verified: it did land there, so `market.tsx` lazy-loads the chart and `formatUtcDay` moved to `features/market/format-utc-day.ts`; after that the drawer chunk holds no recharts.
- [x] 6.3 In `features/objekt/drawer/market.tsx` and `stat-row.tsx`, add the five figures, the change on Floor, the sparkline line with History, the day-one line and the chart section (design decisions 7 and 8). Add the messages in design decision 10 to `apps/web/messages/{en,ko,ja}.json`. Verify lint, typecheck and build pass for `web`, and `bun run knip` reports no new unused export.
- [x] 6.4 Browser check of the Market tab at 1280 px and 390 px, light and dark, read-only, in two passes. Stats and history both read the app database, so each pass uses one database.
  - Verified in two passes, each in the agent's own tab against its own dev server on `127.0.0.1`. The first pass ran against the local database before the migration was applied, so there was no history table: it stands in for the production pass below. The second ran after the user applied the migration locally, with seeded rows (since deleted); it covered every item below, including a KRW viewer and a browser timezone of `Etc/GMT+5`.
  - Production (no history yet), recording:
    - the five figures, wrapping to two rows at 390 px without horizontal overflow;
    - no change, no sparkline and no History toggle.
  - Local, only while `.env.local` points both `DATABASE_URL` and `REDIS_URL` at local hosts, with history rows seeded in the local database only, recording:
    - the change pill, with its colour and screen-reader text;
    - the sparkline and the History toggle;
    - range switching, with options locked to All while the history spans 7 days or fewer;
    - the day-one line with one record;
    - a gap drawn as a faded dashed bridge;
    - the approximate note in the tooltip for a KRW viewer;
    - dates not shifting a day in a UTC−5 browser.

## 7. AGENTS.md

- [x] 7.1 Update the `AGENTS.md` files and verify lint and typecheck pass for `@repo/api` and build passes for `worker`:
  - `packages/api/AGENTS.md`: the floor rules live once in `services/market-aggregate.ts` (`countedListings`, `pricedUsd`, `usdPriceExpr`), shared by every market read and the snapshot, so a change to which listings count lands there; `market.priceHistory` is `/rpc` only, and `market.stats` is on `/api/v1`, so its output is public.
  - `apps/worker/AGENTS.md`: `snapshot-price-history` runs hourly at minute 5 and on startup, writes only today's UTC rows, never touches past days, and skips the run when the rate table is empty.
  - State that `packages/db/AGENTS.md`, `apps/web/AGENTS.md` and the root `AGENTS.md` are unchanged.

## Why

`/market` and `/activity` are placeholders. Both are thin surfaces over the objekt browser
C3 landed: market is the collection grid with prices and a floor filter, activity is a
live transfer feed. Landing them now, in parallel with profile (C5) and lists (C6), fills
two of the four nav links and adds the currency setting every priced surface needs.

## What Changes

- **Market** `/market`: the lab's market route on real data — `useMarketObjekts` joining
  `market.summary` onto the collection catalogue, `ObjektCard` with `qty` and `price`
  (floor, QYOP or ask, as the website's `getPriceLabel`), `FilterBar` with
  `sorts=MARKET_SORTS`, `showPricedOnly`, and floor min/max controls passed as `extras`
  using the website's `floor_min` / `floor_max` / `priced` keys already in `filterSearchSchema`.
  Drawer and select bar as on home; the select bar's actions slot stays empty until C6.
- **Currency**: `currency` (ISO 4217, default USD) joins the settings store and the
  Settings dialog as a select over `market.rates`; `useCurrency()` (website hook) formats
  prices everywhere. The lab's `formatMyr` is not ported.
- **Activity** `/activity`: the lab's `DataTable` feed on `/api/activity` (route copied
  from the website) with cursor paging, the `type` filter (`all | mint | transfer | spin`)
  as a route-level search key extending `filterSearchSchema`, the collection facets, and
  a live WebSocket feed on `VITE_ACTIVITY_WEBSOCKET_URL`: new transfers prepend with the
  website's highlight, queue while the pointer hovers the table, and flush on leave. The
  WebSocket client is a small hook over the native `WebSocket` with reconnect, not the
  `@custom-react-hooks/use-websocket` dependency.
- Placeholder routes `market.tsx` and `activity.tsx` replaced.

## Non-goals

- No list actions on market cards (Add to list arrives with C6 and is wired into market
  after both merge). No per-profile activity (C5's trades tab).
- No new filter facets beyond the market and activity ones; no changes to
  `features/filters/search-schema.ts` (C5 edits it for the locked tri-state).
- No change to `@repo/api`, `apps/website`, `apps/lab`.

## Surfaces covered

`apps/web` routes `/market`, `/activity`, the Settings dialog's currency row.
Lab: `routes/{market,activity}.tsx`, `fixtures/market.ts` (shape only), `components/shared/data-table.tsx`.
Website: `components/market/*`, `components/activity/*`, `hooks/{use-market-objekts,use-currency}.ts`,
`routes/(container)/{market,activity}.tsx`, `routes/api/activity.ts`, `lib/env/client.ts`.

## Capabilities

### New Capabilities

- `web-market`: collection grid with prices, floor filter, priced-only, market sorts, currency preference.
- `web-activity`: paged transfer feed with type and collection filters and live updates.

### Modified Capabilities

None.

## Impact

- No new dependencies (`recharts` and `date-fns` exist; WebSocket is native).
- ~14 new files under `features/{market,activity}`; `stores/settings.ts` and
  `features/settings/settings-dialog.tsx` gain currency; `routes/api/activity.ts` added;
  two placeholder routes replaced.

## Context

See proposal.md. Available on `web/main`: `filterSearchSchema` (already has `priced`,
`floor_min`, `floor_max`), `FilterBar({ sorts, showPricedOnly, extras })`, `ObjektCard`
with `qty` / `price` / `priceMuted`, `ObjektVirtualGrid`, `ObjektDrawer` with a Market tab
on `marketListingsOptions` / `marketStatsOptions`, `SelectBar` with an actions slot,
`DataTable`, `TimeAgo`, `useSettings`. The website's `useMarketObjekts` joins
`market.summary` onto the catalogue; its `activity-render.tsx` (513 lines) owns the feed,
the WebSocket and the hover queue over `@custom-react-hooks/use-websocket`.

## Goals / Non-Goals

**Goals:** two surfaces composed from C3's parts; the currency preference every later
price display reads.

**Non-Goals:** list actions; the profile trades feed (C5 reuses `features/activity`'s row
rendering).

## Decisions

**1. Folders.** `features/market/{use-market-objekts.ts,price-label.ts,filter-floor-price.tsx,market-view.tsx}`,
`features/activity/{queries.ts,use-activity-socket.ts,activity-table.tsx,activity-row.tsx,activity-view.tsx,search-schema.ts}`,
`features/settings/use-currency.ts`.

**2. Currency in the settings store.** `useSettings` gains `currency: string` (default
`"USD"`), the dialog a `Select` whose options come from `orpc.market.rates.queryOptions()`
(fetched only while the dialog is open, as the website's `CurrencySetting`), keeping the
stored code selectable before rates load. `useCurrency()` = website hook over the same
query: `{ codes, format(usd), formatUsd }`. Alternative: a URL or cookie — rejected, it is a
device preference like theme.

**3. Market data.** `useMarketObjekts()` = website hook: `collectionOptions` +
`orpc.market.summary` joined by slug into `price / floorPrice / hasQyop / listingCount / listedAt`
on each objekt, then `filterObjekts` / `sortObjekts` with `MARKET_SORTS` (adds floor and
listed-at sorts; unpriced sink to the end regardless of direction, as the lab does).
`price-label.ts` is the website's `getPriceLabel`. Floor min/max controls are a `NumberField`
pair in the viewer's currency converted to USD before writing `floor_min` / `floor_max`.

**4. Activity route search.** `features/activity/search-schema.ts` exports
`activitySearchSchema = filterSearchSchema.extend({ type: z.enum(validType).optional().catch(undefined) })`
(`validType` from `@repo/api/schemas/activity`); the route uses it, `useFilters` keeps
working through `strict: false`. The `Event` control is an `ExtraFacet` as in the lab.

**5. Feed.** `queries.ts`: `activityInfiniteOptions(params)` over `/api/activity`
(`ofetch`, cursor `{ timestamp, id }`), `staleTime` 30 s. `use-activity-socket.ts`: native
`WebSocket` to `clientEnv.VITE_ACTIVITY_WEBSOCKET_URL` (skip entirely when unset),
`subscribe` message with the selected artists as the website sends, parses
`{ type: "transfer" | "history", data }`, exponential reconnect capped at 30 s, dedupes by
transfer id against the first page. Hover queue and highlight (`newTransferIds`, 1 s) are
the website's logic moved into `activity-view.tsx`; the table is the lab's `DataTable`
with virtua `WindowVirtualizer` for rows (the website virtualises too). Rows link nicknames
to `/@{$nickname}` and open the drawer on the objekt.

**6. Env.** `lib/env/client.ts` already declares `VITE_ACTIVITY_WEBSOCKET_URL` (copied
from the website in C1); nothing to add.

## Risks / Trade-offs

- [No activity WebSocket URL in the local `.env`] → the hook is a no-op without it; the
  smoke covers paging and filters, and the live path is verified against `ws://localhost:3001/ws`
  from `bun run --filter=web dev:ws` with the URL passed on the command line.
- [Rates query on every market render] → `staleTime` one hour, matching the server cache.
- [Floor conversion rounding produces off-by-a-cent filters] → convert with the same rate
  both ways and compare in USD on the server-provided `floorPrice`.

## Migration Plan

Additive; nothing deploys.

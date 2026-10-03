## Why

The objekt drawer shows supply (Trades: copies, spun, non-spin), serial history and market listings, but nothing answers who holds a collection or how evenly it is spread. Prod data shows the question matters: in a sample of 300 collections, 77–96% of holders own a single copy, while a few trader wallets hold 90–390 copies of one collection. The holder list is how a trader finds who to ask for a copy, and nothing on the site gives it today. The mockup is `design/holders-tab-mockup.html`.

## What Changes

- A new **Holders** tab in the objekt drawer, between Market and Metadata.
- A summary: holder count with copies held, the number of holders who own one copy with their share, and the number of wallets owning 10 or more with their share of copies.
- A spread chart: holders bucketed by copies owned (1, 2–4, 5–9, 10+), drawn once as share of holders and once as share of copies. When 99% or more of holders own one copy (Welcome, Zero), the chart is replaced by a one-line notice.
- A ranked holder list: rank, holder, lowest serial, share and copies, ten rows first and more loaded on scroll. When the signed-in viewer holds copies outside the visible rows, their row is pinned under the list.
- Privacy follows the existing per-address settings: a private profile shows as an unlinked "Private collector" row that still counts, a hidden nickname shows as the address, and a private-serial holder's lowest serial is hidden. The holder's own view is never masked.
- Copies held by COSMO Spin or the null address count as nobody's.
- A new read-only API procedure returning the summary and a page of holders, cached for a few minutes per collection.

## Capabilities

### New Capabilities

- `web-collection-holders`: the Holders tab, covering its summary, the spread chart, the ranked holder list, the pinned viewer row and the privacy rules applied to holders.

### Modified Capabilities

- `web-objekt-browser`: the "Objekt drawer" requirement names its tabs; it gains Holders, and its count is corrected to the tabs the drawer has today (Owned when the viewer holds copies, Trades, Market, Metadata).

## Routes

No new route. The tab appears wherever the objekt drawer opens: `/`, `/activity`, `/market`, `/@{$nickname}` with its `progress` and `trades` views, and `/list/$slug`.

## Non-goals

- Expanding a holder row to show all their serials.
- Searching holders by nickname.
- A "Selling" badge from sale lists: only 4 of the top 50 holders of a sampled collection have any sale list.
- Trade-partner matching, which already lives in lists.
- Turnover figures (never traded, median hold, recent moves), and spin or non-spin counts, which the Trades tab already shows.
- Cross-collection leaderboards or a viewer's rank on the profile stats page.
- Any schema change or migration.

## Impact

- `packages/api`: a new procedure on the collections router, its Zod schema, and a Valkey cache entry per collection.
- `apps/web`: a new drawer panel next to the market panel, a new query option, a tab in `features/objekt/drawer/index.tsx`, and new Paraglide messages in `en`, `ja` and `ko`.
- Indexer DB: one `GROUP BY owner` per collection, served by the existing `(collection_id, owner)` index. Measured on prod at about 150 ms typical and 360 ms for the largest (25k-copy) collection on a cold cache.
- App DB: one batched `user_address` lookup per page of holders, for nicknames and privacy flags.

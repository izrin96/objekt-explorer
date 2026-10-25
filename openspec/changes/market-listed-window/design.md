## Context

`useMarketObjekts` (`features/market/use-market-objekts.ts`) merges the cached catalogue with `market.summary` by slug. Each summary row carries `count` (one per live listing), `minPrice`, `hasQyop` and `listedAt`, which is the newest live listing's `list_entry.created_at` in unix seconds. Rows only cover sale lists on Market whose seller is not trade-sanctioned. A catalogue collection with no summary row is skipped, and so is one the compared profile holds. Then `filterObjekts(deferredFilters, listed)` runs inside a `useMemo`, and the footer total sums `listingCount` over the filtered rows.

Most listed is `sort=supply`. It is in `MARKET_SORTS`, `SORT_LABEL` and `SORT_DEFAULT_DIR` (`desc`). Its `sortObjekts` branch compares `listingCount` alone, and `toSorted` is stable, so ties keep the order of the catalogue response.

Floor price is the precedent for a market-only filter. It has `floor_min`/`floor_max` in the shared `filterSearchSchema`, a predicate in `filterObjekts`, an `ExtraFacet` in `market-view.tsx` and a chip in `active-chips.tsx`.

## Goals / Non-Goals

**Goals:**
- A pure window predicate and tie order, unit-tested without React.
- No new state: the URL is the only home of the window.

**Non-Goals:**
- A ticking clock that re-filters an open page as listings age out (decision 4).
- Widening `SingleSelect` with an icon slot.

## Decisions

### 1. The window reads `listedAt`, the newest live listing

A collection is kept when `listedAt >= nowSec - LISTED_WINDOW_SECONDS[window]`. Since `listedAt` is the maximum over live listings, this holds exactly when some live listing was added within the window. A listing added and then removed is gone from the summary, so it doesn't count.

`list_entry.created_at` is set once: entries are only inserted (`addEntries` → `insertTokens`, `onConflictDoNothing`) and never updated. So "listed" means when the objekt was added to the list. It does not mean when that list was switched to Show on Market, or when its seller's trade block lifted. Recently listed already reads the field this way.

- Alternative: a server-side `listedSince` input on `market.summary`. Rejected because the client already holds the time, the summary is cached as one key per market version, and a per-window key would split that cache.

### 2. `features/filters/listed-window.ts`, pure

It exports:
- `LISTED_WINDOWS = ["24h", "7d", "30d"] as const` and its `ListedWindow` type;
- `LISTED_WINDOW_SECONDS: Record<ListedWindow, number>` (86 400, 604 800, 2 592 000);
- `isListedWithin(listedAt, listed, nowSec)`.

It imports nothing, so `search-schema.ts` and the test can both import it. The labels live in `labels.ts` as `LISTED_WINDOW_LABEL: Record<ListedWindow, () => string>`, beside `SORT_LABEL`, so the control and the chip share one map and the pure module stays free of Paraglide.

### 3. `listed` in the shared `filterSearchSchema`

The field is `listed: z.enum(LISTED_WINDOWS).optional().catch(undefined)`, following `priced` and `floor_*`. `pickFilters`, `defaultFilters`, `isFiltering`, `canReset` and the reset patch all derive from the schema's keys, so Reset and the chip's removal need no extra code. None of the schemas routes extend it with defines its own `listed`: `compareSearchSchema` (`cmp_*`), `objektSearchSchema` (`slug`, `id`, `serial`) and `browseSearchSchema`. `browseSearchSchema` extends `filterSearchSchema`, so `/trade` inherits `listed`. `toBrowseInput` picks its fields one by one, so `/trade` never sends it.

The router does not rewrite the URL on load, so `?listed=1y` stays in the address bar until the next `useSetFilters` write. That write's `prev` is the route's validated search: router-core's `matchRoutesLightweight` assigns the validator's output over the raw query, and that output holds `listed: undefined`. `withoutEmpty` then drops the key.

On a surface whose rows have no `listedAt` (`/`, profiles, lists), the predicate skips the row, so a stray `listed` filters nothing. This is deliberately unlike `priced`, which empties those grids. Its chip shows only where the filter bar carries the Listed control: `useActiveChips({ listed })` drops it elsewhere, so no surface claims a filter it doesn't apply. It still counts as a filter: it enables Reset, and turns `isFiltering` true, which turns off pin-first ordering on a profile, as any stray filter does today.

- Alternative: a market-only schema extension in the route. Rejected because `useFilters`, chips and Reset are all typed against `FilterSearch`, and a second schema would fork them.

### 4. `filterObjekts(filters, objekts, nowSec = currentUnixSeconds())`

The window check sits after the floor range. Other callers pass two arguments, so nothing else changes. `useMarketObjekts` keeps its call as it is, so the cutoff is fixed when the memo runs: on a filter change, or when the merged rows change (summary refetch, artist scope, Compare). Reading the clock in a default parameter keeps `Date.now()` out of the component body, which the React Compiler treats as impure.

The summary query has a 60 s `staleTime`, no `refetchOnWindowFocus` and no interval. On a tab left open, then, the cutoff and the data both freeze until a remount, a filter change, or an `orpc.market.key()` invalidation from a trade or moderation action. This is accepted: the smallest window is 24 hours, and the listings shown are no staler than the rest of the page.

- Alternative: a `useNow` tick feeding the memo. Rejected because it re-filters every row on a timer while the data under it stays just as old.

### 5. `compareSupply(dir)` exported from `filter-utils.ts`

It returns a comparator that orders by:
1. `listingCount` (missing counts as 0) in `dir`;
2. floor ascending, with null or undefined last;
3. `listedAt` descending (missing counts as 0);
4. `slug` by code-unit comparison, so the order doesn't depend on locale.

Only step 1 follows `dir`. The `supply` branch of `sortObjekts` becomes `objekts.toSorted(compareSupply(sortDir))`. Exporting the comparator lets the test cover the order without building rows for `sortObjekts`'s member and season callbacks.

### 6. The control is `SingleSelect`

`features/market/filter-listed.tsx` renders the existing `SingleSelect`, as `OnlineFilter` does:
- the label is `m.filter_listed()`;
- the sentinel `"any"` stands for no `listed`, like `ALL_TYPES`;
- options are built per render, which avoids a hydration mismatch;
- picking `"any"` writes `{ listed: undefined }`.

`SingleSelect` already gives the outline-sm trigger, `data-active` and the `data-active:border-foreground` look the Floor price trigger has, and it shows "Listed · Last 7 days" when active. It has no leading icon. Rather than adding an icon prop to a shared control for one caller, the Listed trigger goes without one, as the Type facet does. A hand-built `Select` with a Phosphor `ClockIcon` was considered and would duplicate `SingleSelect`.

### 7. Wiring in `market-view.tsx`

`const listedActive = useFilters((f) => f.listed) !== undefined`. The `extras` memo becomes `[floor, { key: "listed", active: listedActive, Control: ListedFilter }]`, with `listedActive` added to its dependencies. A fresh array on every render would re-run the facet parity effect in a loop. The entry is not `quick`, so `ExtraFacetControls` hides it inline below `md`, the sheet renders it stacked, and `FilterSheet` counts it in the badge.

### 8. Chip

In `buildChips`, right after the floor chip, built the way the floor chip is:

```ts
if (filters.listed !== undefined) {
  const windowLabel = LISTED_WINDOW_LABEL[filters.listed]();
  chips.push({
    key: "listed",
    label: `${m.filter_listed()}: ${windowLabel}`,
    name: m.filter_listed(),
    value: windowLabel,
    remove: { listed: undefined },
  });
}
```

### 9. Messages (en / ko / ja)

| key | en | ko | ja |
| --- | --- | --- | --- |
| `filter_listed` | Listed | 등록 시점 | 出品時期 |
| `filter_listed_any` | Any time | 전체 기간 | すべての期間 |
| `filter_listed_24h` | Last 24 hours | 최근 24시간 | 過去24時間 |
| `filter_listed_7d` | Last 7 days | 최근 7일 | 過去7日間 |
| `filter_listed_30d` | Last 30 days | 최근 30일 | 過去30日間 |

### 10. Tests

These modules are pure. Their import chain is zod, chroma-js and `@repo` type and schema modules, and `trade/browse-search.test.ts` already loads `search-schema.ts`.

- `listed-window.test.ts`:
  - each window's boundary: exactly `nowSec - seconds` is in, one second earlier is out;
  - a future `listedAt` is in.
- `filter-utils.test.ts`:
  - `listed` composes with `priced` and with a floor range;
  - a row without `listedAt` passes;
  - `filterSearchSchema.parse({ listed: "1y" }).listed` is undefined;
  - `compareSupply` orders the spec's tie cases identically for `asc` and `desc`, then by `listedAt`, then by slug.

## Risks / Trade-offs

- [A wrong client clock shifts the window, since `listedAt` is server time] → Accepted. The windows are a day or more, and Recently listed already compares the same fields.
- [A list switched to Show on Market today, holding month-old entries, is not "listed in the last 24 hours"] → This is the defined meaning (decision 1), and it matches Recently listed.
- [`messages/*.json` are also edited by `market-price-history`] → Add keys by merging into the current contents, never by rewriting the file from an older copy.

## Migration Plan

Client-only. A rollback reverts the web build. Links carrying `listed` then parse without it, because `z.object` strips unknown keys.

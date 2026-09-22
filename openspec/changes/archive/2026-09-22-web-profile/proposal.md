## Why

`/@nickname` is a placeholder. The profile is where an owner sees their collection: pins,
locks, trades, progress, statistics, and the checkpoint view of what they held on a date.
It is the largest remaining surface and every piece of it composes C3's browser with
owned-objekt data, so it can run in parallel with market (C4) and lists (C6).

## What Changes

- **Profile layout** `/@{$nickname}`: loader resolves the profile through a copied
  `getProfile` server function, renders the private-profile guard, the lab's banner,
  header (identity, socials, Edit via C7's `EditCosmoDialog`, Discord-format button
  deferred to C6), four stat cells and link-backed tabs Collection, Trades, Progress,
  Statistics, Lists (the Lists tab route is a placeholder C6 fills).
- **Collection tab**: owned objekts through an infinite query over a copied
  `/api/objekts/owned-by/$address` route, merged with `pins.list` and `lockedObjekt.list`,
  the lab's `ProfileToolbar` (search, sort, columns, lock tri-state, checkpoint popover),
  pinned shelf with dnd-kit reorder (`pins.reorderPins`), lock and pin overlays, batch pin /
  unpin / lock / unlock from the select bar, per-profile `gridColumns`, load-more paging in
  `ObjektVirtualGrid`.
- **Checkpoint** `?at=`: the lab's snapshot popover writes the website's `at` parameter;
  while set, owned objekts come from the transfer history at that date, actions are hidden
  and pins and locks are not merged. `useResetFilters` already preserves `at`.
- **Trades tab**: the profile transfer feed on a copied `/api/transfers/$address` route
  (types `all | mint | received | sent | spin`, hidden-transfer handling).
- **Progress tab** and **Statistics tab**: the lab's views on the website's shaping
  (`useShapeProgress` semantics) and `recharts` through the kit's `chart.tsx`.
- `locked` in `filterSearchSchema` becomes tri-state (`true | false | undefined`).

## Non-goals

- No lists tab content, no Discord format, no Set price (C6). No edit-profile dialog
  code: C7's `EditCosmoDialog` is reused as is.
- No SPIN-address server-side variant beyond routing the spin address to the same view.
- No change to `@repo/api`, `apps/website`, `apps/lab`.

## Surfaces covered

`apps/web` routes `/@{$nickname}`, `/@{$nickname}/trades`, `/progress`, `/stats`, and the
`/list` placeholder. Lab: `routes/profile.tsx`, `components/profile/*` (15 files),
`store/{pins,lock,snapshot}.ts`. Website: `routes/@{$nickname}/*`, `components/profile/**`
(incl. `progress/`, `stats/`, `trades/`, `checkpoint-picker.tsx`), `components/objekt/{pin-dnd,actions/*}.tsx`,
`hooks/{use-owned-collections,use-profile-objekt,use-progress-objekt,use-shape-progress,use-profile-target,use-collection-rarity}.ts*`,
`hooks/actions/*`, `lib/functions/profile.ts`, `lib/queries/profile.ts`, `lib/fetching-util.ts`,
`routes/api/objekts/owned-by.$address.ts`, `routes/api/transfers.$address.ts`.

## Capabilities

### New Capabilities

- `web-profile`: profile layout and guard, owned collection with pins, locks and batch
  actions, checkpoint view, trades feed, progress and statistics.

### Modified Capabilities

- `web-objekt-browser`: the locked filter becomes tri-state (delta below).

## Impact

- `apps/web` gains `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`,
  `react-intersection-observer` at the website's versions.
- ~30 new files under `features/profile`, two API routes, `lib/functions/profile.ts`;
  `features/objekt/objekt-virtual-grid.tsx` and `build-virtual-data.ts` gain pin ordering
  and load-more; `features/filters/search-schema.ts` and `filter-popover.tsx` gain the
  tri-state; the two `@{$nickname}` placeholders are replaced.

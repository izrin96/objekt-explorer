## Why

The objekt grid, its filter bar and the objekt drawer are the product. Every remaining
slice (market, activity, profile, lists, compare) renders the same card, grid, filters and
drawer with different data. Porting them once on the home route, on real collection data,
gives C4–C6 a shared `features/objekt` and `features/filters` to compose instead of each
carrying its own copy.

## What Changes

- **Filter state on the URL** with the website's parameter names (`member`, `artist`,
  `season`, `class`, `collection`, `on_offline`, `transferable`, `edition`, `grouped`,
  `hidePin`, `locked`, `color`, `colorSensitivity`, `search`, `sort`, `sort_dir`, `priced`,
  …) as one zod `filterSearchSchema` used by every route's `validateSearch`, read and written
  through a `useFilters()` hook with selectors. Old website links keep working. The lab's
  zustand filter store is not ported; `columns` stays a persisted store as on the website.
- **Filter logic** ported from the website's pure `filter-utils.ts` and `objekt-utils.ts`
  (search with `#1-20` serial ranges, `a201z-aa204z` collection ranges, `!term` negation,
  comma OR groups; `mapObjektWithTag`; sort with member and season comparators), not the
  lab's naive `applyFilters`.
- **Filter UI** from the lab: `FilterBar` (search, inline facets, long-tail popover, `<md`
  sheet, sort and columns selects, active chips), `MemberChips` with the artist segment,
  the facet table with its dev parity guard, facet values from `config.getFilterData` and
  `useCosmoArtist` instead of fixtures.
- **Objekt UI** from the lab: `ObjektCard` on `ValidObjekt` (container-query label,
  long-press select, `hideLabel` from settings), `ObjektGrid` rows inside a virtua
  `WindowVirtualizer` (website `objekt-virtual-grid` + `build-virtual-data`, port note 4
  of the lab review), `ObjektDrawer` with Serials (four-branch resolution), Market and
  Metadata tabs on the real endpoints, `SelectBar` with Select all and Clear plus an
  actions slot, persisted responsive `columns` store.
- **Home route** `/` on `collectionOptions` (`/api/collection?artist=`) with member chips,
  filter bar, result count, empty state, grid, drawer and select bar; `routes/api/collection.ts`
  and the three `api/objekts/*` handlers copied from the website.

## Non-goals

- No pins, locks, prices, quantities or checkpoint on the grid: the card accepts those
  props and C5/C6 supply them. No "Add to list" menu or dialog (C6; the card menu's slot
  and the select bar's actions slot exist for it).
- No market or activity surfaces (C4), no profile-only facets (`unowned`, `missing`,
  `group_by`, `at`: they are in the schema, unused until C5).
- No changes to `@repo/api`, `apps/website`, `apps/lab`.

## Surfaces covered

`apps/web` route `/`. Lab: `components/filters/*`, `objekt-card.tsx`, `objekt-card-menu.tsx`,
`objekt-flip.tsx`, `objekt-grid.tsx`, `select-bar.tsx`, `components/objekt-drawer/*`,
`store/selection.ts`, `lib/objekt.ts`, `routes/home.tsx`. Website: `hooks/{use-filters,use-reset-filters,use-collection-objekt,use-breakpoint-column,use-objekt-column,use-filter-data,use-objekt-select}.ts*`,
`lib/{filter-utils,objekt-utils,query-options,fetching-util}.ts`, `components/collection/{objekt-virtual-grid,build-virtual-data}.tsx`,
`components/objekt/{trade-view,market-view,objekt-detail}.tsx`, `components/home/*`,
`routes/(container)/index.tsx`, `routes/api/collection.ts`, `routes/api/objekts/*.ts`.

## Capabilities

### New Capabilities

- `web-objekt-browser`: browsing collections — URL-backed filters and sort, search syntax,
  member and artist scoping, column count, virtualised grid, card, selection, and the objekt
  drawer's serials, market and metadata views.

### Modified Capabilities

None.

## Impact

- `apps/web` gains `virtua`, `chroma-js` (+ types), `@repo/lib` at the website's versions.
- ~30 new files under `features/{filters,objekt}`, `stores/{columns,selection}.ts`,
  `routes/api/**`; `(container)/index.tsx` replaced; `__root.tsx` gains `FilterDataProvider`
  and `config.getFilterData` in the loader.

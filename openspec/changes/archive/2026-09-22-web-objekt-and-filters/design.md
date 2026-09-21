## Context

See proposal.md. `web/main` (2b3c0fbe) has the shell, `useCosmoArtist`, `useSelectedArtists`,
`orpc`, the settings store with `hideLabel`, and the lab's kit including `drawer`, `combobox`,
`popover`, `sheet`, `number-field`, `slider`, `color-picker`. The lab's filter area is
1,929 lines across 14 files with a zustand store and fixture-derived facets; its drawer is
1,132 lines with a hand-rolled `useApi`. The website's filter logic is pure functions
(`filter-utils.ts` 276 lines, `objekt-utils.ts` 186) over nuqs URL state; its grid is a
virtua `WindowVirtualizer` over pre-chunked rows.

## Goals / Non-Goals

**Goals:** one filter contract every later surface reuses; the lab's UI on the website's
semantics; the grid scales to the full catalogue.

**Non-Goals:** owned-objekt data paths (`ownedCollectionOptions`, cursor paging: C5),
prices and market surfaces (C4), any list action (C6).

## Decisions

**1. URL state through one schema.** `features/filters/search-schema.ts` exports
`filterSearchSchema` (zod, every website `use-filters.ts` key with the website's types:
arrays for `member/artist/season/class/collection/on_offline/edition`, booleans for
`transferable/grouped/hidePin/locked/priced/unowned/missing`, strings for `search/color/at`,
numbers for `colorSensitivity/floor_min/floor_max`, enums for `sort/sort_dir/group_by/group_dir`)
with `.optional()` everywhere, plus `defaultFilters`. Routes declare `validateSearch: filterSearchSchema`.
`features/filters/use-filters.ts` exposes `useFilters(select?)` over `useSearch({ strict: false, select })`
and `useSetFilters()` returning `(patch) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })`,
so the lab's `useFilters((s) => s.member)` call sites port with a rename. `useResetFilters()`
drops every key but `at`. Alternative considered: keep the lab zustand store and mirror to
the URL — two sources of truth, and the website link compatibility comes for free the other way.

**2. Lab names map onto website keys.** `collectionNo → collection`, `combine → grouped`,
`hidePins → hidePin`, `sortDesc → sort_dir: "asc" | "desc"`, `onOffline → on_offline`,
`pricedOnly → priced`, `edition: number | null → edition: number[]`. `columns` is not a URL
key: `stores/columns.ts` is the website's `useBreakpointColumnStore` (persisted key
`web:columns`, `initial` flag, responsive 3/5/7 only while `initial`) and the lab's
`ColumnsSelect` writes it. `transferType` waits for C4's activity route.

**3. Filtering is the website's.** `features/objekt/objekt-utils.ts` = website
`objekt-utils.ts` (`mapObjektWithTag`, `getCollectionShortId`, `isObjektOwned`);
`features/filters/filter-utils.ts` = website `filter-utils.ts` (`filterObjekts`, `sortObjekts`,
`getSortDate`) with its chroma colour distance. The lab's `applyFilters`, `matchesFacets`,
`editionOf` and `collectionShortNo` are not ported; `getCollectionEdition` comes from
`@repo/api/schemas/collection-grid`. `useCollectionObjekts()` mirrors the website hook:
`useQuery(collectionOptions({ artist: selectedArtistIds }))`, `useDeferredValue(filters)`,
`filterObjekts` then `sortObjekts` with the artist provider's comparators.

**4. Facet values.** `features/filters/filter-data-provider.tsx` is the website
`use-filter-data.tsx` over `orpc.config.getFilterData`, prefetched in the root loader.
Members and their order come from `useCosmoArtist`; the member dot colour uses the
member's colour from the Cosmo payload when present, otherwise the lab's `member-colors.ts`
table as fallback. The lab's `FACETS` table, `useDeclaredFacets` and `useFacetParity`
(dev-only) are kept as they are; `facets.ts` is rewritten over the provider.

**5. Grid.** `features/objekt/objekt-virtual-grid.tsx` and `build-virtual-data.ts` are the
website's (rows chunked to `columns`, `WindowVirtualizer` keyed by `columns`, each row a
lab `ObjektGrid`), minus the pin ordering and `LoadMoreContext` (C5 adds infinite load).
`react-intersection-observer` is therefore not added here.

**6. Card and selection.** Lab `ObjektCard` typed on `ValidObjekt` from
`@repo/lib/types/objekt`; images from `thumbnailImage` / `frontImage` / `backImage`;
short number via `getCollectionShortId`; `hideLabel` from `useSettings((s) => s.hideLabel)`;
keyboard contract as the lab (port note 5). `stores/selection.ts` is the lab's id set with
a reset on `pathname` change; the select bar's actions and the card menu's items are
`ReactNode` slots filled by C6.

**7. Drawer on React Query.** `features/objekt/queries.ts`: `collectionMetadataOptions(slug)`
→ `/api/objekts/metadata/:slug`, `serialListOptions(slug)` → `/api/objekts/list/:slug`,
`transfersOptions(slug, serial)` → `/api/objekts/transfers/:slug/:serial`,
`marketListingsOptions` / `marketStatsOptions` → `orpc.market.*`. The lab's `useApi` and
`fixtureTimeline` go; `resolveSerial()` keeps its four branches over `useQuery` state
(`isPending → data.hide → !data.owner → found`). Drawer open state stays local (both
apps). `locked` / `onToggleLock` props remain for C5. Types come from
`@repo/api/schemas/objekt` instead of `objekt-drawer/types.tsx`'s hand copies.

**8. Home.** `(container)/index.tsx` gets `validateSearch: filterSearchSchema` and
no loader for the collection payload (10 MB; the website also fetches it client-side with
`staleTime: Infinity`); the pending state is the lab's shimmer grid. `routes/api/collection.ts`
and `routes/api/objekts/{list,metadata,transfers}.*.ts` are copied verbatim from the website
against `@repo/api` (owned-by waits for C5).

## Risks / Trade-offs

- [Search-param churn: typing in the search field rewrites the URL per keystroke] → the
  lab's `FilterSearch` already debounces through `useDebouncedCallback`; `replace: true` keeps
  history clean.
- [Array params serialise differently between nuqs and TanStack's default `JSON`-ish
  search serialiser, breaking website-link compatibility] → the router is configured with
  `parseSearch` / `stringifySearch` that read and write repeated keys (`?member=a&member=b`)
  the way nuqs does; task 2.2 proves it with the scenario URL from the spec.
- [10 MB collection payload on first paint] → same as the website today; note it for C8 as
  a follow-up (server-side artist filtering already applies).
- [virtua row remeasure on column change flickers] → `key={columns}` as the website does.
- [Lab facet parity guard fires on the home surface because a long-tail facet moved] →
  declare the same key set for inline and sheet; the guard is the test.

## Migration Plan

Additive; nothing deploys.

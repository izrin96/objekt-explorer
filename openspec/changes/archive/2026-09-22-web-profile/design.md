## Context

See proposal.md. Available on `web/main`: `ObjektCard` with `pin` / `lock` / `qty` props
and an overlay slot, `SelectBar` with actions, `ObjektVirtualGrid({ objekts, filters, columns?, renderItem, rarityMap? })`,
`buildVirtualData` (without pin ordering), `ObjektDrawer({ locked, onToggleLock })`,
`useFilters` / `useResetFilters` (preserves `at`), `EditCosmoDialog({ address, showUnlinkNote, children })`,
`useCurrentUser` / `useUserProfiles`, `useColumns`, `useCosmoArtist`, `useFilterData`,
`components/ui/chart.tsx`. The lab's profile is fixture-backed with three local stores
(pins, locks, snapshot); the website's `profile-objekt.tsx` (280 lines) is the behavioural
reference: `showActions = user && !filters.at`, `dndEnabled = isProfileAuthed && showActions && !isFiltering && !filters.hidePin`,
`initialColumn = profile.gridColumns`.

## Goals / Non-Goals

**Goals:** the lab's profile on the website's data and gating rules, with pins and locks
server-backed; the checkpoint as a URL parameter.

**Non-Goals:** the website's separate server-rendered SPIN variant; lists tab content.

## Decisions

**1. Folders.** `features/profile/{queries.ts,use-profile-objekts.ts,profile-provider.tsx,profile-guard.tsx,profile-banner.tsx,profile-header.tsx,profile-stats.tsx,profile-tabs.tsx,profile-toolbar.tsx,checkpoint-popover.tsx,pinned-shelf.tsx,pin-dnd.tsx,collection-view.tsx,actions.ts,trades/{queries.ts,trades-view.tsx},progress/{shape-progress.ts,progress-view.tsx,member-progress-chart.tsx},stats/stats-view.tsx}`,
`lib/functions/profile.ts`, routes `@{$nickname}/{route,index,trades,progress,stats,list}.tsx`,
`routes/api/objekts/owned-by.$address.ts`, `routes/api/transfers.$address.ts`.

**2. Pins and locks are server state, not stores.** `orpc.pins.list` and
`orpc.lockedObjekt.list` queries keyed by address; mutations `batchPin`, `batchUnpin`,
`reorderPins`, `batchLock`, `batchUnlock` in `actions.ts` with optimistic updates on the
two list queries and invalidation on settle (the website's `hooks/actions/*` semantics).
The lab's `store/{pins,lock}.ts` and their seed cache are not ported.

**3. Checkpoint is `filters.at`.** The lab's `SnapshotPopover` UI writes `at` (ISO date)
through `useSetFilters`; `use-profile-objekts.ts` forwards `at` to the owned-by query and
skips the pin/lock merge when set; `showActions` and `dndEnabled` follow the website's
expressions. `store/snapshot.ts` is not ported.

**4. Owned data.** `queries.ts`: `ownedCollectionOptions(address, filters)` (website
`infiniteQueryOptions` over `/api/objekts/owned-by/$address`, `staleTime: Infinity` when
`at`), `pinsOptions(address)`, `locksOptions(address)`, `profileOptions` reused from
`features/link/queries.ts`, `rarityOptions` over `collections.rarity`. `use-profile-objekts.ts`
= website hook: pages flattened, pins and locks merged as `isPin` / `isLocked` / `pinOrder`,
`filterObjekts` / `sortObjekts`, `useDeferredValue(filters)`.

**5. Grid additions land in `features/objekt`.** `buildVirtualData` gains the website's
pin ordering (pinned first, by `pinOrder`, only when `!isFiltering && !hidePin`) behind an
`isProfile` flag; `ObjektVirtualGrid` gains `onLoadMore` / `hasNextPage` using
`react-intersection-observer` `InView` on the tail row, as the website. Home and market
pass nothing and behave as before. `ObjektCard`'s existing `pin` / `lock` props render the
marks; the pinned shelf is the lab's `PinDnd` (grab handle + keyboard drag) over dnd-kit,
committing once in `onDragEnd` to `reorderPins` (port note: never reorder DOM during drag-over).

**6. Layout route.** `route.tsx`: `loader` → `ensureQueryData(profileQuery(nickname))`
via `getProfile` (`createServerFn`, `optionalAuth` middleware in `lib/server/middleware.ts`
copied from the website), `notFound()` on miss, `ProfileProvider`, guard when
`profile.isGuard`, banner keyed by address, header, stats, tabs, `<Outlet />`. Child routes
`index`, `trades`, `progress`, `stats` declare `validateSearch: filterSearchSchema` and a
`head` title; `list.tsx` is a `PageHeader` placeholder for C6. The spin address routes to
the same collection view (the website's server-side variant is not reproduced; its
`ENABLE_COUNT`-style paging already covers it).

**7. Tri-state lock.** `search-schema.ts`: `locked: z.boolean().optional().catch(undefined)`
already admits `false`; the change is in `filter-popover.tsx`'s control (cycle
`undefined → true → false → undefined`) and in `filterObjekts` honouring `false`. The lab's
`useSurfaceFilters` reset for `locked` on non-profile surfaces is unnecessary: `FilterBar`
only renders the control when `showLock`.

**8. Progress and stats.** `shape-progress.ts` = website `useShapeProgress` semantics
(the lab's `progress-data.ts` is the same shape and is the code to copy after checking it
excludes Welcome and Zero and explodes multi-member objekts); charts through
`components/ui/chart.tsx` with member colours from `features/filters/member-colors.ts`.

## Risks / Trade-offs

- [Optimistic pin reorder disagrees with the server's `total - i` order] → after
  `reorderPins` settles, invalidate `pinsOptions`; the shelf re-sorts by `pinOrder`.
- [dnd-kit keyboard sensor and the card's keyboard contract collide] → the lab's grab
  handle owns the keyboard drag; card body ignores keys not targeted at it (port note 5).
- [Owner-only checks against production data during verification] → the worker verifies
  reads on any public profile; pin, lock and reorder mutations are verified up to the
  request boundary unless the user has approved a write.
- [8,000-row first page] → same as the website; virtualised.

## Migration Plan

Additive; nothing deploys.

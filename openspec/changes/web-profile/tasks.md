## 1. Read before editing

- [ ] 1.1 Invoke `vercel-react-best-practices`, `vercel-composition-patterns`, `tanstack-router-best-practices`, `better-accessibility`, `baseline-ui`; read this change's `design.md` and specs, `openspec/config.yaml`, port notes 4–6 in `design/lab-code-review.md`, the lab and website files under "Surfaces covered", and `apps/web/src/features/{objekt/objekt-virtual-grid.tsx,objekt/build-virtual-data.ts,objekt/objekt-card.tsx,filters/search-schema.ts,filters/filter-popover.tsx,link/edit-cosmo-dialog.tsx,link/queries.ts}`; verify by writing the website's `showActions` and `dndEnabled` expressions and `pins.reorderPins` order rule in your notes.

## 2. Data

- [ ] 2.1 Add `@dnd-kit/{core,sortable,utilities}` and `react-intersection-observer` at the website's versions; `bun install`; verify single versions.
- [ ] 2.2 Copy `routes/api/objekts/owned-by.$address.ts` and `routes/api/transfers.$address.ts` from the website against `@repo/api`; add `lib/functions/profile.ts` (+ `lib/server/middleware.ts` if needed); create `features/profile/queries.ts` and `use-profile-objekts.ts` per design decisions 3–4; verify on 3200 that owned-by pages by cursor, `?at=` returns the historical set, and a hidden address returns an empty list.

## 3. Layout

- [ ] 3.1 Replace `routes/@{$nickname}/route.tsx` and add `index`, `trades`, `progress`, `stats`, `list` (placeholder) routes per decision 6 with `features/profile/{profile-provider,profile-guard,profile-banner,profile-header,profile-stats,profile-tabs}.tsx` from the lab; verify a public profile renders banner, header, four counts and five tabs, a private profile shows only the guard with no objekt requests in the network log, an unknown nickname shows not-found, and the owner sees Edit opening `EditCosmoDialog`.

## 4. Collection

- [ ] 4.1 Extend `features/objekt/build-virtual-data.ts` (pin ordering behind `isProfile`) and `objekt-virtual-grid.tsx` (`onLoadMore` / `hasNextPage` via `InView`); verify home still renders unchanged and a large profile loads a second page on scroll.
- [ ] 4.2 Make the lock filter tri-state in `filters/filter-popover.tsx` and `filter-utils.ts`; verify three activations write `locked=true`, `locked=false`, then remove the key, and the grid follows.
- [ ] 4.3 Port `features/profile/{profile-toolbar,checkpoint-popover,pinned-shelf,pin-dnd,collection-view,actions}.ts*` per decisions 2, 3, 5 and wire `index.tsx`; verify: pinned shelf first in `pinOrder`; lock marks; per-profile `gridColumns` honoured; visitors see no actions; setting a checkpoint writes `at=`, hides shelf, marks and actions, and survives a filter change; Reset keeps `at`; drag and keyboard reorder produce one `reorderPins` request in the correct token order (request boundary only unless a write is approved); batch pin/lock buttons build the correct `batchPin` / `batchLock` inputs (request boundary).

## 5. Trades, progress, stats

- [ ] 5.1 Create `features/profile/trades/{queries.ts,trades-view.tsx}` on `/api/transfers/$address` and wire `trades.tsx`; verify types filter, paging appends, hidden-transfer profiles show the notice, hidden nicknames show as addresses.
- [ ] 5.2 Create `features/profile/progress/{shape-progress.ts,progress-view.tsx,member-progress-chart.tsx}` and wire `progress.tsx`; verify Welcome and Zero are excluded, a multi-member objekt counts once per selected member, and the chart totals match the panel counts.
- [ ] 5.3 Create `features/profile/stats/stats-view.tsx` and wire `stats.tsx`; verify member and season charts sum to the owned count.

## 6. Verify

- [ ] 6.1 `bun run lint --filter=web` (0/0), `bun run typecheck --filter=web`, `bun run build --filter=web`, `bun run knip`, `git status --short` limited to `apps/web/**`, `bun.lock`, this change's `tasks.md`; record in the envelope.
- [ ] 6.2 Browser pass of a public profile's five tabs and the checkpoint state at 390 px and 1280 px in both themes with the overflow guard silent; record what was opened.
- [ ] 6.3 Comment audit over `features/profile` and the touched `features/objekt` files: only "why" comments remain.

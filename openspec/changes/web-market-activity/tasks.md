## 1. Read before editing

- [x] 1.1 Invoke `vercel-react-best-practices`, `tanstack-start-best-practices`, `baseline-ui`; read this change's `design.md` and specs, `openspec/config.yaml`, the lab and website files under "Surfaces covered", and `apps/web/src/features/{filters/filter-bar.tsx,filters/facet-controls.tsx,objekt/objekt-card.tsx,objekt/objekt-virtual-grid.tsx,settings/settings-dialog.tsx}`; verify by noting the exact `ExtraFacet` shape and `ObjektCard` price props in your notes.

## 2. Currency

- [x] 2.1 Add `currency` to `stores/settings.ts`, `features/settings/use-currency.ts` (website hook over `orpc.market.rates`), and the currency row in `settings-dialog.tsx` (rates fetched only while open); verify selecting KRW persists across reload and `format(1)` returns won.

## 3. Market

- [x] 3.1 Create `features/market/{use-market-objekts.ts,price-label.ts}` per design decision 3; verify `typecheck` and that a known listed collection resolves the same label as the website (`getPriceLabel`).
- [x] 3.2 Create `features/market/filter-floor-price.tsx` and `market-view.tsx`, replace `(container)/market.tsx` (`validateSearch: filterSearchSchema`, head title); verify floor 1–5 writes `floor_min=1&floor_max=5` and narrows the grid, priced-only writes `priced=true`, floor sort sinks unpriced last both directions, card shows qty + price, drawer Market tab prices are in the chosen currency.

## 4. Activity

- [x] 4.1 Copy `routes/api/activity.ts` from the website against `@repo/api`; create `features/activity/{search-schema.ts,queries.ts}`; verify `/api/activity?type=spin` on 3200 returns rows whose `to` is the spin address and paging with `cursor` works.
- [x] 4.2 Create `features/activity/{activity-row.tsx,activity-table.tsx,activity-view.tsx}` on the lab table with virtua rows and the website's hover queue, and replace `(container)/activity.tsx` with `validateSearch: activitySearchSchema`; verify type and collection filters write their keys, Load more appends, nickname links open `/@…`, hidden nicknames show as addresses.
- [x] 4.3 Create `features/activity/use-activity-socket.ts` per decision 5; verify with `dev:ws` on 3001 and `VITE_ACTIVITY_WEBSOCKET_URL=ws://localhost:3001/ws` that a pushed transfer prepends highlighted, is held while hovering and released on leave, and that killing and restarting `dev:ws` reconnects without duplicate rows.

## 5. Verify

- [x] 5.1 `bun run lint --filter=web` (0/0), `bun run typecheck --filter=web`, `bun run build --filter=web`, `bun run knip`, `git status --short` limited to `apps/web/**`, `bun.lock`, this change's `tasks.md`; record in the envelope.
- [x] 5.2 Browser pass of `/market` and `/activity` at 390 px and 1280 px in both themes with the overflow guard silent; record what was opened.
- [x] 5.3 Comment audit over `features/{market,activity,settings}`: only "why" comments remain.

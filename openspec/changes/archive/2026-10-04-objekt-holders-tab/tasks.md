## 1. API: holders procedure

- [x] 1.1 Add the Zod schemas for the holders input (`collectionSlug`, `offset`, `limit` capped at 50) and response (`summary`, `rows`, `viewer`, `nextOffset`, with `HolderRow.holder` as a `public` or `private` union) in `packages/api/src/schemas/objekt.ts`; `bun run lint --filter=@repo/api` and `bun run typecheck --filter=@repo/api` pass
- [x] 1.2 Add the cached ranking builder in a new `packages/api/src/services/holders.ts`: one `GROUP BY owner` with `count(*)` and `min(serial)` that excludes `Addresses.SPIN` and `Addresses.NULL`, sorted by copies descending and then lowest serial ascending, tied ranks, the 1 / 2–4 / 5–9 / 10+ buckets, stored as tuples through `getCache("holders:<slug>", 240, …)`; for `atom02-artms-310z` it yields 1,133 holders, 2,590 copies and buckets 924 / 100 / 74 / 35; lint and typecheck pass for `@repo/api`
- [x] 1.3 Add the masking step: one `user_address` lookup for the slice's and the viewer's addresses, with `isProfileHidden` deciding a private row, a null nickname and a null lowest serial, skipped for addresses linked to the viewer's account; a private row's JSON carries no address; lint and typecheck pass for `@repo/api`
- [x] 1.4 Wire `collections.holders` as an `optionalAuthed` procedure in `packages/api/src/routers/collections.ts` that returns the slice, `nextOffset`, and on `offset === 0` the viewer's own rows from `fetchUserProfiles`; a signed-out call for `atom02-artms-310z` with `offset: 0, limit: 10` returns ten rows ranked 1–10 and an empty `viewer`; lint and typecheck pass for `@repo/api`

## 2. Web: Holders panel

- [x] 2.1 Add `holdersOptions(slug)` to `apps/web/src/features/objekt/queries.ts` with `orpc.collections.holders.infiniteOptions` (10 rows first, then 50) and `staleTime` of 60 s; `bun run lint --filter=web`, `bun run typecheck --filter=web` and `bun run build --filter=web` pass
- [x] 2.2 Add the Paraglide messages for the tab label, the three summary figures, the bucket labels, the chart's text equivalent, the one-copy notice, the empty state, "Private collector" and the viewer marker in `apps/web/messages/en.json`, `ja.json` and `ko.json`; `paraglide:compile` runs clean, and lint, typecheck and build pass for `web`
- [x] 2.3 Build `apps/web/src/features/objekt/drawer/holders.tsx`: a `StatRow` summary (scanned copies for physical collections), two CSS stacked bars using `--chart-1` to `--chart-4` with `role="img"` and an `aria-label`, the one-copy notice when 99% or more of holders own one copy, and `Shimmer` and `EmptyState` states; lint, typecheck and build pass for `web`
- [x] 2.4 Add the ranked list to the panel: rank, `ProfileCell` for public holders or "Private collector" text, lowest serial or "—", share, copies, an `InView` sentinel for the next page, and the pinned viewer rows that are not already loaded; lint, typecheck and build pass for `web`
- [x] 2.5 Add the Holders tab between Market and Metadata in `apps/web/src/features/objekt/drawer/index.tsx`, extending `DrawerTab`; lint, typecheck and build pass for `web`

## 3. Verification

- [x] 3.1 With `bun run dev --filter=web` against prod data, open ARTMS 310Z (`atom02-artms-310z`) signed out: the Network panel shows no holders request until the Holders tab opens; then the figures read 1,133 holders, 2,590 copies, 81.6% owning one and 35 owning 10+ holding 33.5% (within the 5-minute freshness window); scrolling loads rows past ten; at 390 px the page does not scroll horizontally. Recorded as read-only verified
- [x] 3.2 Open a Welcome collection (`atom02-jinsoul-100z`): the one-copy notice replaces the chart and the list still loads. Then open a physical collection: the summary says scanned copies
- [x] 3.3 Find a private-profile holder and a private-serial holder in some collection's ranking with a read-only query, then confirm in the browser and in the response JSON that the private row has no address and the private-serial row has no lowest serial. Change no settings
- [x] 3.4 Run `bun run check` and `bun run build --filter=web` from the root and both pass

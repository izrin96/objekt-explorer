## 1. Read before editing

- [ ] 1.1 Invoke `vercel-react-best-practices`, `vercel-composition-patterns`, `tanstack-router-best-practices`, `baseline-ui`, `better-accessibility`; read this change's `design.md` and spec, `openspec/config.yaml`, port notes 2–5 in `design/lab-code-review.md`, the lab and website files under "Surfaces covered" in `proposal.md`, and `packages/lib/src/types/objekt.ts`; verify by writing the lab→website key map from design decision 2 and the field list of `IndexedObjekt` in your notes.

## 2. Filter contract

- [ ] 2.1 Add `virtua`, `chroma-js`, `@types/chroma-js`, `@repo/lib` to `apps/web/package.json`; `bun install`; verify single versions.
- [ ] 2.2 Create `features/filters/search-schema.ts`, `use-filters.ts` (`useFilters`, `useSetFilters`, `useResetFilters`) and configure `router.tsx` `parseSearch`/`stringifySearch` for repeated-key arrays; verify `/?member=Yooyeon&member=Seoyeon&season=Atom01&sort=season` parses to two members and round-trips to the same query string.
- [ ] 2.3 Port `features/objekt/objekt-utils.ts` and `features/filters/filter-utils.ts` from the website (pure, no UI imports); verify `typecheck` passes and a `bun -e` check of `filterObjekts` with search `a201z-a204z, !seoyeon` over three sample objekts returns the expected subset.
- [ ] 2.4 Create `features/filters/filter-data-provider.tsx`, add `config.getFilterData` to the root loader and the provider to `__root.tsx`; create `stores/columns.ts` (`web:columns`, responsive 3/5/7 while `initial`); verify SSR of `/` includes the facet data in the dehydrated query state.

## 3. Filter UI

- [ ] 3.1 Port `features/filters/{filter-bar,facet-controls,filter-popover,filter-sheet,filter-collection,filter-search,active-chips,multi-select,single-select,member-colors}.tsx` from the lab onto `useFilters`/`useSetFilters` and the provider (decision 4), dropping narrative comments; verify every control writes its website key to the URL, chips remove their key, Reset clears all, and the dev parity guard is silent.
- [ ] 3.2 Port `member-chips.tsx` with the artist segment over `useCosmoArtist`; verify the member row narrows to the selected artists and the `<md` MultiSelect shows the same members.

## 4. Objekt UI

- [ ] 4.1 Port `features/objekt/{objekt-card,objekt-card-menu,objekt-flip,objekt-grid,select-bar}.tsx` and `stores/selection.ts` per decision 6; verify the label hides with the setting, long-press enters selection, click toggles while selecting, keyboard Enter opens and Space selects with a nested button present, and `@container` breaks stack the label below 9rem.
- [ ] 4.2 Copy `routes/api/collection.ts` and `routes/api/objekts/{list,metadata,transfers}*.ts` from the website; create `features/objekt/queries.ts` (`collectionOptions`, metadata, serial list, transfers, market listings and stats); verify each endpoint answers on 3200 and `collectionOptions` returns tagged objekts.
- [ ] 4.3 Port `features/objekt/objekt-virtual-grid.tsx` + `build-virtual-data.ts` (decision 5) and `use-collection-objekts.ts` (decision 3); verify scrolling the full tripleS scope stays smooth (no long frames in a performance trace), the DOM holds far fewer cards than results, and changing columns re-lays without stale rows.
- [ ] 4.4 Port `features/objekt/drawer/{index,serials,market,metadata}.tsx` onto `queries.ts` (decision 7); verify the four serial branches against real data (a private-serial owner, a serial with no owner, an owned serial with a timeline), first/prev/next/last snap to existing serials, Market sorts by price and date and shows floor/listings/sellers, Metadata lists every field, Apollo link opens.

## 5. Home

- [ ] 5.1 Replace `(container)/index.tsx` with the lab's home composition (member chips, filter bar, count, empty state, virtual grid, select bar, drawer) on `validateSearch: filterSearchSchema` and the shimmer pending state; verify the spec's website-link scenario, the empty state on an impossible filter, and the count matches the grid.

## 6. Verify

- [ ] 6.1 `bun run lint --filter=web` (0/0), `bun run typecheck --filter=web`, `bun run build --filter=web`, `bun run knip`, `git status --short` limited to `apps/web/**`, `bun.lock`, this change's `tasks.md`; record in the envelope.
- [ ] 6.2 Browser pass of `/` at 360, 390, 768, 1280 px in both themes: filter bar, sheet, chips, grid, drawer, selection bar, with the dev overflow guard silent; record what was opened.
- [ ] 6.3 Comment audit over `features/{filters,objekt}` and `stores/`: only "why" comments remain; the lab's narrative and history comments are gone.

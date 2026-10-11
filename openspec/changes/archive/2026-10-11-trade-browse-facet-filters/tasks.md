## 1. Server

- [x] 1.1 In `packages/api/src/lib/trade-feed.ts`, narrow sides in `assemblePost` by facets (`slugs`), a `slug` link and Only matches (`onlyMatches`, using the side's ring index) per design decision 1: split each side into related and others, build the preview from the related entries, add `others` to each side, drop the post when nothing is related on any side, and keep match counts on the full entries. Pass `onlyMatches` from `browseFeed`. Add the tests listed in design decision 1 to `trade-feed.test.ts`. Verify `bun test packages/api/src/lib/trade-feed.test.ts` passes.
- [x] 1.2 In `services/trade-feed/index.ts`, make `resolveFilterSlugs` return null when the artist predicate covers every artist and no other facet is set (design decision 2), and pass `others` through to the output side. Verify lint and typecheck pass for `@repo/api`, and that `trade.browse` with no facets returns sides with `others: 0`.

## 2. Search and filter bar

- [x] 2.1 Restore `browse-search.ts` from `845a2cc7^` (extends `filterSearchSchema`; `toBrowseInput(search, artists, selected)` with the member map and artist intersection), and update the `/trade` route loader and `browse-view.tsx` to load `config.getArtists` and call it. Restore the old `browse-search.test.ts` cases and add "artist outside the selection is dropped". Verify `bun test apps/web/src/features/trade/browse-search.test.ts` passes.
- [x] 2.2 Restore `browse-filters.tsx` from `845a2cc7^`, without `artist` in the shared facet keys, and add the artist `ToggleGroup` row (All + scoped artists, multiple, hidden under two artists) in front of it (design decision 4). Render it in `browse-view.tsx` above the type tabs, fold the slug chip into the active chips again, and widen `filtering` to any facet so Reset and the empty state follow. Verify lint, typecheck and build pass for `web`.

## 3. Narrowed strip

- [x] 3.1 Extend `PostStrip` with `total` and `others` (design decision 5): "HAVE {shown} of {total}" when `others > 0`, a "+N others" link to the list after the "+N" tile, the zero-passing form, and `fitCount` reserving the link's width. Add messages to en/ja/ko. Verify lint, typecheck and build pass for `web`.

## 4. Verify

- [x] 4.1 Run `bun run check` and `bun run build --filter=web`. Both pass.
- [x] 4.2 Browser check on `/trade` at 1280 px and 390 px, read-only. Record: artist toggles narrow posts and sides and write `artist=` to the URL; member SeoYeon shows "of" counts and "+N others"; a side with nothing passing reads "0 of N"; chips unchanged by a filter; a `slug` link shows only that collection on each post; Only matches shows only ringed objekts with "+N others", alone and combined with member SeoYeon; an old `?season=…&class=…` link applies; Reset and the empty state work; the feed's response time with a class filter.

## 5. Review fixes

- [x] 5.1 Delete the unused `collection-chip.tsx`. Verify `bun run knip` no longer lists it.
- [x] 5.2 Give the artist toggles the default size, and label the online/offline filter and its chip Format on Browse (`OnlineFilter` takes an optional `label`). Verify lint and typecheck pass for `web`.

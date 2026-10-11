## Context

See proposal.md for why. Current state:
- `packages/api/src/schemas/trade.ts`: `browseFiltersSchema` already extends `collectionFiltersSchema` (artist, member, season, class, on_offline, collection), so `trade.browse` accepts the facets today.
- `services/trade-feed/index.ts`: `resolveFilterSlugs` turns the facets into a slug list through the indexer (`getCollectionFilters`), `fetchFeedRows` keeps posts with an entry in those slugs (`hasEntryIn`), and `assemblePost(post, entriesOf, viewer, filter)` drops a post with no entry in `filter.slugs` but builds every side from all its entries.
- `lib/trade-feed.ts`: `previewSide(entries, ringed)` sorts ringed first, then newest, keeps `PREVIEW_LIMIT = 11` and returns `more`. Matches are counted from the full `entries` in `assemblePost`. Both are covered by `trade-feed.test.ts`.
- `apps/web/src/features/trade/browse-search.ts`: since `845a2cc7` the schema is `type`, `slug`, `matches` only, and `toBrowseInput` sends `artist` = the header selection (or `[]` for a slug link). Before it, the schema extended `filterSearchSchema` and `toBrowseInput` mapped members to Cosmo's spelling and intersected `artist` with the selection; `browse-filters.tsx` used `QuickFilters`, `FilterSheet`, `FacetControls`, `ExtraFacetControls` with `OnlineFilter`, `ResetButton` and `ActiveChips` (with the slug chip folded in). That code is the starting point.
- `trade-one-line-rows` (applied first) turns `PostStrip` into a one-line fitted strip with a count in its label and a "+N" tile.

## Goals / Non-Goals

**Goals:** restore the pre-`845a2cc7` filter bar with the least new code; narrow sides on the server, for facets, a slug link and Only matches alike, so the "+N" and the "of" counts are exact; keep the API change additive.

**Non-Goals:** filter-aware ranking or a filter on match direction; changing the header artist picker.

## Decisions

1. **Narrow in `assemblePost`.** `PostFilter` becomes `{ slugs, slug, onlyMatches }`: `slugs` is null when the collection filters leave nothing out, `slug` is the drawer link's collection, and `onlyMatches` is true when Only matches applies to this viewer. One predicate per side decides whether an entry is related: in `slugs` (when set), equal to `slug` (when set), and, with `onlyMatches`, present in that side's `indexFor(role, list, viewer)`, the same index that rings and counts it. Each side's entries split into `related` and `others`; `previewSide(related, …)` builds `items` and `more` (with the one-sided limit from `trade-one-line-rows`), and the side gains `others: number` (0 when no filter is active). The post is dropped when every side's `related` is empty. Match counts keep reading the full `entries`, so the chip counts the whole post. `browseFeed` passes `onlyMatches` (already computed there) into the filter, and its existing `matchesViewer` check stays. New tests in `trade-feed.test.ts`: a facet-narrowed side, a slug-narrowed side, an Only matches side with every shown item ringed, Only matches combined with a facet, a one-way match keeping the empty side, a post dropped when nothing is related, and match counts unchanged by narrowing.
   *Alternative:* narrow in the browser from the full entry list. The feed sends at most 11 items per side, so the browser can't know what passes beyond them.
2. **"Nothing is left out" is decided on the server.** `resolveFilterSlugs` returns null when no predicate applies. With every artist selected and no other facet, today's call still produces an artist predicate; compare the resolved artist set with all artists and drop the predicate when they're equal, so a whole-catalogue filter doesn't narrow anything or cost the slug lookup. `others` is `0` and no "of" shows.
3. **`others` is additive output.** The side schema gains `others: z.number().int()` defaulting to 0 in the service, so an open tab on the old bundle ignores it. Input is unchanged (see `feedback_rpc_open_tabs`: old inputs must keep validating, and they do).
4. **Restore the old search and bar, and add the artist toggles.** `browse-search.ts` goes back to extending `filterSearchSchema` with the old `toBrowseInput` (member spelling map, `artist` intersected with the selection, a slug link sending `[]`), and the route loader again loads `config.getArtists` for it. `browse-filters.tsx` returns from git history. The artist row is the vendored `ToggleGroup` (multiple) with an All toggle that clears `artist`; its options come from `useScopedFacets().facets.artists`, and it renders only when there are at least two. The shared `FacetControls` is given the facet keys without `artist`, so artist isn't offered twice. The old `browse-search.test.ts` cases come back, plus "artist outside the selection is dropped".
   *Alternative:* write the header's artist cookie from the toggles. The header picker is global and multi-select, and a cookie can't be shared in a link.
5. **The strip learns "of" and "others".** `PostStrip` takes optional `total` and `others`. With `others > 0` the label reads `HAVE {shown} of {total}` (`shown` = items + more) and a `+N others` text link to the list follows the "+N" tile; with no passing items it shows the label, then the link alone. `fitCount` reserves the link's measured width before fitting thumbnails.
6. **Empty and reset states.** `browse-view.tsx` already has an empty state with Reset when `filtering`; `filtering` grows to include any facet. "No posts match the filters" reuses the existing empty-state messages where they fit.

## Risks / Trade-offs

- [A broad filter (one class) still resolves to thousands of slugs] → it's the path `845a2cc7` already ran; `hasEntryIn` takes the array as one parameter. Watch the feed's latency in the browser check.
- [Members are matched by name, and Cosmo's spelling differs from the URL's] → the restored member map handles it, as it did before.
- [A side reading "0 of 8" may look broken] → it says what it means, and the "+8 others" link leads to the list; the user chose to keep it (D3).

## Migration Plan

Deploy `packages/api` and `apps/web` together (one web image). The output change is additive and the input unchanged, so open tabs on the previous bundle keep working. Roll back by reverting the commit.

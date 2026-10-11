## Why

Users asked to "split the market between idntt / ARTMS / tripleS". Browse follows the header's artist picker, but people don't find it, and it can't narrow by member, season or class. The facet filters were removed in `845a2cc7` because a posted list mixes artists and members: a filter kept a post when any one objekt matched, then showed every objekt in it, so the feed barely looked filtered. This change brings the filters back and makes them narrow what each post shows. Mockup: `design/trade-feedback-mockup.html` §02; triage in `design/trade-feedback-2026-10.md`.

## What Changes

- **Filter bar on Browse**, above the type tabs:
  - **Artist** first, as a row of toggles: All, then each artist in the header's selection (tripleS, ARTMS, idntt). Hidden when the selection holds one artist.
  - Then the shared member, season, class, online/offline and collection-number filters, the same controls, sheet, active chips and Reset other pages use.
  - All in the URL with the parameter names the other pages use (`artist`, `member`, `season`, `class`, `on_offline`, `collection`).
- **Every filter narrows each post to the related objekts.** This covers the facets (with the header selection), a collection link from the objekt drawer, and Only matches (objekts that match the viewer's lists). Each side shows only its related objekts, then a "+N others" link to the full list, and its label reads "HAVE 4 of 27". Filters combine: with Only matches and member SeoYeon, a side shows only the SeoYeon objekts that match.
  - A side with nothing passing still shows, reading "0 of 14" with "+14 others".
  - A post with nothing passing on any side is not listed, as today.
- **The match chip still counts the whole post**, whatever is shown. Rings mark only shown objekts, so under Only matches every shown objekt is ringed.
- An older link carrying facet parameters now applies them, where today it ignores them.
- Server: the feed returns, per side, how many objekts the filters left out (`others`), and the preview and "+N" count only objekts that pass.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-trade-browse`: "Filters" (artist toggles and the shared facets come back, in the URL; the facets, a `slug` link and Only matches all narrow each post's sides to "N of M" with "+N others"). The strip itself stays as `trade-one-line-rows` defines it in "Trade card".

## Routes

`/trade` (Browse).

## Non-goals

- For you gets no new filters (it has Show and Compare with).
- The header's artist picker is unchanged and stays global. The Browse artist toggles narrow within it and live in the URL, so a filtered link can be shared.
- A `slug` link still ignores the artist selection, as today.
- "Active now" belongs to `trade-active-hours`.
- No database change. The browse input already takes the facets, so open tabs keep validating.

## Impact

- `packages/api`:
  - `lib/trade-feed.ts` (`assemblePost` narrows sides by facets, slug and Only matches, and counts `others`, with tests);
  - `services/trade-feed/index.ts` (passes the filter set);
  - the `trade.browse` output gains `others` per side (additive).
- `apps/web/src/features/trade/`:
  - `browse-search.ts` (facets back, with tests);
  - `browse-view.tsx` and a new `browse-filters.tsx` (filter bar, artist toggles);
  - `post-side.tsx` ("N of M", "+N others", empty side);
  - the `/trade` route loader (artists for member spelling).
- en/ja/ko messages.
- Depends on `trade-one-line-rows` for the strip it extends.

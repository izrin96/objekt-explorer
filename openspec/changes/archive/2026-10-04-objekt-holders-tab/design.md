## Context

See proposal.md for motivation and specs for behavior. The drawer (`apps/web/src/features/objekt/drawer/index.tsx`) renders Base UI tabs whose panels unmount when hidden (`keepMounted` defaults to false), so a query inside a panel only runs once its tab is opened. The Market panel (`market.tsx`) is the closest neighbour: an ORPC infinite query (`marketListingsOptions`), a `StatRow` summary, rows using `ProfileCell`, an `InView` sentinel for the next page, and `Shimmer` and `EmptyState` for loading and empty states.

Ownership lives in the indexer DB `objekt` table (22M rows), with `IDX_objekt_collection_owner (collection_id, owner)`. On prod, `GROUP BY owner` for one collection took about 150 ms for a 6.4k-copy Double, and 360 ms on a cold cache for the largest collection (a 25k-copy Welcome). Nicknames and privacy flags (`private_profile`, `hide_nickname`, `private_serial`, `user_id`) live in the app DB `user_address` table, which has a unique index on `address`.

## Goals / Non-Goals

**Goals:**
- One indexer query per collection per cache window, whatever the page or viewer.
- Privacy applied per request, so a settings change never waits for the cache.
- Reuse the Market panel's structure and components rather than adding new primitives.

**Non-Goals:**
- No worker job, new table or migration.
- No change to the existing `/api/objekts/*` routes or the Trades tab.

## Decisions

### An ORPC procedure on the collections router
Add `collections.holders` as an `optionalAuthed` procedure taking `{ collectionSlug, offset, limit }`, and a client `holdersOptions(slug)` built with `orpc.collections.holders.infiniteOptions`, matching `marketListingsOptions`. The session is optional: it only unmasks the viewer's own addresses and fills the pinned rows.
*Alternative:* a TanStack server route beside `/api/objekts/metadata`. Rejected: the newer drawer data (market) is on ORPC, which gives typed input and infinite-query helpers for free.

### Cache the whole ranking, viewer-independent
Inside `getCache(\`holders:${slug}\`, 240, …)`, run the single `GROUP BY owner` (with `count(*)` and `min(serial)`, excluding `Addresses.SPIN` and `Addresses.NULL`), sort by copies descending and lowest serial ascending, assign ranks where ties share a rank, and compute the four buckets. Store the rows as compact tuples `[address, copies, lowestSerial, rank]` beside the summary. A page is then a slice, and the viewer's rank is a lookup.
*Alternatives:* caching only the top N breaks paging and the viewer's rank; running `OFFSET`/`LIMIT` SQL per page repeats the 150–360 ms aggregate on every scroll; a worker-precomputed table is more machinery than one indexed query needs.

### Mask after slicing, never in the cache
For the requested slice, plus the viewer's own addresses on the first page, one `user_address` query fetches nickname and privacy flags by address. The viewer's linked addresses come from `fetchUserProfiles(session.user.id)`, the same source the transfers route uses for its private-serial check. The masking rule is `isProfileHidden` from `services/privacy.ts`, applied to each flag:
- A private profile becomes `{ kind: "private" }`, carrying no address or nickname.
- A hidden nickname gives `nickname: null` for every viewer, the owner included, matching `fetchPublicNicknames` and the list and profile services. The client then shows the shortened address.
- A private serial gives `lowestSerial: null`.

Because the cache holds no privacy state, a settings change applies on the next request.

### Response shape
`{ summary: { holders, copies, buckets: [{ key, holders, copies }] }, rows: HolderRow[], viewer: HolderRow[], nextOffset?: number }`, where `HolderRow` is `{ rank, copies, lowestSerial, holder, isViewer }`. `viewer` is filled only for `offset === 0`, and `nextOffset` is absent on the last page, as in `marketListings`. The client pins any viewer row whose `isViewer` copy is not already loaded. Pages are 10 rows first, then 50.

### Chart as two CSS stacked bars, not recharts
Each bar is a flex row whose segments get `flex-grow` from their counts, coloured `--chart-1` to `--chart-4`. The bars carry `role="img"` and an `aria-label` that reads every segment, with a visible legend under them.
*Alternative:* recharts through the existing `ChartContainer`, as on the profile stats page. Rejected: two 100%-stacked bars need no axes, tooltips or measuring, and recharts' responsive container measures its parent, which adds a layout pass inside an animating drawer for no visual gain.

### Reuse the Market panel's pieces
`HoldersPanel` (`drawer/holders.tsx`) uses `StatRow` for the three figures, `ProfileCell` for public holders, plain text for private ones, `InView` for the next page, `Shimmer` while pending and `EmptyState` when there are no holders. The copies label switches to `m.objekt_scanned_copies()` for physical collections, as `SerialsPanel` does. New strings go to `messages/en.json`, `ja.json` and `ko.json`.

## Risks / Trade-offs

- [The largest collections cache about 25k tuples, roughly 1.3 MB in Valkey] → Tuples instead of objects keep it small. Only collections someone has opened get cached, and the entry expires after 4 minutes.
- [Two requests on a cold cache both run the aggregate] → Accepted: the query is indexed and costs at most a few hundred ms. A lock would cost more than it saves.
- [Pages are slices of whatever ranking is cached when each is fetched, so a scroll that spans a rebuild can repeat or skip a holder] → Accepted: it needs a scroll across the exact moment of a rebuild, and the cost is one row. Pinning pages to a ranking version would add state for no visible gain.
- [React Query keeps the response across sign-in or sign-out, so the pinned row can be stale for up to a minute] → `staleTime` of 60 s, the same as the market queries. The drawer refetches the next time it opens after that.
- [A private holder's rank and copy count stay visible] → Intended: the spec counts them so figures add up, and no address, nickname or serial is sent.

## Migration Plan

None. No schema change or backfill is needed. Ship with the web deploy, and roll back by reverting the commit. The `holders:*` cache keys then expire on their own.

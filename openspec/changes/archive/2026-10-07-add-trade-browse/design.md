## Context

Phase 1 (archived `2026-10-07-add-trade-for-you`) left these pieces in place:
- `lists.updated_at`, touched after every list or entry write by `touchListWith` (`packages/lib/src/server/list-touch.ts`);
- the ownership helpers `entryVerdict`, `collectionVerdict` and `toPartnerIdentity` in `packages/api/src/lib/trade-rank.ts`;
- the indexer read `fetchHoldings` in `services/trade-matches.ts`;
- `hidden_trade_partner`;
- `/trade` redirecting to `/trade/for-you`.

`discoverable` has fixed rules (`resolveDiscoverable` in `services/list.ts`):
- a want list may be discoverable freely;
- a have or sale list only when filed under a Cosmo profile;
- for a sale list, discoverable is shown as "Show on Marketplace".

Linking pairs a have list with a want list only. Sale lists never link.

`list_entries` stores `collection_slug` and, for specific objekts, `objekt_id`. Collection metadata lives in the indexer database, so member, season and class filters must be resolved to slugs there before the main database can use them. Activity and Market already do this through `collectionFiltersSchema` and the shared filter bar.

## Goals / Non-Goals

**Goals:**
- The feed's first page is one indexed SQL query plus one indexer read, with no per-post round trips.
- Show on Trade and Bump take effect on the next load. Ownership is at most 60 s stale.
- Post assembly is a pure, tested module.

**Non-Goals:**
- A post entity with a lifecycle of its own.
- Precomputing feed rankings.
- Search over post text.

## Decisions

### D1. A post is derived from lists, not stored
New columns:
- `lists.show_on_trade boolean NOT NULL DEFAULT false`;
- `lists.bumped_at timestamptz NULL`.

A post is a list on Trade. A have list and its linked want list form one post when both are on Trade, and the have list is the post's anchor.

*Alternative:* a `trade_post` table. It would need syncing on every link, unlink, type change and delete. Phase 4 offers attach to users and objekts, not posts. Rejected.

### D2. The invariant lives in the database
A CHECK constraint enforces `NOT show_on_trade OR discoverable`. Every write that can clear discoverable (an edit, unbinding a profile, a type change) sets `show_on_trade = show_on_trade AND <new discoverable>` in the same statement. If a path forgets, the write fails loudly instead of leaving a list on Trade that matching cannot see.

Turning Show on Trade from off to on counts as a bump only when the post's last bump is older than 24 hours. The post's last bump is the later of the list's own `bumped_at` and that of its linked list on Trade. Otherwise the list keeps its own `bumped_at`, or takes its partner's, so neither switching it off and on nor posting the second half of a pair skips the bump limit. Turning it off clears only `show_on_trade`; it never writes `discoverable`.

`showOnTrade` is optional on the list create and update inputs. Omitted means unchanged on update and false on create, so `/rpc` stays compatible with open tabs.

The dialog's switch uses a small `trade.setShowOnTrade({ slug, on })`. It turns discoverable on with the list, through `resolveDiscoverable`. Reusing `list.update` would mean sending the whole form.

The discoverable sync between linked lists in `list-crud.ts` now only ever turns the partner's discoverable on. The old two-way sync ran on every edit, so saving an unbound have list switched its want partner off, and with the CHECK that would also take it off Trade. Show on Trade is per list and is not synced across a pair.

### D3. Feed query: SQL picks the page, TypeScript assembles it
**Stage 1 (main DB, uncached).** One query over `lists WHERE show_on_trade` (new partial index `lists_trade_feed_idx (bumped_at DESC, id) WHERE show_on_trade`):
1. Collapse each pair onto its anchor, so a post's bump time is the greatest `bumped_at` of its lists and its last change is the greatest `updated_at`.
2. Drop:
   - idle posts (both times older than 30 days);
   - the viewer's own posts;
   - hidden partners;
   - posts outside the type filter.
3. Apply slug filters as `EXISTS (list_entries … collection_slug = ANY($slugs))`. The slugs come from:
   - the collection filters, resolved in the indexer with the same predicates `activity-feed.ts` uses;
   - `slug`;
   - the viewer's have slugs when `have` is on (want side only).
4. Order by keyset `(post_bumped_at DESC, anchor_id DESC)`, cursor-paginated.
5. Over-fetch to 36, because stage 2 can empty a post.

**Stage 2 (per list, cached).** Each list's ownership-checked entries are cached in Valkey under `trade:post:<listId>:<updated_at>` with a 60 s TTL:
- an entry edit changes the key, so it shows at once;
- a sale on chain shows within 60 s.

Misses are filled lazily: stage 2 fills the first 24 stage 1 rows, and fills the over-fetched rows only when posts came back empty and the page is short. Each fill is one `list_entries` read and one indexer read that returns only the entries failing the ownership rule, via `unnest` of parallel token and owner-address arrays, so a page of large lists transfers hundreds of rows, not tens of thousands. For you keeps `fetchHoldings` unchanged. The page returns at most 24 posts, and the cursor is the last row stage 1 examined, so a short page never skips posts.

The cursor's `bumpedAt` is a millisecond ISO string validated with `z.iso.datetime`, so a malformed cursor is a 400. Posts are ordered by bump time truncated to the millisecond.

*Alternative:* cache whole feed pages. Rejected: the viewer's own posts, hidden partners and `have` make most pages per-viewer. Stage 1 is cheap on the partial index. The indexer read is the expensive part, and that is what the cache holds.

### D4. Viewer matching
Matching uses two sets:
- **Have slugs:** collections on the viewer's have lists that are still tradeable, judged by `collectionVerdict` exactly as For you judges the user's own have entries. Cached for 5 min under `trade:have:<userId>:<version>`, where the version is phase 1's `tradeVersionKey`, so the viewer's own list edits apply on the next load.

  The wallet alone is not used: people hold objekts they won't trade (often locked), and the have list is where they say what is offered.
- **Wanted slugs:** the viewer's want-list entries, a cheap main-DB read with no cache.

Rings and counts are computed in stage 2 from these sets.

`have` in the URL is optional. When it is absent, the server treats it as on if the viewer's have slugs are not empty, and returns the effective value and whether the toggle is offered, so the client renders the toggle from the response. Cache keys use the effective value, never the absent one.

### D5. Bump is one conditional UPDATE
`trade.bump({ slug })` runs:

```sql
UPDATE lists SET bumped_at = now()
WHERE id IN (<list>, <linked if on Trade>)
  AND user_id = $viewer
  AND show_on_trade
  AND NOT EXISTS (<any list of the post with bumped_at > now() - 24h>)
RETURNING …
```

No rows returned means the bump is refused. The server then throws `TOO_MANY_REQUESTS` carrying `nextBumpAt`. Two concurrent bumps cannot both pass. Neither function touches `updated_at`.

### D6. Pure module `packages/api/src/lib/trade-feed.ts`
This module, tested with `bun test`, holds:
- pairing rows into posts;
- tag choice;
- the idle test;
- the next-bump time;
- preview selection: ringed objekts first, then newest, at most 8 per side, plus the remaining count;
- per-post viewer counts.

The service only does I/O. Identity reuses `toPartnerIdentity`.

### D7. Web
- A new `routes/(container)/trade/route.tsx` layout renders the tab bar (Base UI Tabs used as links) and an `Outlet`.
- `trade/index.tsx` becomes Browse:
  - `validateSearch` extends `collectionFiltersSchema` with `type`, `have` and `slug`;
  - the loader and the view build the query input through one pure function, `toBrowseInput` in `browse-search.ts`, which applies the selected-artist scope as Activity does, except when `slug` is set;
  - the loader fills the first page with `queryClient.query({ …, staleTime: "static" })`;
  - the list renders with `useInfiniteQuery` and `keepPreviousData`, so a filter change keeps the current posts on screen while the next ones load.
- `for-you.tsx` keeps its login redirect, so the For you tab needs no special case for signed-out visitors.
- Reused:
  - the shared filter bar and `FilterDataProvider` (as `market-view.tsx` uses them);
  - `ObjektCard`, `ListTypeBadge`, `ProfileLink` and `SocialBadge` from `partner-row.tsx`;
  - Dialog and Switch from `components/ui`.
- New files: `features/trade/browse-view.tsx`, `browse-post.tsx`, `my-posts.tsx`, `post-list-dialog.tsx`.

### D8. Shell and around
- `app-nav.tsx` and `mobile-nav.tsx` gain Trade after Market. It is active on `/trade` and every path below it.
- `list-header` shows an On Trade badge when the public list payload carries `showOnTrade`. This adds one field to the list output schema.
- The drawer's Market panel adds `trade.collectionPostCounts({ slug })`, a public route cached for 60 s per slug. It counts non-idle posts on Trade with the slug, split into have-or-sale and want. The have side is checked for ownership with one `fetchHoldings` call for that slug.

## Risks / Trade-offs

- **[Risk] A page holding several 2,000-entry have lists makes a large ownership read.** Mitigations:
  - the read is restricted to those slugs and owners;
  - it is cached per list for 60 s;
  - lazy fill and the failures-only read cut the worst local empty-cache page from a 2.2–4.0 s median to about 1.5 s, most of it laptop-to-indexer transfer; production sits next to the indexer. Collection metadata (0.24–1.3 s per page from a laptop) is the next lever, then the precomputed column.
- **[Risk] A have-slug set of several thousand bloats the stage 1 parameter.** It is passed as one `text[]` parameter; the phase 1 want-list test showed thousands of slugs are fine.
- **[Trade-off] Short pages.** Over-fetching makes them rare, and the cursor guarantees nothing is skipped.
- **[Trade-off] Showing the owner publicly while Hide User is on.** Show on Trade is an explicit opt-in to being seen trading, and the user accepted the same identity rule for For you.
- **[Risk] One person posting many lists to fill the feed.** One post per list and the 24 h bump limit cap the damage. Moderation is phase 3.
- **[Risk] The CHECK constraint rejects an existing write path that clears discoverable without clearing Show on Trade.** Task 1.2 lists every such path. The constraint turns a missed one into a test failure, not silent drift.

## Migration Plan

1. `db:generate` produces one migration:
   - the two columns;
   - the CHECK constraint;
   - the partial index.

   Every existing list passes the constraint, since all start with Show on Trade off.
2. Apply it locally only (`.env.local` points at the Docker database). Production gets the phase 1 and phase 2 migrations together when the user decides to ship.
3. Rollback:
   - drop the index, the constraint and the columns;
   - nothing else reads them.

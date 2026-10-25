# Design

## Context

`peopleFeed` (`services/trade-feed/index.ts`) runs `feedPlan` and `fillPage` on every page. `readPeoplePhase` then resumes each phase separately. A ranked phase goes through `resumeRanking` against a merged `SeenPeople` snapshot (`scope.ts`, `trade:feed-scope:1`). The bump phase and the tail page by a `(bumpedAt, userId)` keyset (`fetchBumpPeople`). `peopleScope` keeps later phases off everyone in an earlier ranking. Because `SeenPeople` holds whole rankings rather than the people actually shown, someone who changes ranking before their row is reached is skipped. Browse's keyset also misses a person whose newest bump moves above the cursor. See proposal.md (Why). The web drops repeats by `userId` (`browse-view.tsx`), so the visible bug is people going missing, not duplicates.

Sizes on staging: about 120 people with a listed post. The rankings are capped at `FEED_CANDIDATE_LIMIT` (1000) and cached for 5 minutes per viewer and Compare with choice.

## Goals / Non-Goals

**Goals:**
- One order per opened feed, stored and read by position.
- No person skipped or repeated within the store's hour.
- Cheaper later pages.

**Non-Goals:**
- Changing `browseFeed`, its `SeenPeople` scope or `phaseScope`. `mergeSeen` stays for it.
- Changing the ranking rules, `personMatches`, the stage-2 post loading or the read budget's purpose.

## Decisions

1. **Store an ordered list of people, not sets.**
   - The value is `{ v: 1, filters: <fingerprint>, people: [{ id, section, rank?, oneWay? }] }`, where `section` is `"mutual" | "oneWay" | undefined`. A ranked entry keeps its rank tuple, so a later page's cursor carries rank fields without reading the rankings. It carries an optional `more: { after? }` when the tail was capped: `after` is the last kept tail person's `{ bumpedAt, userId }`, absent when the ranked sections filled the cap.
   - It lives in `services/trade-feed/scope.ts` under a new key, `trade:people-order:1:<viewerId|anon>:<token>`, for 3600 seconds, through `redisFailOpen`. This reuses the existing scope store rather than adding a module. `loadScope`/`saveScope` stay for `browseFeed`.
   - Alternative considered: keep `SeenPeople` and add a shown-people set. It fixes the gap but keeps every resume path, and the point is to delete them.

2. **The token is a hash of the order and bound to the filters.**
   - The token is a sha1 of the fingerprint and the order, cut to 24 characters, as `scopeToken` does. The viewer id is in the key, so no two viewers share one; a reload, a second tab, or any signed-out reader of the same order reuses its key instead of storing a copy, which matters because signed-out loads are bounded only by the per-IP rate limit.
   - The stored `filters` fingerprint is a sha1 of the sorted facets plus `type`, `slug`, `match` (the effective mode: Off when the viewer has no list on Trade), the resolved Compare with `listId`, and the lead, which the order leaves out. A cursor replayed with other filters doesn't match it, so the server rebuilds the order instead of serving the wrong one.
   - A signed-out Browse uses `anon` in the key. The order is only public posters' ids.

3. **Build the order on page 1 from today's pieces.**
   - **Browse (off):** `fetchBumpPeople` without the cursor, up to `ORDER_LIMIT` (2000).
   - **Mutual only:** the Mutual people with a kept WTT post, as `peopleFeed` already filters with `fetchFeedOwners`.
   - **Any:**
     - Mutual: as Mutual only. With WTB or WTS there is none, as today.
     - One way: the One way ranking less the Mutual people, filtered once by `fetchFeedOwners`.
     - Tail: `fetchBumpPeople` excluding both sections, up to whatever `ORDER_LIMIT` leaves.
   - Every option leaves out the lead (`person`).
   - A pure `buildPeopleOrder(sections)` in `lib/trade-feed.ts` drops later repeats and applies the cap, and `nextSlice(order, at, limit)` returns the next ids. Both are tested there.

4. **The cursor carries a position and still carries a person.**
   - `peopleCursorSchema` gains optional `order` (the token) and `at` (the index of the next person).
   - New cursors keep `bumpedAt`, `userId`, `phase`, `lead` and the rank fields filled from the last examined person, so the fallback has something to resume from. An older tab's cursor parses unchanged.

5. **Fallback rebuilds and resumes. It never errors.**
   - This applies when `order` is absent or expired, the fingerprint differs, or Redis is down.
   - Build the order as on page 1 and save it under a new token.
   - Start after `cursor.userId` if that person is in the new order. Otherwise start at `min(at, length)` when `at` is present.
   - Otherwise (an older tab's cursor) start at the first person of the section `phase` names: Mutual at 0, One way or the tail at the first entry of that section or a later one (the end when there is none), Browse at 0.
   - Repeats this can cause are dropped by the web.

6. **Paging reads slices through `readBatches`.**
   - `fetch` slices the next ids from `at`, and `load` is today's `loadPeople`, so a person whose posts all emptied is skipped. Their place still counts toward `at`.
   - The read budget stays: `EXTRA_PEOPLE_READS` extra reads per request.
   - `nextCursor` is undefined only when the order is exhausted and there is no `more`.
   - Past a capped order, the tail continues by today's keyset from `more`, excluding the order's ranked people. That code stays only for that case. At current sizes it never runs.

7. **Delete the people-only resume code.**
   - The ranked and tail branches of `readPeoplePhase` go. So do `peopleScope` and `resumeRanking`/`inSeenOrder` in `lib/trade-rank.ts` (used only by `peopleFeed`), with their tests.
   - `fillPage` and `feedPlan` stay for `browseFeed`. Sections now come from the order entries, so `peopleFeed` no longer needs `fillPage`.

## Risks / Trade-offs

- [Page 1 builds every section where it used to read only what the page needed: the One way `fetchFeedOwners` over up to 1000 ids, plus a tail read up to 2000] → Today the first Any page already runs both rankings and `keptWtt`. The added tail read is one grouped query over `posts`. Time it in the live check, and lower `ORDER_LIMIT` if it is slow.
- [Redis is down, so every page rebuilds the order] → The ranking caches fall back to in-process (`getCache`), so a rebuild costs the kept-post checks and one bump query, and the resume rules keep paging correct.
- [A person who blocks the viewer mid-scroll] → `loadPeople` reads `feedWhere` live, so they drop out when reached.
- [The order goes stale for up to an hour, so newcomers wait for a reload] → Accepted in the spec. Reopening or refreshing the feed (no cursor) always builds a new order.
- [Order size] → At most 2000 entries of roughly 30 bytes each, about 60 KB per opened feed for an hour. That's fine at today's scale. Revisit if posters grow past the cap.

## Migration Plan

Deploy only; there is no migration. Tabs open across the deploy send cursors without `order` and resume by decision 5. Rollback is the previous build: the cursor it reads still carries every field it knows.

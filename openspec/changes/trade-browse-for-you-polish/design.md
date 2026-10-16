## Context

`browseFeed` (`packages/api/src/services/trade-feed/index.ts`) serves Browse and For you. Under Mutual, it reads the ranked Mutual people from `getMutualPeople` (cached 300 s, over `recountPartners` and `mutualPeople`). It pages them by the person keyset `peopleAfter` and passes them to `fetchFeedRows` as `owners`, and the cursor carries a `MutualRank`. Under Any, it calls `fetchFeedRows` with no owners, newest bump first, and the cursor is `{ bumpedAt, id }`. `fetchTradeCandidates` caps matching at `CANDIDATE_LIMIT` (200) people, ranked in SQL by `least(a, b), a + b`.

On the web, `browse-view.tsx` lays out both tabs. `post-side.tsx` draws strips and their narrowing wording ("of", "+N others", "none match"). `browse-post.tsx` and `trade-row.tsx` hold the row, `trade-header.tsx` the byline with both social badges, and `lists-popover.tsx` the "Lists: N" control. `matching-controls.tsx` holds Mutual only, Compare with and the help. `browse-filters.tsx` wraps the shared `QuickFilters`, `FilterSheet` and `FacetControls`, which keep `QUICK_FACET_KEYS` on the toolbar below `md`.

## Goals / Non-Goals

**Goals:**
- Any lists Mutual, then ranked one-way people, then the bump-ordered rest, in one keyset-paged feed that never repeats a post.
- The Mutual section is produced by the code that already serves Mutual only.
- Every visual change from the mockup stays within the existing components.

**Non-Goals:**
- No new count query, no schema change, no migration.
- No change to `trade.forYou`, the person sheet's data, or Browse's order.

## Decisions

### 1. Any pages through three phases

The cursor gains an optional `phase`: `"mutual" | "oneWay" | "tail"`. Browse and cursors from open tabs use a fourth, internal `bump` phase: the plain bump order with no exclusions.
- **mutual**: the current Mutual path, unchanged: WTT only, `getMutualPeople`, `peopleAfter`. It is skipped when `type` is WTB or WTS.
- **oneWay**: the people from a new cached `getOneWayPeople(userId, sides)`. It reads `recountPartners(userId, sides, "all")`, keeps everyone with a sum above 0, and orders them by sum, then last change, then id. Its key is `trade:oneway-people:1:`, with the same 300 s TTL and scope as `trade:mutual-people:3`. They are paged by a sibling of `peopleAfter` over a `OneWayRank` (`sum`, `at`, `userId`), which the cursor carries in its own optional field (`oneWay`), never in `rank`. A Mutual person's WTT posts are excluded here, so the Mutual section never repeats.
- **tail**: today's Any query, newest bump first, with `owners` excluding every ranked person.

**No repeats across loads.** The two rankings are cached separately for 5 minutes, so a person can leave Mutual, or the One way set, between two loads. The cursor's optional `scope` names a Redis snapshot (`services/trade-feed/scope.ts`, key `trade:feed-scope:1:`, one hour) of the people earlier loads saw in each ranking. `mergeSeen` unions it with the current rankings, and `phaseScope` leaves out a seen Mutual person's WTT posts from One way and the tail, and every seen One way person from the tail. A load writes a new snapshot only when that set changes. An expired or unreadable snapshot reads as none, and the current rankings stand alone.

Carrying the seen ids in the cursor was considered and rejected: up to 200 user ids per request is too large for a cursor.

A page fills from the current phase, and when that phase runs dry it moves on in the same request. So a page holds up to 24 posts across a boundary, and `nextCursor` names the phase it stopped in. Each returned post carries `section: "mutual" | "oneWay"`, which the client uses for headings.

**Considered:**
- Ranking only the 200 candidates, with no tail. People past 200 would vanish from For you, a regression from today's Any.
- Ranking in SQL across every owner. That means recounting ownership for everyone, which the candidate step exists to avoid.
- Client-side sorting per page. It doesn't hold across pages.

**Pure logic:** phase order, handoff and the person keyset live in `lib/trade-rank.ts` and `lib/trade-feed.ts`, with `bun test`. The tests cover:
- a phase that runs dry mid-page;
- a person who moved up between loads;
- no post listed twice;
- type WTB/WTS skipping the mutual phase;
- a person leaving or joining Mutual between loads, an expired snapshot, and the union of a snapshot with the current rankings.

The Redis read and write themselves are covered only by the local walk.

**Open tabs (`/rpc`):** `phase` is optional, so an old Any cursor `{ bumpedAt, id }` with no `phase` and no `rank` reads as tail with no exclusions, which is today's behaviour. An old Mutual cursor with `rank` and no `phase` reads as mutual, also unchanged. `scope` is optional too. `section` is a new optional output field that old clients ignore.

### 2. Strips: one wording rule, set by the tab

`PostSide` takes the tab ("browse" | "forYou") and builds the label from it:
- **Label:** role plus shown count, adding "you want" or "you have" on For you.
- **"of N":** after the strip, linking to the list. It replaces `trade_strip_others`, and the label drops `trade_strip_of`.
- **Empty side:** the side with no related objekt renders as a muted line under the other strip, and the post's sides layout drops the ⇄ mark and gives the remaining strip the full width.

This extends the existing component instead of adding a second one, since Browse narrowing and For you share it.

### 3. Rows

- **Match chip:** `browse-post.tsx` renders it on For you only when the mutual score is above 0.
- **Lists control:** `ListsPopover` renders only for two lists. With one list, the strip's role label becomes the link, with the list's name in its accessible name.
- **Byline:** `TradeHeader` takes a `socials: "discord" | "all"` prop. Posts pass `"discord"` and the person sheet passes `"all"`. The reputation line gets `truncate` with its full text in `title` and an accessible label. On Browse, own posts (`post.anchor.userId === viewerId`) get a "You" badge.
- **Phone:** the `md` breakpoint layout in `trade-row.tsx` changes to the one-line header and the full-width Make offer.

### 4. Controls and filters

- **Post type:** moves out of `matching-controls.tsx` into the facet row in `BrowseFilters`, after Reset. On For you, `MatchingControls` follows after a divider in the same flex-wrap row.
- **Phone folding:** the shared filter components gain an opt-in to treat no facet as quick: `FacetControls`/`ExtraFacetControls` hide all inline facets below `md`, and `FilterSheet` counts every active facet in its badge. The default is unchanged, so Objekts, Market and the other pages keep their toolbar.
- **Phone controls row:** below `md` the controls sit in one `overflow-x-auto` row with `flex-none` children.
- **Description:** hidden below `md`, and For you gets its own string.

### 5. Section headings

`browse-view.tsx` flattens the pages and inserts a heading before the first post of each `section` run, but only when the mode is Any. They use plain `h2` text with no count.

## Risks / Trade-offs

- [The chip popover of the viewer's matched lists is gone from one-way For you rows] → All matches and the person sheet still name both counts, and the user accepted this in the mockup.
- [The oneWay phase lags up to 5 minutes, like Mutual] → written into `web-trade-for-you` Freshness.
- [A recount of everyone for the oneWay phase adds work on For you's first load] → it reuses `recountPartners` with the same 300 s cache scope as Mutual. The two caches are separate keys, since the filters differ (`all` vs `mutual`).
- [The phase handoff is a new keyset] → covered by pure tests before the service is wired.
- [The no-repeat guarantee depends on a one-hour Redis snapshot] → after it expires, or if Redis is unreachable, a post can repeat once, and the web's first-wins dedupe still hides it. Each load whose seen set changes adds one Redis write.

## Migration Plan

No data migration. The deploy is backwards-compatible on `/rpc` (see Decision 1). Rollback is a redeploy: old cursors from new tabs carry a `phase` the old server ignores, so they read as their bump or rank part.

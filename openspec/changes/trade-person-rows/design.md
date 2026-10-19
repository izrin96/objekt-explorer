# Design

## Context

See proposal.md for why. Where things stand today:

- **Server.** `trade.browse` (`browseFeed`, `services/trade-feed/index.ts`) pages posts, 24 a page.
  - Phases: `bump`, `mutual`, `oneWay` and `tail` (`feedPlan`/`fillPage`, `lib/trade-feed.ts`).
  - Stage 1: `fetchFeedRows` over `postsCte` + `feedWhere` picks post ids. Stage 2: `loadPosts`/`assemblePost` builds each post, with its own `match` (`youHave`, `youWant`, list ids) and its ringed items. `previewSide` already sorts ringed items first.
  - The ranked phases already order people (`getMutualPeople`, `getOneWayPeople`, `peopleAfter`), then list each person's posts.
  - Each post carries `person`, the owner's counts from `personMatches`.
- **Web.** `BrowseView` virtualises `BrowsePost` rows and opens `PersonSheet` from `person=<id>`.
- **Prototype.** `person-feed-mock.tsx` groups the posts on the client. It proved the layout, and showed that grouping per page splits a person across pages (nuppotoz's WISHLIST arrived on a later page). So the server has to page by person.
- **Matching candidates.** `candidates.ts` reads every discoverable, trade-capable list, idle or not.

## Goals / Non-Goals

**Goals:**
- One request returns whole people, each with every post the feed keeps for them.
- The header sentence, the per-list counts and the feed's membership all count the same set of lists: listed only.
- Open tabs keep working: `trade.browse` and `trade.person` stay unchanged.

**Non-Goals:**
- No new cache layer.
- No change to `assemblePost`'s post shape, which the chat post card also reads.
- No server-side choice of the lead post or of post order within a row.

## Decisions

### 1. A new procedure, `trade.people`, beside `trade.browse`
- **Input.** `browseInputSchema` plus an optional `person` (user id) and a person cursor.
- **Output.** `{ people, nextCursor, collections }`. Each person carries:
  - `userId`, identity, user, reputation, `messageable`;
  - `counts` (the person's, as `post.person.counts` today);
  - `section` (For you Any only);
  - `posts`: the existing assembled post shape, so strips, tags, notes and `match` are reused as-is.

*Alternative:* change `trade.browse`'s output. Rejected: open tabs parse the old shape (packages/api AGENTS.md, `/rpc` compatibility).

### 2. Page by person, 12 a page, reusing the phases
`fillPage` counts people instead of posts. Each phase first picks the next people, then loads all of their kept posts in one stage-2 read.

- **`bump` phase (Browse; and the For you tail).** A new stage-1 query over the same `postsCte` and `feedWhere`:
  - `SELECT user_id, max(bumped_at), max(id) … GROUP BY user_id ORDER BY max(bumped_at) DESC, user_id DESC`;
  - keyset on `(bumpedAt, userId)`.
- **Ranked phases.** Take the next people from the ranking with `peopleAfter`, as today. People with no kept post are dropped, using a per-owner existence check like `countFeedOwners` but returning ids.
- **Posts.** `fetchFeedRows` with `owners` set and no cursor, then `loadPosts`. A cap of 20 posts per person bounds a page at 240 posts.
- **Cursor.** The person cursor replaces the post cursor (`id` → `userId`). `phase`, `rank`, `oneWay` and `scope` keep their meaning. `mergeSeen` and the scope snapshot already work by person.

*Alternative:* page posts and group on the client. Rejected: the prototype showed a person split across pages.

### 3. Mutual WTT rule inside a row
- Under Mutual only, the `mutual` phase keeps WTT posts only, as today.
- Under Any, a Mutual person's row holds all of their kept posts in the Trade card's order. A Mutual-ranked person with no kept WTT post is left to One way, so they never drop out of For you. The new feed's `peopleScope` excludes every listed Mutual person from `oneWay` and `tail`; `trade.browse` keeps `phaseScope` and `excludeWttOf` for open tabs. A person sits in exactly one section.

### 4. `person` leads the feed
- On a request with `person` and no cursor, the server reads that person's row first, using `owners: [person]` under the same filters and matching, and returns it with `section` unset.
- Every phase then excludes them through `excludeOwners`. The cursor carries `lead` so later pages keep excluding them.
- A person the feed would not keep returns nothing extra.

### 5. Idle lists stop counting
- `candidates.ts`'s `partner_lists` keeps only lists inside a listed post. That is the `postsCte` + `listedPost` rule, joined in by list id over `posts.id` and `posts.partner_id`, so a pair's lists share the pair's freshness.
- The viewer's own lists still count whether listed or not, per the spec.
- Bump the cache keys `trade:foryou`, `trade:mutual-people`, `trade:mutual-count`, `trade:person` and `trade:oneway-people`, since their values change meaning.

### 6. Row order, lead post and sentence live in a pure web module
- `features/trade/person-row.ts` exports:
  - `orderPosts(posts)`: posts with a match first, most matched collections first, then newest bump;
  - `leadPost(posts)`;
  - `headerSentence(counts)`, returning `swap | youHave | theyHave | none` and a number;
  - `listCount(post, side)`: `youHave` on a want side, else `youWant`.
- It sits beside a `person-row.test.ts`.

*Alternative:* order on the server. Rejected: the client already holds `post.match`, and a pure module is testable under the repo's rule.

### 7. Web components
- **`PersonRow`** replaces `BrowsePost`. It reuses `TradeHeader`, `TradeActions`, `TradeSides`, `TagBadge`, `EmptySide` and `PostStrip`.
  - `SideStrip` gains an optional count chip in its label instead of a fork.
  - The Browse/For you wording split in `sideWording` collapses to the single role + name + count label. The narrowed label ("HAVE 4", "of N") stays.
- **`BrowseView`**:
  - virtualises rows of people;
  - keeps section headings as their own rows;
  - drops `PersonSheet` and `openPerson`;
  - on a `person` lead row, a clear control removes `person`.
- **Expansion.** "+N more lists" uses local state in the row. virtua re-measures the row.
- **Deleted.** `person-sheet.tsx`, `match-chip.tsx`, `matched-lists.tsx`, `person-groups.ts` and its test, and the prototype files.
- **Chat.** The post card's sender link already carries `person=<owner>`, so it needs no change.

## Risks / Trade-offs

- **[Page weight]** Measured locally: a Browse page is 607 KB for 12 people vs 541 KB for 24 posts on `trade.browse`, over 90% of it the `collections` objekts the thumbnails draw, uncompressed. Not a regression; trimming objekt fields or lazy-loading hidden lists is a separate change.
- **[A page holds up to 240 posts, vs 24 today]** → The 20-post cap per person, and stage 2 is one batched read per page. Measure p95 on staging. If it is slow, drop the cap to 10 and let "+N more lists" fetch the rest.
- **[Idle filter shrinks matches]** → It is intended. Mutual N may drop on deploy, and the spec scenario "Idle list does not count" covers it.
- **[No prefill in Make offer, no "not counted" view]** → Accepted in the spec's REMOVED migration note. Revisit if users ask.
- **[Cursor change]** → `trade.people` is new, so no old cursor reaches it. `trade.browse` keeps its own.
- **[Short sentence hides the other direction]** → The per-list chips carry both directions. Revisit after user feedback.

## Migration Plan

1. Ship the server (`trade.people`, idle filter, cache key bumps) and the web in one deploy. There's no migration.
2. Rollback: redeploy the previous build. Bumped cache keys just repopulate.
3. A later change removes `trade.browse`, `trade.person` and `tradeTheyHave`/`tradeYouHave`, once no pre-deploy tab can be open.

## Open Questions

- ko/ja wording of the header sentences and "+N more lists" needs a native review before release. The copy can change without touching the specs.

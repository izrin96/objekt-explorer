## Context

See proposal.md for why. This is change 6 of the shared-lists chain:

`trade-post-state` → `trade-post-hides-by-row` → `trade-post-planner-shared` → `trade-post-state-contract` → `trade-post-reads-by-row` → **this change** → `offer-reads-post-id` → `shared-lists`.

`list-open-to-retire` was shelved on 2026-11-22: the list-level Open to stays. Paths are under `packages/api/src/` unless they say otherwise. Line numbers are from `ecdbe49f`, whose app code equals production's `0129b5c4`.

**Decisions that bind this change.**
- The owner, 2026-11-16: hides follow the row, and `postId` was output only. This change lifts the second.
- The owner, 2026-11-21: public outputs may break, each break listed by route and field for the owner's yes.
- `packages/api/AGENTS.md`: a `/rpc` input an open tab sends must still validate to the same data.

**What is already true.**
- Every post reader builds a post from its row (`trade-post-reads-by-row`).
- `postsCte` carries `post_id` (`services/trade/feed/query.ts`), and so do For you's candidates and want alerts.
- A feed post's `postId` is its row. Its `id` is the anchor list, and so is `swapPair.theirPostId` (`lib/trade-person.ts:105`, `best.theirLead`).
- Row ids start at 1,000,000, above every list id (`packages/db/AGENTS.md`, Trade posts).
- With one row per list (`planPost`'s refusal, drift check 2), a list id and a post id name the same post. So nothing below changes what a user sees today, except the output fields and a card or report that follows its post through Edit post (Open Question 3).

### Input inventory

"Old tab" is what a tab loaded before the deploy sends afterwards.

| # | Input | Where | Names now | After | Old tab |
| --- | --- | --- | --- | --- | --- |
| 1 | `trade.hidePost` `{ listId }` | `schemas/trade.ts:77`, `routers/trade.ts:236-240`, `services/trade/hidden.ts:97-108`; web `features/trade/actions.ts:170-214`, `post-block.tsx:49-60`, `:270` | the feed's `id`, the anchor list | `postId` | `listId` accepted one release (decision 1) |
| 2 | `trade.unhidePost` `{ listId }` | `routers/trade.ts:242-246`, `hidden.ts:111-119`; web `actions.ts:218-228`, `hidden-partners-dialog.tsx:168-202` | either list of the row | `postId` | as 1 |
| 3 | `moderation.report` `postListId` | `schemas/moderation.ts:79`, `services/moderation/report.ts:91-120`, `:150`; web `features/moderation/safety-dialogs.tsx:29`, `:75`, `safety-menu.tsx:31`, `:64`, `post-block.tsx:377`, `:394-407`, `person-row-view.tsx:215-223` | either half's list id | `postId` | `postListId` accepted one release (decision 1) |
| 4 | Chat post card `{ kind: "post", listSlug, withMatch }`, in `chat.start` and `chat.send` | `schemas/chat.ts:145-149`, `:166-169`, `:182-187`; `services/chat/card-resolve.ts:44-66`; web `person-row-view.tsx:92-99` | the anchor list's slug | `postId` beside `listSlug` | `listSlug` alone keeps today's rule, for good (decision 5) |
| 5 | Stored post card, `message.card` `{ kind: "post", listId, match? }` | `schemas/chat.ts:107-111`; read in `services/chat/cards.ts:157-176`, `services/trade/feed/post-cards.ts:28-148` | the named list | adds `postId` | stored data: both shapes read for good |
| 6 | Report snapshot, `report.post` | `schemas/moderation.ts:166-185`; read in `services/moderation/reads.ts:213-259`, `post-cards.ts:202` (`staffPosts`) | the anchor at filing | adds `postId` | both shapes read for good |
| 7 | `trade.sideItems` path `{listId}` | `schemas/trade.ts:141-153`, `routers/trade.ts:100-113`; web `side-items-sheet.tsx:145` (`side.list.id`) | a side's list | stays a list id (decision 2) | unchanged |
| 8 | `trade.savePost` `replaces`, `trade.takeDownPost` `slug` | `schemas/trade.ts:314-328`, `services/trade/post.ts:27-73`, `:76-92`; web `composer/link.ts`, `actions.ts:268`, `:292` | the owner's post, by anchor slug | stays; `shared-lists` (decision 8) | unchanged |
| 9 | `offer.create` `post` and `wantList`; `offer.suggest` `post` and `lead`; the picker's `fromList` and `wantList`; the offer page's `?post=` | `schemas/offer.ts:178`, `:180`, `:216`, `:218`, `:241`, `:243`; `services/offer/index.ts:142-143`, `core.ts:421-460`; web `features/offers/offer-link.ts:43` | list slugs | stay; `offer-reads-post-id` (decision 9) | unchanged |
| 10 | Lists, not posts: `trade.listMatches` `listId` (`schemas/trade.ts:310`), the viewer's `list` slug on `people`, `mutualCount` and `sideItems`, `trade.unshownEntries` `slug`, chat's `{ kind: "list", slug }` target (`schemas/chat.ts:158-162`) | | a list | unchanged | unchanged |

Two server readers take `swapPair.theirPostId` as a list id: `lib/offer-prefill.ts:112` and `services/offer/picker/index.ts:268-272` (decision 2).

### Outputs

| Route | Field | Now | After |
| --- | --- | --- | --- |
| `trade.people`, `GET /api/v1/trade/people` | `posts[].id` | anchor list id | post id (**public break**) |
| same | `posts[].postId` | row id, nullable | equal to `id`, never null, deprecated (**public break**, Open Question 1) |
| same | `counts.swapPair.theirPostId` | the pair's lead list id | the pair's post id (**public break**) |
| same | `posts[].sides` | have, sale, want | the same order, now documented: the first side is the anchor |
| `GET /api/v1/trade/lists/{listId}/items` | `listId` | a side's `list.id` or a post's `id` | a side's `list.id` only (**public break**, documentation) |
| `trade.myPosts` | `id` | anchor list id | post id |
| same | `postId` | row id | removed: nothing reads it |
| `trade.hiddenPosts` | `postId` | — | added; `listId` stays one release |
| Post card views (`chat.start`'s card, thread reads, `chat_message` events) | `postId` | — | added, null when the post is gone; `listId` stays |
| The console's report reads | `post.postId` | — | added on new reports |

`GET /api/v1/trade/person` carries no post field. `GET /api/v1/trade/collections/{slug}/post-counts` counts per post already. Neither changes.

## Goals / Non-Goals

**Goals:**
- Every input that names another person's post names it by post id. Every output that names a post names it by post id.
- The web keys, finds and addresses posts by post id. Posts keep today's order.
- Open tabs and a rollback to `0129b5c4` keep working.

**Non-Goals:**
- Offers (decision 9). The owner's own post inputs (decision 8). The post page by id (Open Question 2).
- Any migration, hot-read SQL change, worker image change, or change to the list-level Open to.

## Decisions

### 1. Post id inputs, and the legacy key for one release

Each input in rows 1 to 3 gains `postId` (`z.number().int().positive()`). The old field stays optional; at least one must be present. `postId` wins when both are present, and the old field is read only when `postId` is absent, as `packages/api/AGENTS.md` asks.

**The legacy value may be a row id.** An old tab that refetches after the deploy holds the new feed `id`, a row id, and sends it as `listId` or `postListId`. So the legacy value resolves in two steps:
1. If a `trade_post` row has that id, it is that post.
2. Otherwise it is a list, resolved by today's rule:
   - hide: the lowest `post_id` among the posts anchored at the list;
   - unhide: the hides of rows holding the list (`hidesOfSql`);
   - report: `namedPostsOf`.

This is safe because the two id ranges are disjoint. G1 checks that `max(lists.id)` is below `min(trade_post.id)` (task 6.1). The resolution is one pure function, `postRefOf` (`schemas/trade.ts`), plus one SQL branch per service. Its unit cases cover a `postId`, both fields, a legacy list id, and a legacy row id.

**The web sends both fields for this release:** `postId`, and the anchor list id (`sides[0].list.id`) as the old field. A tab that loaded on this build then still works after a rollback to `0129b5c4`. That build's schemas strip `postId` and read the old field. Rejected: `postId` alone. Every Hide post and Report this post… would fail validation after a rollback, until the tab reloads.

**Removal.** The legacy fields, the web's second field and `hiddenPosts.listId` go in the next chain change (`offer-reads-post-id`), once this build has served a day.

### 2. The feed's id is the post id

- **`posts[].id`** becomes `post.anchor.postId` (`services/trade/feed/posts.ts:182`). `postId` becomes the same value, non-nullable, and is described as deprecated (Open Question 1). `trade.myPosts` makes the same change (`services/trade/feed/mine.ts:54-55`) and drops `postId`.
- **The anchor** is the first side. `assemblePost` builds sides as have, sale, want (`lib/trade-feed.ts:185`), so a have or sale list leads, and a want-only post has one side. The schema description says so. An `/api/v1` client finds the old `id` at `sides[0].list.id`.
- **`swapPair.theirPostId`** becomes `best.theirPost`, the pairing's row (`lib/trade-person.ts:105`). Its two server readers take the lead list from `bestPairing` instead:
  - `fillMatches` (`lib/offer-prefill.ts:112`) already holds `best`;
  - the picker (`services/offer/picker/index.ts:272`) calls the pure `bestPairing(partner)`.

  `MatchCounts` keeps its shape. The web's `swapThroughRules` (`apps/web/src/features/trade/person-row.ts:74`) compares `post.id` with `theirPostId`. Both are now post ids, so it needs no edit.
- **`/trade/lists/{listId}/items` keeps a list id.** A side is a list, and a shared list holds the same entries in every post, so a list id is the exact key. Only its description (`schemas/trade.ts:143`) drops "a post's `id`". The web already passes `side.list.id`.
- **Unique ids.** A post id is unique per feed post only if no row reads as two posts. `postsCte` (`services/trade/feed/query.ts:18-46`) folds a row's want side into its lead when both are on Trade and `postPairsSql` holds (`services/trade/lists.ts:40-45`): the want list is a want list of the lead's owner, and the lead offers swaps (`offersSwapsSql`). With owners checked by drift check 3, a row reads as two posts only when both sides are on Trade and the lead is a sale list that takes no swaps (`listedPostsCte` is keyed `(post_id, id)` for that case). The writers never write that row:
  - `planPost` refuses a Sell only post that keeps a pair (`trade_post_list_paired`, `schemas/trade-post.ts:305-320`);
  - `list.edit`'s `takesSwapsColumn` keeps a paired list's flag.

  Drift check 8 makes it a failing check (decision 10), and G1 counts it. A non-zero count stops the rollout.

### 3. Hides by post id

- `hidePost(viewer, postId)` inserts `(viewer, postId)` from `postsCte`, where `posts.post_id = postId` and `posts.user_id <> viewer`. It keeps today's rule: another account's post on Trade, idle or not. Otherwise it is a no-op.
- `unhidePost(viewer, postId)` is `DELETE … WHERE user_id = viewer AND post_id = postId`, through the primary key.
- `fetchHiddenPosts` adds `postId: tradePost.id`.
- The web's optimistic updates already filter by `post.id` (`actions.ts:130-148`), which is now the post id. They take `postId` by name. The Hidden list keys, marks pending and unhides by `postId`.

### 4. Reports by post id

- `reportedPost(target, ref)` reads the row:
  - a row of another account is refused NOT_FOUND, as a mismatched list is today;
  - a row that is gone gives no snapshot, and the report still goes through.
- The snapshot is built from that row's lists, with the lead as the named list (`postSnapshot`, `lib/report-post.ts:46`). It gains `postId`. In `reportPostSchema` that is `z.number().optional()`, since rows filed before carry none.
- **`staffPosts`** (`post-cards.ts:202`) reads a snapshot's `postId` row while that row exists, else its `listId` as today. So the console's live view follows the post (Open Question 3), and a reported list that still exists is never shown as deleted, as `web-moderation` (Reported posts in the console) asks.
- **Specs.** `web-moderation` needs no delta: a report still names one of the account's posts, and the console still shows the post now while its list exists. `web-chat` (Message attaches its card) needs none either: a card whose post no longer holds its list on Trade is a card whose list is "no longer posted on Trade" in that post.

### 5. Post cards by post id

- `postCardInputSchema` gains an optional `postId`.
- `resolvePostCard` keeps its list checks. With `postId`, it also requires that row to hold the named list with that list's side on Trade, else `invalid_card`. It stores `{ kind: "post", listId, postId, match? }`.
- **The view** reads a card with `postId` by its row: the row's post from its on-Trade sides (`postFromRow`), under `visibleOnTrade`. It is null ("Post removed") when the row is gone or has no side on Trade. A card without `postId` reads by its list through `listPostSql`, as today, for good.
- `postCardViewSchema` gains `postId`, the row shown, as `.nullable().default(null)`: a new tab can receive a view from the old build in a `chat_message` event, during the deploy or after a rollback, as the schema's `owner` default already allows (`schemas/chat.ts:303`). The stored card's `postId` is optional, since older cards lack it.
- **The read** is one helper beside `namedPostsOf`: `postsByRowOf(rowIds, listWhere)`. It reads the rows by primary key and their lists by id, in one `Promise.all`. `fetchPostCards` and `staffPosts` use it.
- **Rollback.** Every reader parses `message.card` and `report.post` through `z.object` schemas, which strip unknown keys. So `0129b5c4` reads a new card or snapshot by its `listId`. Task 3.3 checks this against the old schemas, and the reverse (the new schemas parse an old card, snapshot and view) in unit tests.

### 6. Web

The implementer loads `vercel-react-best-practices` before editing any `.tsx`. A repo hook (`require-react-skill.ts`) holds the edit until they do.

- **`anchorOf`** (`features/trade/person-page.ts:32-34`) returns `post.sides[0]`. It compared `side.list.id` with `post.id`, which is no longer a list id.
- **`orderPosts`** (`person-row.ts:28`) breaks ties by the anchor list id (`sides[0].list.id`, descending), not by `id`. This matters because one Bump gives every on side the same time (`bumpPerson`), so ties are common. With this tie-break the order and `leadPost` (the post Message and Make offer address) stay as today. The server's `comparePosts` already breaks ties by `anchor.id`.
- **Keys.** `person-row-view.tsx:262` and `my-posts.tsx:185` keep `key={post.id}`, now unique per post. `hidden-partners-dialog.tsx:172` keys by `postId`.
- **Focus.** `person-page-view.tsx:151` passes `focused.id`, a post id, and `person-row-view.tsx:84` finds it among `person.posts`. No edit.
- **Hide.**
  - `HidePostItem` (`post-block.tsx:49-60`, `:270`) and `useHidePostWithUndo`, `useUnhidePost` (`actions.ts:151-228`) take `{ postId, listId }`. `postId` is `post.id`; `listId` is the anchor list's id.
  - The Hidden list sends `{ postId, listId }` from `hiddenPosts`.
- **Report.** The `post` prop of `useSafetyDialogs` and `SafetyMenu` (`safety-dialogs.tsx:29`, `safety-menu.tsx:31`, `:64`) becomes `{ postId, listId, attachment }`, and `report.mutate` sends `postId` and `postListId`. Its callers are `post-block.tsx:377` and `person-row-view.tsx:220`.
- **Card.** The row's contact card (`person-row-view.tsx:98`) adds `postId: lead.id`.
- **Post page.** `slugTarget` (`person-page.ts:43-53`) stays. It reads slugs through `anchorOf`.
- **Tests.** Update the fixtures in `person-row.test.ts` and `person-page.test.ts` (and `share-preview.test.ts` if it builds posts by `id`). Add cases: `anchorOf` reads the first side; `orderPosts` breaks a bump tie by the anchor list id, whatever the post ids.

### 7. Cache versions

Three caches hold `swapPair` inside `matchCounts`, so their keys bump:
- `trade:person:11` → `12` (`services/trade/matches/index.ts:33`);
- `trade:mutual-people:11` → `12` (`matches/mutual.ts:19`);
- `trade:oneway-people:7` → `8` (`matches/one-way.ts:15`).

Without the bump, a cached `theirPostId` (a list id) would match no post for up to 5 minutes. During the deploy, the old and new builds read different keys. These stay: `trade:mutual-count:10` (a count), `trade:people-order:3` (people), `trade:post:4` (entries).

### 8. The owner's own post inputs stay on slugs

`trade.savePost` (`replaces`), `trade.takeDownPost` (`slug`) and the composer's `edit` name the owner's own post by its anchor slug. They stay as they are:
- `planPost` and the composer key by slug end to end (`schemas/trade-post.ts:284`, `features/trade/composer-choice.ts`, `composer/link.ts`).
- With one row per list, a slug names exactly one post.
- `savePost` already names the edited row by `postRowOf(replaced)` (`services/trade/post.ts:56`).

`shared-lists` rewrites `planPost` and the composer ("Also in"), and that is where a post id input fits. `trade-post-planner-shared` (Inputs) said `savePost` "may" take the edited post's id. This change records that it moves to `shared-lists`.

### 9. Offers stay in `offer-reads-post-id`

Folding the offer inputs in is not small:
- **The builder carries the post as a list slug end to end:**
  - the offer page's `?post=` (`features/offers/offer-link.ts:43`);
  - `OfferStart.matches.post`, `PartnerList` (`schemas/offer.ts:309`) and `post-choice.ts`;
  - `offer.create`'s `post`, `offer.suggest`'s `post` and `lead`, and the picker's `fromList`.
- **The offer rules read lists:**
  - one post per offer checks one list (`onePostVerdict`);
  - Only offers with what I want reads the list's partner (`postWantedAmong`, `services/offer/picker/shared.ts:173`);
  - `partnerListChoices` and `postListsOf` read lists too.
- **Reading `offer.post_id` needs two decisions:**
  - reconcile the window of NULL `post_id` (`packages/db/AGENTS.md`, Trade posts), which is a production write;
  - decide what the 5 offers on re-led posts show (drift note 1).

Even storing a client-sent post id (`services/offer/index.ts:362-366`) needs the builder to know the post id, which is the first point. So `offer-reads-post-id` takes, in one change:
- a `postId` on `offer.create`, `offer.suggest` and the picker;
- `PartnerList` keyed by row, with the row's want list;
- `postWantedAmong`, `partnerListChoices` and `postListsOf` by row;
- the offer page's search by post id;
- "Offer on {post}" read from `post_id`, falling back to `post_list_id`;
- the NULL-window reconcile;
- the removals in decision 1.

### 10. Drift check 8

`apps/worker/src/script/trade-post-drift.ts` gains check 8: "a row that reads as two posts (row ids)". The condition: `lead_on_trade AND want_on_trade AND want_list_id IS NOT NULL`, the lead is a sale list, and `NOT takes_swaps`.

From `postPairsSql`, this is a superset of the rows `postsCte` reads as two posts: a lead off the matchable set (`onTradeSql`) gives one post, and the check still counts it, which errs toward a stop. It fails the run like checks 1 to 7. G1 also counts duplicate `post_id`s in the real `posts` (task 6.1). The header and `apps/worker/AGENTS.md` (Trade post drift) say why: a feed post's id is its row. The script runs from a checkout, so the worker image does not change.

### 11. No migration, no hot-read SQL change

- No hot read's SQL changes. `postsCte`, the feed reads, For you's candidates, collection post counts and want alerts already carry `post_id`. The feed's flip is a mapping in `loadPosts`.
- The reads whose SQL changes are small, keyed reads:
  - `hidePost`'s `INSERT … SELECT` (`postsCte` filtered by `post_id`);
  - `unhidePost`'s `DELETE` (primary key);
  - `fetchHiddenPosts` (one more column);
  - `postsByRowOf` (primary keys);
  - `resolvePostCard` (one more join);
  - `reportedPost` (by row).
- G1 times them through two statements: `postsByRowOf`'s, which `fetchPostCards`, `staffPosts` and `reportedPost` share, and `hidePost`'s `SELECT`. `unhidePost`'s `DELETE` and `resolvePostCard`'s read are by primary key and get a plan only.
- If the diff touches any of these files, the implementer stops and asks: `services/trade/feed/query.ts`, `matches/candidates.ts`, `feed/counts.ts`, `apps/worker/src/job/want-alerts/pairs.ts`, `context.ts`. Each would need the full G1 of `trade-post-reads-by-row`.

### 12. Proof, kept light

- **Pure tests:**
  - `postRefOf`, and that old-tab inputs parse to the same data (`schemas/trade.test.ts`, `report-post.test.ts`, `schemas/chat.test.ts`);
  - `swapScore` names the row (`trade-person.test.ts`);
  - `fillMatches` with a row `theirPostId` (`offer-prefill.test.ts`);
  - `postSnapshot` with `postId`;
  - the web's `anchorOf` and `orderPosts`.
- **Checks:** `bun run check`, `bun run build --filter=web`, `bunx oxfmt --check`.
- **Drift**, read-only, before and after the deploy.
- **One local browser pass** with a hand-made second row (task 5).
- **G1** times the reads that resolve a post id, on production, old against new (task 6.1).
- No frozen reference, differential or mutation testing.

## Risks / Trade-offs

- **[An `/api/v1` client reads `id` as a list id and gets a row id]** → each break is listed for the owner's yes and described in the document. `postId` stays equal to `id` for a release, and `sides[0].list.id` gives the old value.
- **[Old tabs after the deploy]**
  - Hide, unhide and report send a list id or a row id; decision 1 resolves both.
  - Their `anchorOf` falls back to the first side, which is the anchor.
  - Their `orderPosts` breaks ties by post id, so a person's posts may reorder in an old tab until it reloads. This is cosmetic.
  - `swapPair` and `post.id` agree within a response.
- **[New tabs after a rollback]**
  - They send both fields, so hide, unhide, report and cards work.
  - The Hidden list's `postId` key is missing on `0129b5c4`, so React warns about keys until the tab reloads. The list still works.
- **[Disjoint ids]** → G1 checks them. The legacy branch lives one release.
- **[A row that reads as two posts]** → drift check 8 and G1. A non-zero count stops the rollout.
- **[A card or report follows its post through Edit post]** → Open Question 3.
- **[Mixed builds]** → the cache bumps keep each build on its own keys. The worker does not change.

## Migration Plan

1. Save the local baseline (group 0), build groups 1 to 4, then the local proof (group 5).
2. The owner commits and pushes. CI passes.
3. **G1, read-only, with a go-ahead, before the deploy** (task 6.1):
   - the old drift script at 0;
   - the counts;
   - the timing.
4. The owner brings up web. No migrate, no worker rebuild.
5. **G2, read-only, with a go-ahead:**
   - the new drift script at 0, check 8 included;
   - a look at Browse, For you and Your posts;
   - Sentry for an hour.
6. **Rollback:** web `0129b5c4`, at any time, with no data step:
   - new hides are the same rows;
   - new cards and snapshots carry an extra key that the old schemas strip.

   The floor from `trade-post-state-contract` stands: web and worker at `8b05487c` or later.

## Open Questions

Answered by the owner on 2026-11-22. All three recommendations stand. The owner approves the four public API breaks on `GET /api/v1/trade/people` and `/trade/lists/{listId}/items` as listed in the proposal. The owner confirms both scope moves: `offer-reads-post-id` stays separate, and `savePost.replaces` and `takeDownPost.slug` move to `shared-lists`.

1. **Keep `postId` on feed posts for one release?**
   - Recommend yes, equal to `id` and described as deprecated. An `/api/v1` client that adopted `postId` after 2026-11-16 keeps working.
   - What it changes: if no, `postId` goes now, and the break table loses its deprecation row for a removal. Removing it later is its own listed break.
2. **The post page by id: before `shared-lists`, or in it?**
   - Addresses and Copy link stay `/trade/@<handle>/<anchor slug>`, and `slugTarget` takes the first post whose anchor has the slug. That is exact while a list is in one post. Once a list leads two posts, the slug names both.
   - Recommend leaving this to `shared-lists`' design, which already decides how a list in several posts shows (composer "Also in", the list page).
   - What it changes: if it must come first, a change `post-page-by-id` goes before `shared-lists`, with id addresses, a redirect from the slug, and id Copy links. The owner parked that change on 2026-11-16.
3. **A post card, and the console's live view of a reported post, follow the post through Edit post?**
   - Recommend yes. A card names the post that was shared, and a post keeps its id through an edit (`api-openapi`, Trade feed post ids).
   - What it changes: if no, a card shows its row only while the row still holds the card's list, and says "Post removed" otherwise, as a list-keyed card does today.

## As built

Groups 0 to 4 and tasks 5.1 and 5.2, in the `shared-lists-orca` worktree on `ecdbe49f` (app code equal to production's `0129b5c4`). Nothing committed. Scratch: `/private/tmp/claude-501/post-id-inputs/`.

### 0.1 Baseline

- Saved in `baseline/`, from this worktree before any code edit, dev server on port 3211 with `.env.local` (local app database; `DATABASE_URL` checked to be localhost without printing it). Each account in its own isolated browser context, signed in by `fetch` from the loaded page.
- localtest1: `trade.people` with no filter, `match: "any"`, `match: "mutual"` (empty) and `person` = localtest2; `trade.hiddenPosts` (empty); `offer.suggest` for localtest2 as `{ partnerId }`, `{ partnerId, mutual: true }` and `{ partnerId, post, lead }` with localtest2's first post's anchor slug. Screenshots `lt1-browse.png` and `lt1-foryou.png`.
- localtest2: `trade.myPosts`, and `trade.people` with `person` = localtest2.
- Put back: 346 sessions before; the two this made (localtest1, localtest2) deleted; the session ids re-read equal to the list before. No password in the dev log.

### Group 1

- `postRefOf(postId, legacyId)` returns `{ kind: "post" | "legacy", id }` or null; the routers call it, and the services take the `PostRef`.
- `hidePost`'s legacy branch is one statement: `CASE WHEN EXISTS (SELECT 1 FROM trade_post WHERE id = $v) THEN posts.post_id = $v ELSE posts.id = $v END`, which plans as a one-time InitPlan on `trade_post_pkey`. `unhidePost` by `postId` is a `DELETE` by `(user_id, post_id)`; its legacy branch keeps `hidesOfSql` behind the same `CASE`.
- 1.2's check: `EXPLAIN` (no `ANALYZE`) of both `INSERT`s and both `DELETE`s, local, in a read-only session (`transaction_read_only` on): all four planned, `hidden_trade_post` held 0 rows before and after (`hide-explain-local.txt`).

### Group 2

- 2.1: read from the dev server's `/api/v1/spec.json`: `posts[].id` describes the post id, `posts[].postId` is `deprecated: true` with "equal to `id`", `sides` names the order have, sale, want with the first as the anchor, and `/trade/lists/{listId}/items`' `listId` names a side's `list.id` only.
- 2.2: the rows cases in `trade-person.test.ts` now expect the row (101), not the shared lead list (10). New `offer-prefill.test.ts` case "opened from the pair's post, named by its lead list while swapPair names its row" fails if `fillMatches` reads `swapPair.theirPostId` against `post.offerIds`. The picker reads the pair's lead through `bestPairing(partner)` only when `swapPair` is set, so it runs the same statements as before.
- 2.3: `trade:person:12`, `trade:mutual-people:12`, `trade:oneway-people:8`.

### Group 3

- `fetchPostCards` takes `{ listId, postId? }` refs and files each under `postCardKey` (`list:<listId>`, or `row:<postId>:<listId>`), returning the post and the row shown. A row card reads `postsByRowOf` beside `namedPostsOf` for the list cards in one `Promise.all`, and shows the row's post that holds the card's list while one does, else the row's first post.
- `staffPosts` takes the snapshots as refs (same key): the snapshot's row while it exists, else the post that holds its `listId`.
- `reportedPost` reads, in one `Promise.all`, the named list, `namedPostsOf` and `postsByRowOf` for a legacy value, so the row test costs no extra round trip. A report through the list path also records the row it read as `postId`.
- 3.3, rollback parse: from a worktree of `0129b5c4` at `/private/tmp/claude-501/post-id-inputs/old` (kept for 6.1), that build's `storedCardSchema`, `reportPostSchema` and `postCardViewSchema` each parse a new sample, with `postId` stripped and the result equal to the sample without it (`rollback-parse.txt`).

### Group 4

- `HidePostRef` (`{ postId, listId }`) in `actions.ts`; the optimistic updates key by `postId`.
- 4.3's greps. `post\.id` hits only post ids: keys (`my-posts.tsx:185`, `person-row-view.tsx:263`), focus (`person-row-view.tsx:84`), `swapThroughRules` (`person-row.ts:84`), hide (`actions.ts:134`, `:146`, `post-block.tsx:276`), the report (`post-block.tsx:383`) and a test. `listId: post\.id\|postListId: post` has one hit, `safety-dialogs.tsx:79` `postListId: post?.listId`: there `post` is the dialog's `{ postId, listId, attachment }` prop, so it sends the anchor list's id, as decision 1 asks.

### 5.1 and 5.2

- Drift check 8, local, read-only: 0, with checks 1 to 7 at 0 and both notes at 0 (411 rows).
- `bun run check` exit 0. Tests: `@repo/api` 1342 pass and 2 skip (the 7-day `linkRefusal` cases, off while `COOLDOWN_DAYS` is 0), web 1541, worker 552, `@repo/lib` 220, indexer 34, `@repo/cosmo` 58, `@repo/lint` 8, `@repo/email` 6, no failure.
- `bun run build --filter=web` exit 0.
- `bunx oxfmt --check`: the first run flagged two of this change's files (`report-post.test.ts`, `hidden.ts`); formatted, then clean, and `bun run check` ran again after it.
- `git diff --stat ecdbe49f` names none of `feed/query.ts`, `matches/candidates.ts`, `feed/counts.ts`, `want-alerts/pairs.ts` or `context.ts`.

### Found after 5.2

- `services/trade/feed/people.ts:52` keyed each post's cursor time (`atOf`) by the feed row's `id`, the anchor list, and `loadPeople` read it by the assembled post's `id`, which 2.1 made the row. Typecheck cannot see it (number for number), so every person's `newest`, and the next page's cursor, would have read undefined. It now keys by `post_id`. Not in the design's inventory; no SQL changed. Found by sweeping every reader of a feed post's `id` in the API and web after 5.2.

### Deviations

- `postId` on feed posts also carries `deprecated: true` in the OpenAPI document, and `swapPair.theirPostId` gained a description naming it as one of `posts`' ids.
- The web test fixtures in `chat/thread/suggestions.test.ts` and `thread-view.test.ts`, and the `chat_message` case in `schemas/realtime.test.ts`, gained `postId`, which the view schema now carries.
- `trade.ts`' `tradePostInputSchema` refuses an input with neither field (`post_required`), where the old schema required `listId`.
- Between 1.1 and 4.2, `actions.ts` read `postId ?? listId` to keep the web compiling; 4.2 replaced it.
- A report filed through the legacy `postListId` path also stores the row it read as the snapshot's `postId` (decision 4 names `postId` only for the row path), so the console follows that post too. 5.3 (g) will see the extra key.
- None of the new statements has executed against data yet: `hidePost` and `unhidePost` were planned by hand-copied `EXPLAIN` only, and `fetchHiddenPosts`, `postsByRowOf`, `reportedPost`, `staffPosts` and `resolvePostCard`'s `EXISTS` first run in 5.3.
- Local data has no Can swap pair: localtest1's baseline read of localtest2 has `swapPair: null` and Mutual is empty, so 5.3 (c) and the picker's pair read need a pair made by hand to be seen locally.
- Skills: loaded `openspec-apply-change`, `incremental-implementation`, `api-and-interface-design`, `vercel-react-best-practices`, and after 5.2 `supabase-postgres-best-practices` and `writing-for-agents`; not `test-driven-development` or `bun-runtime`.

### Review fixes (after the Opus review)

- **A `postId` that names no row falls back to the old field.** A tab of this build that refetched the old feed during a rollback sends a list id as `postId`, beside the anchor list id. `PostRef` now carries both ids (`postRefOf`), and the pure `resolvePostRef` (`schemas/trade.ts`, unit cases in `trade.test.ts`) resolves them: `postId` when it is a row, else the old field as a row when it is one, else the old field as a list. `postRefSql` (`services/trade/hide-sql.ts`, new) renders that order in SQL for `hidePost` and `unhidePost` as `CASE WHEN EXISTS (row $postId) THEN … WHEN EXISTS (row $legacy) THEN … ELSE <list rule> END`, each `EXISTS` an uncorrelated primary-key `InitPlan`, no rescanned CTE. `unhidePost` by post now goes through the same `CASE` rather than a bare primary-key `DELETE`. `reportedPost` reads `postsByRowOf` over both ids beside the list reads, in the same `Promise.all`, and calls `resolvePostRef`. `resolvePostCard` checks the row only when a row has that `postId` (`NOT EXISTS row OR EXISTS row holding the list`), and stores `postId` only then.
- **The id ranges are checked at G1.** Task 6.1 now reads `lists_id_seq`'s `last_value` and stops within 100,000 of 1,000,000 (local: `last_value` 13,470, `max(lists.id)` 13,403, `min(trade_post.id)` 1,000,000; production is G1's read). 6.1 also times the post-card read (`postsByRowOf` against the old `namedPostsOf`), `hidePost`'s `SELECT` on both branches (by post, and the old tab's legacy `CASE`), and plans `unhidePost`'s `DELETE` both ways and `resolvePostCard`'s read with its `EXISTS`.
- **G1 scripts** in `/private/tmp/claude-501/post-id-inputs/g1/`, commands in `/private/tmp/claude-501/post-id-inputs/G1-RUN.md`. Run on the local database on both builds: every script exits 0; none of their bundles reaches `services/redis` or `env.ts`; `cards-sql.ts`' rebuilt statements equal the real `fetchPostCards` reads, text and values, on both builds (`cards-verify.ts`, local only). Production was not read.

### 5.3 Local proof

Local database only (`DATABASE_URL` checked to be localhost), dev server of this worktree on :3211, and for comparison the old build (`0129b5c4`, 3.3's worktree) on :3212, both on `.env.local`. One isolated browser context per account, sign-in by `fetch` after the page loaded (localtest5 by a local `session` row). Console errors read through a `console.error`/`console.warn` hook installed before each page loads; the hook caught the old build's duplicate-key errors, so it works.

1. Drift, old and new scripts, read-only: every check 0 (411 rows).
2. Saved read-only to `saved/before/`: lists (15), rows (10), entries (45), hides (0), reports (1), messages (235), conversations (3), members, offers (51), `message_pref`, sessions (346 in all).
3. **(a)** localtest1's `trade.people` (no filter, Any, Mutual, `person` = localtest2), `trade.hiddenPosts`, three `offer.suggest` reads, and localtest2's `trade.myPosts` and `person` read: every post's `id` is a `trade_post` row and equals `postId`; the baseline's old `id` was each post's first side's `list.id`; with the post id as the one difference, every file equals 0.1's baseline, post order included (`compare-a.py`). For you's screenshot is byte-identical; Browse's differs in 3×4 pixels of the tab underline's antialiasing. Drift 0.
4. **(b)** Row 1000522 (lead 13168 "lt2 spares", on Trade, no want list) by local SQL. Drift: check 2 reads 1 (13168), every other check 0. localtest1's Browse, For you and localtest2's page, and localtest2's Browse (Your posts) and own page, each show both "lt2 spares" posts with no duplicate-key error and no other console error; `trade.people` and `trade.myPosts` carry 1000522 and 1000303. As localtest1, Hide post on the first "lt2 spares" post through its menu: `hidden_trade_post` holds only (localtest1, 1000522), the person read marks only 1000522 hidden, Browse shows one "lt2 spares" post. Unhide on Hidden on Trade (`/account/hidden`) removed it. Drift as before.
5. **(c)** Local data had no Can swap pair, so one was set up within the approved accounts (`swap-setup.sql`): localtest1's row 1000306 ("lt1 doubles") took want list 13172 "lt1 idntt wants" (whose own row 1000409 was deleted), and localtest2's want list 13403 gained `cream02-yooyeon-111z`; the local trade versions of both were incremented in the local Valkey. localtest2's `message_pref.allow` was `nobody`, which hides Message and Make offer, so it was set to `anyone` for (c) to (g). Result: localtest1's counts for localtest2 are swap 1, `swapPair` `{ myListIds: [13171, 13172], theirPostId: 1000304 }`, and 1000304 is one of the response's post ids (lt2 extras); the old build names it 13169. `offer.suggest` (`{ partnerId }`, with `mutual`, and with `post`/`lead` lt2extras) is byte-identical between the new build and the old on the same data (0.1's baseline predates the pair). Make offer on the counted post opens `/offer?match=row&to=lt2extras` with YooYeon 111Z to give and SunJae 221Z and 222Z to get, the page text identical on both builds. Drift: check 2 only.
6. **(d)** Report this post… on 1000522 through its menu: report 19's snapshot carries `postId` 1000522, `listId` 13168, the have list alone. The console's read (`accountDossier` through the service, read-only) shows that report's post as 1000522's lists, state posted. Drift: check 2 only.
7. **(e)** Message on localtest2's row, sent: the stored card carries `postId` 1000304 (`listId` 13169) and the thread's view names 1000304. Message about this post on 1000522, sent: the stored card carries `postId` 1000522, and its view shows that post (the have list alone, no Wants strip), not 1000303. Drift: check 2 only.
8. **(f)** As localtest2, through `trade.takeDownPost` and `trade.savePost` from the loaded page (the procedures Edit post calls): "lt2 quiet" (13173) off Trade, then Edit post on 1000304 swapping have list 13169 for 13173. Row 1000304 kept its id with lead 13173; 13169 got off-Trade row 1000523; 13173's old row 1000452 went. (e)'s first card now shows the post with "lt2 quiet" and "lt2 wants extras", and its Open post link opens `/lt2quiet`. Drift: check 2 reads 1, and note 1 prints the 9 offers on 1000304 whose row is now led by 13173 (a note, by design, never drift).
9. **(g)** By `fetch` from a loaded page as localtest1, on the new build and the old: `trade.hidePost` and `trade.unhidePost` with `{ listId: 13170 }` hide and unhide row 1000305 on both builds. On the new build, `{ listId: 1000439 }` (a row id) hides and unhides 1000439, and `{ postId: 13170, listId: 13170 }` (a list id as `postId`, the review's rollback case) falls back and acts on 1000305. A card with `listSlug` alone stores `{ kind, listId: 13170 }` on both builds; with `postId` 13170 it stores no `postId` on the new build, and its view reads by the list (row 1000305). `moderation.report` with `postListId` 13170 alone (as localtest5) snapshots that post with `postId` 1000305; with `{ postId: 13171, postListId: 13171 }` (as localtest2) it falls back to the list and snapshots localtest1's pair with `postId` 1000306, equal to the old build's snapshot of `postListId` 13171 (as localtest5) apart from `postId`. Drift as after (f).
10. **(h)** As localtest5: Browse, For you and `trade.myPosts` load with no console error.
11. **(i)** No server error in either dev log. The new build's client logged one React warning, "This library called use() to suspend…", once, during (e)'s first Message about this post, a minute after Vite hot-reloaded `post-block.tsx`; the same flow ran twice more on each build without it. The old build logged 16 "two children with the same key, `13168`" errors, which the new build never logged.

Put back, in one transaction from `saved/before/` (`putback.sql`): rows 1000522 and 1000523 deleted, rows 1000409 and 1000452 re-inserted with their ids, every saved row's and list's columns restored, the entry, reports 19 to 22, the pass's 5 messages, conversation and member state, `message_pref` and the pass's sessions removed or restored. Re-saved to `saved/after/`: all 12 files byte-identical to `saved/before/`. Both drift scripts: every check 0, 411 rows, notes 0. Dev servers stopped, browser contexts closed. The local Valkey keeps the incremented trade versions (cache only).

### Found in 5.3

- `post-block.tsx`'s Message about this post sent its card with `listSlug` alone, so a card from a list's second post resolved to the first: the web-chat scenario "One of two posts holding a list" failed in this path. Task 4.3 named only the row's contact card. It now also sends `postId: post.id`. 5.2 was rerun after it: `bun run check` 0 (`@repo/api` 1344 pass, 2 skip; web 1541; worker 552), `bun run build --filter=web` 0, `bunx oxfmt --check` 0, the stop-list diff empty.
- **6.1, G1** (production, read-only, 2026-11-22, after `0b0a4430` was pushed).
  - Drift: the old script (`0129b5c4`) and the new one, checks 1 to 8, all at 0 over 1673 rows. Note 1 read 11: offers on posts Edit post re-led, information. Note 2 read 9.
  - Counts:
    - `max(lists.id) < min(trade_post.id)` holds;
    - `lists_id_seq` is at 19,014, leaving 980,986 below 1,000,000;
    - decision 10's condition counts 0 rows;
    - the real `posts` show no post id twice (1,499 posts);
    - 1,499 rows and 2,251 lists on Trade.
  - Timing, warm runs, ms. The heaviest three users each hide the next one's largest post:

    | Read | New | Old (`0129b5c4`) |
    | --- | --- | --- |
    | Post cards | by row 0.7 to 0.9 | by list 4.7 to 7.1 |
    | Post cards, by list (the path older cards take) | 4.9 to 13.2 | 4.7 to 7.1 |
    | Hide's `SELECT` | by post 13 to 41 | by list 13 to 48 |
    | Hide's `SELECT`, old-tab branch | 12 to 46 | n/a |

    - The first user's Hide was rerun five more times, since its old-tab median read 1.9 times old's across the first three runs. Over eight runs, the new by-post median is about 22 ms, the old-tab branch's about 22 ms, and the old build's about 26 ms. The spread is production load (the holders scraper), not plan work.
    - No plan has a CTE estimated at 1 row and scanned more than once.
  - Plan-only: `unhidePost`'s `DELETE` both ways and `resolvePostCard`'s read; nothing executed.
- **6.2.** The owner brought up web from `:latest` (`0b0a4430`, CI green) at about 09:38 UTC on 2026-11-22, with no migrate and no worker rebuild. The deploy also carried another session's `35375ed6`, `ec16193a` and `2134ce96` (client IP from `cf-connecting-ip`, the holders cache).
- **6.3, G2** (production, read-only, 09:39 to 09:47 UTC).
  - Drift: checks 1 to 8 at 0 over 1673 rows; notes unchanged (11, 9).
  - Load: right after the restart, about 2 minutes of cold caches (load average up to 13.5). Active queries were holders nickname lookups (`user_address` by address), one 4.4 s market count and feed reads around 1 s. No candidates or hide query piled up. From 09:44 the load average was 2.5 to 7, and Postgres bursts tracked Traefik (the scraper).
  - Sentry: the only issue in the window, WEB-2T (an unhandled rejection on a progress page), was first seen at 09:19, before the deploy, and is unrelated.
  - Rollback floor: web `0129b5c4`, no data step.

### 7.1 Agent docs

Checked against the code as built (`0b0a4430`), with `writing-for-agents` loaded.

- `packages/api/docs/trade.md`: current, no change. Trade matching names `swapPair.theirPostId` as the row with the tie on `PostLeads`; Partner rules names `resolvePostRef` and `postRefSql` (`services/trade/hide-sql.ts`) with the fallback order; Cache versions reads `trade:person:12`, `trade:mutual-people:12`, `trade:oneway-people:8`; Trade posts says a post's id is its row in every output. Neither "no input takes a post id" nor an Edit post that gives a new id remains (the old `postId` description that said so left `feedPostSchema` in 2.1).
- `packages/api/docs/chat.md`: current, no change. Its stored card shape, `resolveCard`'s `postId` check and fallback, `fetchPostCards` by row or list, the report's `resolvePostRef` and `staffPosts` match the code. A report excerpt still keeps a post card by its list only (`services/moderation/report.ts:234`), as the doc says.
- `apps/worker/AGENTS.md`, Trade post drift: current, no change; check 8's text matches the script's header and query.
- `packages/db/AGENTS.md`, Trade posts: added that a legacy post input reads its value as a row id first, which relies on row ids staying above list ids until `offer-reads-post-id` removes that branch, and that G1 checks the lists sequence's room.
- `apps/web/docs/trade.md`, Person and post pages: added that a post's `id` is its row and its anchor its first side (`anchorOf`), what takes each, that Hide post and Report this post… also send the anchor's list id for one release, and `orderPosts`' tie on the anchor list id.
- `packages/api/AGENTS.md`, `apps/web/AGENTS.md` and the root `AGENTS.md` need no change: none names a post's id, these inputs or outputs; the API's domain table already sends `services/trade/` (with `hide-sql.ts`) to `docs/trade.md`, and its open-tab rule is the one this change followed.

**For `offer-reads-post-id`, the removals decision 1 defers** (after this build has served a day):
- the legacy input fields: `tradePostInputSchema.listId` (`trade.hidePost`, `trade.unhidePost`) and `reportInputSchema.postListId`, making `postId` required;
- the legacy resolution: `PostRef.legacyId`, `resolvePostRef`'s old-field branches and `postRefSql`'s second `WHEN` and list `ELSE` (`services/trade/hide-sql.ts`), the list paths of `reportedPost`, and `hidesOfSql` if `unhidePost` was its last caller;
- `resolvePostCard`'s reading of a `postId` that names no row as absent (the card's `listSlug` itself stays, decision 5);
- the web's second field: `HidePostRef.listId` (`features/trade/actions.ts`) and the `listId`/`postListId` the safety dialogs send;
- `trade.hiddenPosts`' `listId`;
- the deprecated feed `postId` (Open Question 1), as its own listed public break;
- the doc sentences that describe each: `packages/api/docs/trade.md` (Partner rules), `packages/api/docs/chat.md` (Chat cards), `packages/db/AGENTS.md` (Trade posts), `apps/web/docs/trade.md` (Person and post pages), and task 6.1's range check.

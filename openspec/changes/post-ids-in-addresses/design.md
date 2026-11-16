# Design

## Context

See proposal.md for why. The rules this design builds on:

- **Rows.** `trade_post` (`packages/db/src/schema.ts:264-287`) has one row per post: `id` (an identity from 1,000,000 up), `user_id`, `lead_list_id` and an optional `want_list_id`. A row is kept through Take off Trade.
- **The planner.** `planPostRows` (`packages/api/src/lib/trade-post-rows.ts:44-93`) works like this:
  - a lead keeps its lowest row;
  - a have or sale list that leads a row keeps leading it, even off Trade;
  - `relead` (`:96-115`) turns an insert into an update only for a row the plan deletes.
- **No public id.** No table has a `public_id` or UUIDv7 column (`conversation.id` is `serial`, `schema.ts:354`). Sequential integers already appear in URLs: `/messages/$id`, `/trade/mine/$tradeId`, `/live/$id`, and the offer page's `?conversation=` and `?counter=`.
- **Slugs.** Every list slug comes from `nanoid(9)` (`services/list/create.ts:141`; the same call in every commit back to `9fb7d3bde`). Its alphabet is `A-Za-z0-9_-` and its length is 9. The column allows 12.
  - An all-digit slug is possible, at about (10/64)^9 ≈ 5.5·10⁻⁸ per list.
  - A post id has 7 digits today, but nothing guarantees the lengths stay apart.
  - So one parameter that takes "slug or id" would be ambiguous. Each address gets its own field or path segment.
  - Not checked: whether production holds an all-digit slug. That needs a read of production, which this change does not need.

### Inventory: where a client sees or sends a post address

All paths are under `packages/api/src` unless they start with `apps/`.

**Inputs (`/rpc`; none of these procedures is on `/api/v1`):**

| Site | What it names | This change |
| --- | --- | --- |
| `offer.create` `post`, `schemas/offer.ts:177` | the partner's have or sale list (anchor slug) | unchanged (D6); resolved by `resolvePostList`, `services/offer/core.ts:437` |
| `offer.create` `wantList`, `schemas/offer.ts:179` | a Buy post's want list slug | unchanged (D6); `resolveWantList`, `core.ts:417` |
| `offer.suggest` `post` and `lead`, `schemas/offer.ts:215,217` | one post's anchor slug; a row's lead post slug | unchanged (D6); `postListsOf`, `services/offer/picker/index.ts:164,378` |
| picker `fromList`, `schemas/offer.ts:230` | a list of the partner's (a side, not a post) | out of scope |
| `trade.savePost` `replaces`, `schemas/trade.ts:299` | the edited post's anchor slug; `planPost` matches `post.anchor.slug`, `schemas/trade-post.ts:279-280` | unchanged (D6) |
| `trade.takeDownPost` `slug`, `schemas/trade.ts:303` | any list of the post | unchanged (D6) |
| `trade.hidePost` / `unhidePost` `listId`, `schemas/trade.ts:77` | the anchor list id | unchanged (hides stay on the list rule) |
| `moderation.report` `postListId`, `schemas/moderation.ts:79` | either list of the post | unchanged (D6) |
| chat card input `listSlug`, `schemas/chat.ts:145-149` | the post's list | unchanged (D4) |

**Outputs:**

| Site | Value | This change |
| --- | --- | --- |
| `trade.people` `posts[].id`, `schemas/trade.ts:202`; set at `services/trade/feed/posts.ts:181` (`/api/v1`) | anchor list id | kept; `postId` added (D2) |
| `trade.people` `counts.swapPair.theirPostId`, `schemas/trade.ts:49,251` (`/api/v1`) | anchor list id, the same as some `posts[].id` in that response | kept, no new field (D3) |
| `trade.people` `posts[].sides[].list.id`, `schemas/trade.ts:170` | a list | kept |
| `trade.myPosts` `id`, `slug`, `services/trade/feed/mine.ts:44-45` | anchor list id and slug | kept; `postId` added (D2) |
| chat post card view `listId`, `post.list`, `schemas/chat.ts:292-323`; built at `services/trade/feed/post-cards.ts:118`; sent in realtime `chat_message` events (`services/chat/live.ts:39`) | the stored list; the anchor now | unchanged (D4) |
| stored chat card `message.card` `{ kind: "post", listId }`, `schemas/chat.ts:107-111` | list id, kept forever | unchanged: `fetchPostCards` resolves it to the post that holds the list now (`post-cards.ts:31-55`), or null |
| offer view `post: { slug, name }`, `schemas/offer.ts:349`, `services/offer/view.ts:207`; `wantedOn`, `:408` | `offer.post_list_id`'s list | unchanged (D5) |
| `offer.suggest` `postSlug`, `wantSlug` | the matches' post anchor slug | unchanged (D6) |
| `trade.hiddenPosts`, `services/trade/hidden.ts:118` | list id and slug of a hide | unchanged (hides) |
| notification alert `latest[].sourceListSlug`, `schemas/notification.ts:37` | a partner's list, not linked as a post | out of scope |
| For you and near matches | the same feed post shape; near matches carry `listIds` | covered by D2 |

**URLs (apps/web):**

| Site | Value | This change |
| --- | --- | --- |
| post page `routes/(container)/trade/@{$handle}/$slug.tsx` | anchor slug; `slugTarget` (`features/trade/person-page.ts:44`) redirects the other half of a pair | unchanged (Deferred) |
| offer page search `to`, `post`, `start`, `features/offers/offer-link.ts:42,45,51` | list slugs; `start` is the side's list the picker opens on, not a post | unchanged (D6) |
| composer search `edit`, `features/trade/composer/link.ts:34` | anchor slug | unchanged (D6) |
| post links: `actions.ts:34` (`useCopyTradeLink`), `post-block.tsx:252,264`, `my-posts.tsx:192,323`, `person-page-view.tsx:314` | anchor slug | unchanged (Deferred) |
| post links: `hidden-partners-dialog.tsx:177`, `chat/thread/post-card-message.tsx:93`, `list/list-link.ts:48` (`tradePostLink`) | a list slug | unchanged |
| Make offer and chat starts: `post-block.tsx:175,192-195`, `chat/thread/thread-view.ts:48-49`, `objekt/drawer/market-listing.ts:36` | slugs into the offer page search | unchanged (D6) |

**Server places that turn an address into lists:** `resolvePostList` and `resolveWantList` (`services/offer/core.ts`), `postListsOf` (`services/offer/picker/index.ts:378`), `planPost` and `postHolding` (`schemas/trade-post.ts`), `takeDownPost` (`services/trade/post.ts:79`), `postPartnerSql` (`services/trade/lists.ts:55`), `viewerPostOf` (`lib/trade-rank.ts`) and `postPairsSql` (`services/trade/lists.ts:40`). This change adds no resolver of a post id: it only reports one.

### What survives what

A link is made to a post, then one event happens. The table shows what each kind of link shows afterwards, with today's planner. "Gone" means the "no longer on Trade" page. H is a have list, W a want list, R the post's row.

| Event | Row id | Id link | Anchor-slug link (Copy link today) |
| --- | --- | --- | --- |
| Buy post W gains have H (H had no row, or had one off Trade: `trade-post-stable-ids` decision 5) | kept, re-led to H | the post H · W | W's slug redirects to H's |
| H deleted, W still on Trade | kept, re-led to W | Buy post W | **gone** |
| Edit post swaps H for H2 | **new** (H keeps R off Trade; H2 gets a new row with W) | **gone** | gone |
| Edit post drops H (Swap post becomes Buy post W) | **new** (W gets a new row) | **gone** | gone |
| Edit post drops W | kept | H alone | H alone |
| Unpair (split) | kept for H; W gets a new row | H alone | H alone |
| Take off Trade, post again | kept | gone, then back | gone, then back |
| Two posts merge (only an off-Trade have list into a live Buy post) | the live post's kept; the other ends | the merged post; the ended id is gone | the want slug redirects |
| Takeover (archived `offer-post-id` case c) | R ends up led by the old W | W's post | H's new post |
| Every list deleted | gone | gone | gone |

So today an id link does better than the anchor slug in one case (a deleted lead). Edit post's swap and drop, the two common lead changes, give both links the same "gone". That is why the owner kept this change to the output field (Owner questions, Q1).

## Goals / Non-Goals

**Goals:**
- The post id is visible wherever the feed shows a post, on `/rpc` and on `/api/v1`, without another round trip.
- One rule maps a list to its post's row. The SQL and a pure twin are tested together.

**Non-Goals:**
- Any URL by post id: the post page by id, the slug redirect, id Copy links (Deferred: post page by id).
- Changing which row the planner keeps.
- Reading `offer.post_id`.
- Any input that takes a post id (D6).

## Decisions

### D1. A post's row: lowest row led by its anchor, else lowest row holding it as want list

A feed post's anchor is not always its row's lead. A want list on Trade can be in a row led by a have list that is off Trade. The composer reaches this through the three steps in archived `offer-post-id`, decision 3(c). The feed then shows the want list as its own post, anchored on the want list.

So the row of a list is: the lowest row whose `lead_list_id` is the list, else the lowest row whose `want_list_id` is the list, else null. This has the shape of `postPartnerSql`, and it gives a row for every post on Trade. The `trade-post-drift.ts` check "a list on Trade that is in no row" keeps that at zero.

- SQL: `postRowSql(alias)` in `lib/trade-sql.ts`. It is pure and imports only `drizzle-orm`. It does not go in `services/trade/lists.ts`, whose import of `moderation/safety` loads `@repo/db`, which a test cannot import.
- TS twin: `postRowOf(rows, listId)` in `lib/trade-post-rows.ts`.
- Pinned together in `lib/trade-sql.test.ts`, as `offersSwapsSql` is.

Two shown posts cannot share a row. That would need a row's lead and want list both shown but not folded into one post. The pairing refusals rule that out: `list_sale_links_sell_only`, and `postPairsSql`'s same-owner and swap conditions. The test asserts it over `pairPosts`.

Rejected: `lead_list_id = anchor` alone. It gives null for the want-anchored case above.

### D2. `postId` beside the anchor list id, added through `feedListColumns`

`feedListColumns` (`services/trade/feed/entries.ts:17`) gains `postId: postRowSql("lists")`, and `FeedList` gains `postId: number | null`.

- Each post's id is `post.anchor.postId`.
- `peopleFeed`'s post object (`posts.ts:181`) and `fetchMyPosts` (`mine.ts:44`) emit it.
- `feedPostSchema` gains `postId: z.number().int().nullable()`, with `.meta({ description })`.

The other `feedListColumns` readers, `post-cards.ts` and `feed/shared.ts`, carry the column but emit nothing new.

- **Cost.** Two index lookups per list read, inside the same statement: `trade_post_lead_list_id_idx`, and the partial `trade_post_want_list_id_idx`. That is the cost `linkedListId` already pays. No new round trip.
- **Name.** `postId` matches `PostId` (`trade-post-rows.ts:2`) and `offer.post_id`, which both mean the row id. `theirPostId` is the older name, and it holds a list id. That stays, because a field never changes meaning.
- **Nullable.** Null only if the rows drift. `documented()` does not validate responses, so this is about the contract, not a runtime failure: the document says plainly that drift can happen, and clients handle it.
- **Caches.** No Redis entry holds assembled posts. `trade:person:10` holds counts, whose `swapPair` is unchanged, and `fetchPostEntries` caches entries per list. So no cache key needs a new version.

### D3. `swapPair.theirPostId` stays a list id, with no twin

Its readers agree on list ids: `swapThroughRules` (`apps/web/src/features/trade/person-row.ts:71-74`), `offer-prefill.ts:110,116`, and `picker/index.ts:272`. An `/api/v1` client gets the post id by matching `theirPostId` against `posts[].id` in the same row (the `api-openapi` scenario). A second field would be a duplicate to keep in step.

### D4. Chat post cards unchanged

A card stores `listId` forever and is resolved live to the post that holds the list (`fetchPostCards`). An old card therefore follows its list, not a row. That is the behaviour `web-chat` describes, and it stays. A `postId` on `postCardViewSchema` would only matter for the deferred id page (it would save the slug redirect there). It would also need `.default(null)`, because the web parses `chat_message` events from the previous build. Left out.

### D5. Offers unchanged

An offer view's post comes from `offer.post_list_id`. A post id there would mean reading `offer.post_id`, or re-deriving it from `post_list_id`. Either way it meets the parked cases (a) to (c) of archived `offer-post-id` and offer 9523's reconcile. Out of scope.

### D6. No input takes a post id

The inputs in the inventory stay as they are. They are `/rpc` only, never on `/api/v1`. The web builds them from live data at the click, and they never outlive a session. A stale composer `edit` already opens as New post with a notice (`web-trade-browse`, Old edit link). If a later change wants one, it resolves at the boundary to the anchor list inside the statement that already reads the list, and the new key wins over the old.

## Risks / Trade-offs

- **[`postId` null from drifted rows]** → The field is nullable and documented so. The drift script reports such a list.
- **[An `/api/v1` client keys on `id` and misreads `postId`]** → A new field only. The document describes both, and the spec states `id` keeps naming lists.
- **[A client stores `postId` as a permanent post key]** → It is stable only as far as What survives what says. The field's description says it stays through most edits, that changing or removing the post's have or sale list gives a new id, and when it is null.

## Migration Plan

1. Commit, push, CI builds web, the owner deploys web. No migration, no worker change (`grep -r '@repo/api/services' apps/worker/src` lists no feed service).
2. Rollback: redeploy the previous web image. No stored state changes.

## Deferred: post page by id

Parked by the owner on 2026-11-16 (Q1). **Prerequisite:** a separate planner change, so that Edit post's swap and drop keep the edited post's row. It applies the idea of `trade-post-stable-ids` decision 5 ("the post a person was editing keeps its id") to a lead swap. It also changes which row an existing `offer.post_id` names after such an edit, which is more of the archived `offer-post-id` case (c). Without that change, an id link beats today's slug link in one rare case only. The notes below are what a later change picks up. They build on this change's `postId`.

- **Route.** `routes/(container)/trade/@{$handle}/p/$postId.tsx`. Its own path segment, since a slug can be all digits (Context, Slugs), and `?post=` on the person page is no separate document for previews and canonicals. The layout's `withHandle` (`features/trade/person-page.ts:10`) keeps the deeper path, so the handle redirect already works.
- **Matching in the browser, no endpoint.**
  - The loader reads the person row through `loadPersonRow`, as `$slug.tsx` does.
  - It picks the post with a pure `postIdTarget(posts, postId)` beside `slugTarget`, plus `parsePostId(param)`: decimal digits only, positive, safe integer.
  - An unknown id, another person's id and an off-Trade or idle id are all "not in this row", so they show the same "no longer on Trade" page.
  - Rejected: a `trade.post({ postId })` read. It is another rate-limited endpoint, and it adds a way to tell whether a row exists.
  - `PersonPageView` takes `postId` beside `slug`.
- **What an old id link shows (was Q3).** The post that has the id now, re-led or not. Gone when the row ended (the ended id of a merge, a lead deleted with its want list off Trade) or the post is off Trade or idle. A redirect to a surviving post would need a record of merges, and a migration.
- **Slug redirect.** In `$slug.tsx`'s loader, a found post (by its anchor, or the other half of a pair) with a non-null `postId` throws `redirect({ to: "/trade/@{$handle}/p/$postId", replace: true })`. That is one hop, and no extra read, since it is the same query key with `staleTime: "static"`. Gone or null `postId` renders as today.
- **Links.**
  - These links would build the id page, falling back to the slug when `postId` is null: `useCopyTradeLink` (`actions.ts:27`), `post-block.tsx` View post and Copy link, `my-posts.tsx` View post and Copy link, and `person-page-view.tsx` `OwnPostActions`.
  - These links hold only a list and stay on the slug through the redirect: `tradePostLink`, chat cards and the hidden-posts dialog.
- **Composer return.**
  - `returnAfter` (`features/trade/composer/link.ts:105`) takes `edited: { slug, postId }`, and recognises the edited post's page by slug (4 segments) or by id (5 segments, segment 3 is `p`).
  - An unchanged anchor keeps `from`. A null anchor goes to `/trade`. A new anchor goes to `/trade/<segment 2>/<anchor slug>`, which the redirect sends on to the id page.
  - `edited.postId` comes from cached `myPosts` data, read in the Save and Take off handlers before the mutation fires. The save refetches `myPosts`, and after a swap or a drop the old slug then names no post.
- **Specs it would modify.**
  - `web-trade-person-pages`: Canonical address, Post page, Post no longer on Trade, Share preview (the canonical URL becomes the id page), plus a new Post address requirement. The Purpose line names the slug URL, so edit it at that change's archive.
  - `web-trade-browse`: the Copy link and View post scenarios of Your posts and Post a list and of Trade card, and Leaving the composer.
- **Integer ids, not a public id (was Q4).** Posts on Trade are public and all listed on `/api/v1`, so an id reveals little beyond how many posts were ever made. Sequential ids are already in URLs (`/messages/$id`, `/trade/mine/$tradeId`, `?conversation=`). No table has a `public_id`. One would be the first, and would need an expand migration and a contract migration, each run by the owner with its own approval.

## Owner questions

- **Q1 (answered 2026-11-16): (a).** This change ships the `postId` output only. The post page by id is parked until the planner change named under Deferred lands.
- **Q2 to Q4:** not needed now. Q2 (inputs by post id) is answered by D6 for this change. Q3 (what an old id link shows) and Q4 (integer ids or a public id) belong to the deferred change, with the recommendations recorded under Deferred.

## As built

2026-11-16, uncommitted on `main` at `5c9ff8e9`.

- **Group 1** as tasked. After review: `postRowSql` takes a required alias (a missing one would compare `post_row.id` with itself), the field's description says when the id changes and when it is null, and the no-shared-row test also covers a sale plus want pair that takes swaps and a Sell-only sale list.
- **2.1** Local dev server on port 3200 (not 3000), with `.env.local` `DATABASE_URL` and `REDIS_URL` both on localhost. `/api/v1/spec.json` lists `postId` as `integer | null` with its description. `/api/v1/trade/people`, signed out: 24 posts, every `postId` an integer, none repeated. `swapPair` was not checked (signed-in only). No write was sent.
- **2.2** `bun run check` passes (26 of 26), `bun run build --filter=web` passes, `openspec validate post-ids-in-addresses --strict` passes.
- **2.3** Read the root, `packages/api`, `packages/db` and `apps/web` `AGENTS.md`. Only `packages/db/AGENTS.md` (Trade posts) changed: it now says that Edit post's swap or drop of the have or sale list gives a new row.
- **Not done, found in review:** the drift script (`apps/worker/src/script/trade-post-drift.ts`) has no check for a row whose sale lead does not take swaps but has a want list. Normal writes cannot make one (`planPost` refuses it, `takesSwapsColumn` keeps swaps on a paired list), but if one existed, both lists would show as two posts with the same `postId`.


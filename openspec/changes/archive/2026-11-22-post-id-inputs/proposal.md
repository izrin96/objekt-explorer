## Why

Every reader builds a post from its `trade_post` row since `trade-post-reads-by-row`, but the inputs and outputs that name another person's post still name a list: Hide post, Report this post, a chat post card, the feed's `id` and `swapPair.theirPostId`. Once `shared-lists` puts a list in two posts, each would pick one post for both, and the web would key two posts alike. Change 6 of the shared-lists chain.

## What Changes

- **Inputs take the post id.** `trade.hidePost`, `trade.unhidePost`, `moderation.report` and a chat post card name a post by `postId`, its `trade_post` row id. For one release each also accepts the old list field, which may hold a list id or a row id an old tab read from the new feed (design decision 1).
- **The feed names posts by post id.** A feed post's `id` becomes its post id; `postId` stays one release as an alias (Open Question 1). `swapPair.theirPostId` becomes a post id. Sides keep `list.id`, and the first side is the anchor. `trade.myPosts` and `trade.hiddenPosts` carry the post id.
- **Stored cards and report snapshots record the post.** New ones store `postId` beside `listId` and read by it; older ones read by their list.
- **The web keys and addresses posts by post id,** fixing the duplicate keys at `person-row-view.tsx:262` and `my-posts.tsx:185`, and keeps today's post order.
- **Three ranking caches change version,** since they hold `swapPair`.
- **A drift check** that no row reads as two posts.

No migration, no worker image change, no hot read's SQL change.

### Public API breaks (each needs the owner's yes)

| Route | Field | Change |
| --- | --- | --- |
| `GET /api/v1/trade/people` | `posts[].id` | the post id, not the anchor list id |
| same | `posts[].postId` | deprecated, equal to `id`, never null |
| same | `counts.swapPair.theirPostId` | a post id |
| `GET /api/v1/trade/lists/{listId}/items` | `listId` | a side's `list.id` only, no longer a post's `id` |

The old `id` is `sides[0].list.id`. `GET /trade/person` and `GET /trade/collections/{slug}/post-counts` are unchanged. `/rpc` output changes: design.md, Outputs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `api-openapi`: Trade feed post ids is replaced by three requirements: feed posts named by post id, a Can swap pair that names a post, and side items that take a list id.
- `web-chat`, Messages and objekt cards: a post card names its post and follows it through Edit post (Open Question 3).

Checked and unchanged: `web-trade-for-you`, `web-moderation`, `web-trade-browse`, `web-trade-person-pages`.

## Routes

- `trade.people` (and `GET /api/v1/trade/people`), `trade.myPosts`, `trade.hiddenPosts`, `trade.hidePost`, `trade.unhidePost`.
- `moderation.report` and the console's report reads.
- `chat.start` and `chat.send` with a post card, and every read that draws one.
- Web: Browse, For you, person and post pages, Your posts, Hidden on Trade.

## Non-goals

- **Offers:** `offer.create`'s `post` and `wantList`, `offer.suggest`, the picker's `fromList`, the offer page's `?post=` and every reader of `offer.post_id` (`offer-reads-post-id`, design decision 9).
- **The owner's own post inputs:** `trade.savePost`'s `replaces`, `trade.takeDownPost`'s `slug`, the composer's `edit` (`shared-lists`, decision 8).
- **The post page by id** (Open Question 2).
- **Dropping the list-level Open to** (the owner keeps it, 2026-11-22).
- **Lifting `planPost`'s one-row-per-list refusal** (`shared-lists`).

## Impact

- `packages/api`: trade, chat and moderation schemas and services; `lib/trade-person.ts`, `offer-prefill.ts`, `report-post.ts` and tests; the picker's pair read; `docs/trade.md`, `docs/chat.md`.
- `apps/web`: `features/trade/`, `features/moderation/`.
- `apps/worker`: the drift script, run by hand; the worker image stays.
- **Deploy:** web only, with a read-only gate before and after.
- **Rollback:** the previous web image (`0129b5c4`), with no data step.

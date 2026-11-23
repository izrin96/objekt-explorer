## Why

Offers still carry their post as a list slug, from the builder all the way to the database. `offer.post_id` has been stored since 2026-11-16, but nothing reads it. Once `shared-lists` puts a list in two posts, one slug will name both posts, and the builder's Offer on choices will collide. This is change 7 of the shared-lists chain. It also removes the one-release fallbacks that `post-id-inputs` left.

## What Changes

- **"Offer on" reads the offer's post.** The line shows the `post_id` row as it is now. If that row is gone, it shows `post_list_id`'s list. If both are gone, it shows nothing (Open Question 1).
- **Offer inputs name posts by id.**
  - `offer.create` and `offer.suggest` take `postId`.
  - The builder keys Offer on by post id.
  - The offer page's search carries `postId`.
  - The slug fields (`post`, `wantList`, `?post=`) are still read for one release, and the web sends both shapes during it.
  - `fromList`, the picker's `wantList`, `lead`, `to` and `start` name lists, so they stay as they are.
- **The rules take the named post.**
  - `createOffer` stores the named row.
  - Only offers with what I want reads that row's want list.
  - The theirs list adds `posts[]`, one choice per row; `lists[]` stays.
  - `offer.suggest` reads the named row.
- **`post-id-inputs`' fallbacks go:**
  - the legacy list-id inputs;
  - the row-id-first reading;
  - `trade.hiddenPosts`' `listId`;
  - the feed's deprecated `postId`.
- **Drift note 1 retires.** It counted offers on a post another list now leads, which is now the intended state.
- **Backfill.** A one-off write, approved before it runs, fills `post_id` on drift note 2's 9 offers (Open Question 3).

No migration. `offer.post_list_id` stays (Open Question 2).

### Public API break (needs the owner's yes)

| Route | Field | Change |
| --- | --- | --- |
| `GET /api/v1/trade/people` | `posts[].postId` | removed; `id` holds the same value |

### Open tabs

- Tabs loaded on `0b0a4430` keep working.
- Older tabs fail on Hide post and Unhide until they reload; their Report this post… files the report without the post (design decision 8).
- G1 checks that `0b0a4430` has been live for a day before this deploys.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-offers`, The post an offer is on: the line reads the post as it is now, and falls back to the list the offer was sent on.
- `api-openapi`, Trade feed posts named by post id: `postId` goes.

Checked and unchanged: `web-chat`, `web-moderation`, `web-trade-browse`, `web-trade-person-pages`.

## Routes

- Offers: `offer.create`, `offer.suggest`, `offer.candidates`, `offer.views`. Offer reads in chat threads, the trade page and My trades also change.
- Trade: `trade.hidePost`, `trade.unhidePost`, `trade.hiddenPosts`, `trade.people` (and `GET /api/v1/trade/people`).
- Moderation and chat: `moderation.report`; post cards in `chat.start` and `chat.send`.
- Web: the offer page and every Make offer, the offer card, Hidden on Trade, and Report this post….

## Non-goals

- `shared-lists` work:
  - lifting `planPost`'s refusal;
  - labelling two Offer on choices that share a list;
  - `offer.suggest`'s choice among a shared list's posts;
  - `savePost.replaces` and `takeDownPost.slug`.
- Removing this change's own slug fallbacks. That happens in the next change after a day.
- Dropping `post_list_id`.
- A link from "Offer on" to the post.
- Moving `offer.post_id` when posts merge (design decision 2).

## Impact

- **Code:** `packages/api` (offers, the picker, the fallbacks, three docs); `apps/web` (`features/offers/`, `features/trade/`, `features/moderation/`, `thread-view.ts`); the worker's drift script, with no image change.
- **Deploy:** web only, behind read-only gates G1 and G2; the backfill runs apart, with its own approval. Rollback: web `0b0a4430`, no data step.

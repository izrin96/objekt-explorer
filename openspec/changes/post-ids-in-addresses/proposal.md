# Proposal

## Why

A Trade post is addressed by its anchor list: the feed's `posts[].id` is that list's id. Since `trade-post-stable-ids`, a post's `trade_post` row id outlives some anchor changes. For example, it stays when a Buy post gains a have list, while `posts[].id` flips to the new list. A client that keys posts by row id, `/api/v1` callers included, therefore has a steadier key. This is the first part of the backlog item "Post ids in URLs, inputs and `/api/v1`" (`design/backlog.md`).

The owner answered Q1 on 2026-11-16 with option (a): this change ships the output field only. The post page by id (`/trade/@<handle>/p/<id>`, a slug redirect, id Copy links) is deferred. Its prerequisite is a separate planner change, so that Edit post's swap and drop keep the edited post's row. Today they give it a new one, so an id link would beat a slug link in one rare case only (design.md, What survives what).

## What Changes

- Each feed post (`trade.people`, also on `/api/v1`) and each `trade.myPosts` entry carries `postId`, its `trade_post` row id. It is null only when the rows have drifted.
- `posts[].id`, `swapPair.theirPostId`, `sides[].list.id` and every other field keep their meaning.
- No input changes. Open tabs and `/api/v1` callers send what they send today.

## Non-goals

- The post page by id, a slug redirect to it, and id Copy links. Deferred, with notes in design.md, Deferred: post page by id.
- The planner change that keeps the row through Edit post's swap and drop. It is its own change.
- Optional `postId` inputs beside any slug or list-id input.
- Hides: they stay on the list rule (owner decision 2026-11-16).
- Any reader of `offer.post_id`, and any post id on an offer view or a chat card.
- Any migration, column or public id.

## Routes

- `GET /api/v1/trade/people` (`/rpc` `trade.people`): the response gains `posts[].postId`.
- `/rpc` `trade.myPosts`: the response gains `postId`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `api-openapi`: the Trade feed's posts carry a stable post id beside the anchor list id.

## Impact

- `packages/api`:
  - `lib/trade-sql.ts` and `lib/trade-post-rows.ts`, with their tests;
  - `services/trade/feed/entries.ts`, `posts.ts` and `mine.ts`;
  - `schemas/trade.ts`;
  - `docs/trade.md`.
- `apps/web`: no code change. Its types pick up `postId` from the API.
- No database migration. No worker change.

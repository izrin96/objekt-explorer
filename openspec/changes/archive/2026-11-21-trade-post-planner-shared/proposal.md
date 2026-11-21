## Why

The post planner (`planPostRows`) plans a person's whole `trade_post` set from their lists, one partner per list. With a list in two rows, any ordinary write (a delete, Take off Trade, an edit to another post) would strip the second row. Step 3 of the shared-lists chain makes the write side row-addressed, so one list can sit in several posts, before any UI lets a person share a list (`shared-lists`, step 8).

## What Changes

- **A write plans only the rows it touches.** `planPostWrite` runs today's row rules over the write's rows (its component) and leaves every other row alone. The rules don't change, so every write gives today's rows, Edit post aside. Whole-set repair goes.
- **Edit post keeps its row** when any of its lists is swapped or dropped (Open Question 9). Its `postId` stays, and so does a hide on it. Today it gets a new row.
- **Each post's Trade state comes from the write.** The sides a write names take the write's on, off, Open to and `takes_swaps`. A list that moves into another row brings its old side's state. A turn-on takes the person's bump time, which is read once under the lock.
- **`lists.discoverable` is derived.** It means "on Trade in some post", and `bumped_at` is the latest bump of the list's sides. `writePosts` writes both under the person's lock. The writers stop writing them.
- **The planner handles shared lists.** In the pure module, a write can add a row for a list that is already in a post, and dropping a list from one post leaves the list's other posts. Hide moves stay inside the write's rows. `trade.savePost` still refuses a list that is in another post, so production keeps one row per list.
- **Want alerts** read the partner's `takes_swaps` and Open to from its post's row, not from its list.
- **Drift:** checks 5 and 6 are rewritten from "a row equals its lists" to "a list's flag agrees with its rows", plus row-level checks. Check 2 still fails.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-for-you`, Hide a post: an edit that swaps or drops any of the post's lists keeps the post hidden (Open Question 9).
- `api-openapi`, Trade feed post ids: that edit keeps `postId`.

Checked and unchanged: `web-trade-browse` (Composer list rules, Edit and take off a post), `web-trade-offers` (The post an offer is on), `web-trade-person-pages`, `web-notifications`.

## Routes

- `/trade/new`: Edit post, Post a list, Take off Trade (`trade.savePost`, `trade.takeDownPost`).
- List create, copy and delete (`list.create`, `list.copy`, `list.delete`).
- The For you and Browse hides, and `GET /api/v1/trade/people` `postId`.
- The worker's want alerts.

## Non-goals

- **Lifting the composer's refusal, "Also in", or any `.tsx` or string change.** That is `shared-lists`.
- **Moving readers to rows** (`trade-post-reads-by-row`).
- **Post-id inputs** (`post-id-inputs`).
- **Dropping `lists.bumped_at`,** moving `personBumpedAt` and `lastBumpOf` to rows, or deciding the two `lists` indexes (`trade-post-state-contract`).
- **Any migration or schema change.**
- **What `offer.post_id` names after an edit.** Nothing reads it yet. `offer-reads-post-id` decides.

## Impact

- `packages/api`:
  - `lib/trade-post-rows.ts` and both of its tests;
  - `schemas/trade-post.ts` and its test;
  - `services/list/shared.ts`, `create.ts` and `edit.ts`;
  - `services/trade/post.ts`;
  - `docs/trade.md`.
- `apps/worker`: `job/want-alerts/pairs.ts`, `context.ts`, `lib/want-alert-match.ts` and its test, the drift script, `AGENTS.md`.
- `packages/db`: `tradePost`'s doc comment in `schema.ts` and `AGENTS.md`. No migration.
- **Deploy:** web and worker from one commit, in either order, with a read-only drift gate before and after. No migration.
- **Rollback:** the previous web and worker (`70c82fb3`). The model test proves that its planner plans nothing over the rows this build writes.

## Why

A hide names a list (`hidden_trade_post.list_id`) and covers "the other list of the row that list is in". Once one list can sit in several posts (shared lists, step 2 of 7), that has more than one answer. The owner decided on 2026-11-16 that a hide names the post's `trade_post` row, and set how it follows a post through a lead delete, a split, a re-post and a merge.

## What Changes

- `hidden_trade_post.post_id`: a foreign key to `trade_post(id)`, `ON DELETE CASCADE`, and the primary key with `user_id`. `list_id` stays, nullable, `ON DELETE SET NULL`, only so that a rolled-back build still reads hides.
- One rule: a hide covers the lists of its row, whatever their Trade state. The feed, matching, Hide post, Unhide, the Hidden list and the worker's alerts and unhides read and write by row.
- A hide follows its post's lead list:
  - **Merge:** the hide moves to the row that survives.
  - **Takeover:** when a row is handed to another list while its lead lives on elsewhere, the hide goes with the lead.
  - **Lead deleted while the want list is on Trade:** the hide stays on the re-led row.
  - **Split:** the hide stays on the lead's row.
  - **Row ends:** the hide ends with it.
- `planPostRows` reports the moves. `writePosts` applies them in the same transaction, before it deletes rows.
- **Expand migration:**
  - backfills `post_id`;
  - deletes the 2 hides on a list in no row;
  - folds two hides of one person on one row into the newer;
  - adds a `BEFORE INSERT` trigger, so the build still live writes hides with a row.
- **Drift:** one check (a hide on its hider's own row), check 7 after `trade-post-state`'s six, and one note.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-for-you`, Hide a post:
  - **The rule:** a hide ends with its post, not with "the list it was hidden by".
  - **Changed scenario:** "The hidden list is deleted". The re-led Buy post stays hidden.
  - **New scenarios:**
    - the lead is deleted while the want list is off Trade;
    - a hidden Buy post is paired, then unpaired;
    - two hidden posts are merged.

Checked and unchanged:

- `web-trade-for-you`: the other Hide a post scenarios, Hidden posts leave matching, Hidden posts list, and A hidden post comes back.
- `web-trade-person-pages`, Hidden post on the person and post pages.
- `web-notifications`, Want-list alerts skip hidden posts: "a list of a post the user has hidden" now means a list of its row.

## Routes

- `/trade`, `/trade/for-you`, `/trade/@{handle}`, `/trade/@{handle}/{slug}`
- `/account/hidden`, and the Hidden dialog from Browse's footer note
- want-list alerts (worker)

## Non-goals

- Post ids as inputs or outputs. `hidePost` and `unhidePost` keep `{ listId }`, and `hiddenPosts` keeps its shape (`post-id-inputs`).
- Comparing row ids in the feed or in match candidates (`trade-post-reads-by-row`).
- Edit post keeping its row when the have list is swapped or dropped (`trade-post-planner-shared`).
- Dropping `list_id` and the trigger.
- Offers, any `.tsx` change, any new string.

## Impact

- `packages/db`: `schema.ts`, and one migration.
- `packages/api`:
  - `lib/trade-post-rows.ts` and its tests;
  - `services/list/shared.ts`;
  - `services/trade/lists.ts` and `hidden.ts`;
  - `docs/trade.md`.
- `apps/worker`: `job/want-alerts/record.ts`, the drift script, `AGENTS.md`. The image is rebuilt.
- `apps/web`: none.
- **Expected on the day of the deploy:** production hides the same posts and lists as before.
- **Deploy order:** the migration, then web, then worker.
- **Rollback:** the build before this change (web B and worker B, `1568f6b1`, or web A, `2f107ab3`, the floor `trade-post-state` set) keeps working, except that its merges drop a hide instead of moving it.

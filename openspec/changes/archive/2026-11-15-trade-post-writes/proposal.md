## Why

Since `trade-post-reads`, every read of a post's pairing outside a write path reads `trade_post`. Writers still work the other way: each one writes `lists.linked_list_id` on both lists and derives the rows from it (`syncPostRows`). The column cannot be dropped while it is the writers' source of truth. This change is phase 4 of the owner's rollout: the rows become the write side's source of truth too, so that `trade-post-contract` only has to delete things.

## What Changes

- Writers stop writing `lists.linked_list_id`. Each writer takes `lockPosts` (`lockTradeLists`, then a fresh read of the person's lists and rows), states its pairing change (a pair to make, lists to unpair), and hands it to one function, `writePosts`, which:
  - applies the change to the partners the rows give, through a pure, tested `planPostWrite`;
  - plans the rows with `planPostRows`, as today, and writes them;
  - when the write pairs, unpairs or changes a row, runs one `UPDATE` that sets `linked_list_id` from the rows.
- `lists.linked_list_id` becomes a mirror. The mirror holds exactly what today's writers leave: both lists of a pair name each other, and every other list holds null. Nothing reads it except that mirror write and the drift script.
- The reads inside write paths move to the row:
  - `lockTradeLists`' partner, now from `lockPosts`' fresh read;
  - `openToColumns`' `CASE` and `openToEdit` in `list.edit`;
  - `deleteList`'s partner;
  - the stale-link clears in `writeList` and `savePost`, which the pure function replaces;
  - the raw `linkedListId` that `list.find` returns, now filled from the row.
- `list.edit`, when it saves Buying only on a want list that is off Trade, takes `lockTradeLists` first. A read of the row inside its `UPDATE` would otherwise miss a pair made by a writer that the `UPDATE` waited for (design decision 5).
- Proof: `trade-post-rows.model.test.ts` becomes a differential test of the pure rule against today's link SQL transcribed as pure functions. A local write pass, approved row by row, runs every writer's SQL, checking links and rows after each step.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. No user, open tab or `/api/v1` caller can see the change, so `.openspec.yaml` sets `skip_specs: true`:

- every writer gives the same refusals, in the same order;
- every write leaves the same `lists` and `trade_post` state and touches the same lists;
- `/rpc` inputs are unchanged: `createListInputSchema.linkedListId` keeps its name and meaning;
- `list.find` still returns `linkedListId`.

Read, and kept as they stand: `web-lists` (Open to, linking, copy), `web-trade-browse` (one post per list, unpair and use it, Edit post, Take off Trade) and `web-account` (deletion).

## Routes

No route changes. The changed writes sit behind:

- `/trade/new` (`trade.savePost`);
- Take off Trade (`trade.takeDownPost`);
- `/list`: create, copy, edit and delete (`list.create`, `list.copy`, `list.edit`, `list.delete`), and the edit form's `list.find`;
- `/account/danger` (unchanged code).

## Non-goals

- Dropping `lists.linked_list_id`, its index or its foreign key, and renaming `linkedListId` anywhere. Those belong to `trade-post-contract`.
- Stable post ids. The planner still deletes and re-creates a row where it does today.
- Any migration, schema change, `.tsx` change, or change to the row rule.
- `discoverable`, `bumped_at`, Open to and `takes_swaps`. They stay on `lists` and are written as today.

## Impact

- `packages/api`:
  - `lib/trade-post-rows.ts` and its two tests;
  - `services/list/shared.ts`, `create.ts`, `edit.ts` and `read.ts` (`findOwnedList`);
  - `services/trade/post.ts`;
  - `docs/trade.md` and `docs/lists.md`.
- `packages/db`: the `tradePost` doc comment and `AGENTS.md`. No migration.
- `apps/worker`: the drift script's header comment and `AGENTS.md`. The worker runs none of the changed code.
- `apps/web`: none.
- One web deploy; rollback is the previous image, at any time.

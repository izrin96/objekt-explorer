## Why

A Trade post is not a row today. It is a have or sale list, optionally linked to a want list, and every read pairs the lists again. The owner wants a `trade_post` table for two reasons: an id that belongs to the post, and a home for per-post rules, pause, a note and, later, one list in more than one post. This change is the first, write-only slice: the table exists, is filled, and stays in step with the lists. Reads move later.

## What Changes

- A new `trade_post` table. Each row has a lead list (the have or sale list, or the want list of a post with no have or sale list) and at most one want list. A row outlives Take off Trade.
- An expand migration, and a backfill that gives every link and every list on Trade its row. A guard in the backfill stops the migration if the link data breaks a rule the rows rely on.
- Every writer of a link or of Trade state recomputes the person's rows in the same transaction, under `lockTradeLists`, through one pure planner. Those writers are `trade.savePost`, `trade.takeDownPost`, `list.create`, `list.copy`, `list.delete` and account deletion. The planner works out the person's whole row set, so any write by a person also repairs rows that went stale for that person.
- A fix the planner needs: `list.create` and `list.copy` take the lock for every have, want and sale list, not only one that links, since `/rpc` accepts `discoverable` on create.
- A read-only drift script that compares the rows with the links and Trade state on `lists`.
- Nothing reads the table yet. `hidden_trade_post` and `offer` are untouched.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. No user, open tab or `/api/v1` caller can see the change, so `.openspec.yaml` sets `skip_specs: true`. Checked, with no change: `web-trade-browse`, `web-trade-for-you`, `web-trade-person-pages`, `web-trade-near-matches`, `web-trade-offers`, `web-lists`, `web-notifications`, `web-market`, `web-moderation`.

## Routes

No route changes. Rows are written behind `/trade/new` (`trade.savePost`), Take off Trade, `/list` create, copy and delete, and `/account/danger` (account deletion).

## Non-goals

- Any read of `trade_post`, a `post_id` on hides or offers, and any change to hides.
- Dropping or moving any column of `lists`.
- Post ids in URLs, inputs or outputs.
- Per-post rules, pause, a note, shared lists, post history, caps on posts.

## Follow-ups, in order

1. **`trade-post-reads`**: a reconcile migration, every post read moved to the table, and hides and offers keyed by post. Its known design inputs are in design.md ("Inputs for `trade-post-reads`"). In short:
   - hides must follow the list they were made on through an unlink or a lead delete;
   - linking a Buy post to an off-Trade list must not drop its hides;
   - `hidePost` needs `ON CONFLICT … DO UPDATE`;
   - at least three hide behaviours change and need spec deltas;
   - the reconcile re-derives every hide's `post_id`;
   - the drift script gains its legacy-against-new comparisons;
   - the hide index is `(user_id, post_id)`.
2. **`trade-post-contract`**: stop writing `lists.linked_list_id`, `hidden_trade_post.list_id` and `offer.post_list_id`, and drop them. This is the point of no return.
3. **Post addresses**: a post id that survives unpairing, in inputs and `/api/v1` output.
4. Per-post offer rules, 5. Pause, 6. Post note, 7. Shared lists.

## Impact

- `packages/db`: `schema.ts`, `relation.ts`, and two migrations (expand, backfill).
- `packages/api`: `services/trade/post.ts`, `services/list/create.ts`, `services/list/edit.ts` (`deleteList`), `services/list/shared.ts`, `services/account/anonymize.ts`, a new `lib/trade-post-rows.ts` with its tests, and `docs/trade.md`.
- `apps/worker`: a read-only script, `script/trade-post-drift.ts`.
- `apps/web`: none.

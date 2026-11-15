## Context

`planPostRows(rows, lists)` (`packages/api/src/lib/trade-post-rows.ts`) keeps, per lead list, its lowest row; it updates that row's want list, inserts a row for a lead that has none, and deletes what is left. `planPostWrite` applies a write's pairing to the partners the rows give, models what the foreign keys did to the rows of removed lists (`lead_list_id` CASCADE, `want_list_id` SET NULL), and calls `planPostRows`. `writePosts` runs the deletes, the updates, then the inserts. `deleteList` deletes the list first and calls `writePosts` with `removed` afterwards.

So a row's identity is its lead list. The two cases in the proposal change the lead of what a person sees as one post, and the row id changes with it.

## Goals / Non-Goals

**Goals:**
- A post keeps its row id through "gained a have list" and "lost its lead, want list still on Trade".
- The rule is one pure, tested property of the planner, so a later writer cannot break it without a failing test.

**Non-Goals:**
- Keeping an id through a merge of two posts or for both halves of a split. One id must end, or one must begin.
- `lead_list_id` becoming nullable or SET NULL, `post_id` on hides and offers, ids in URLs: later phases.
- Any change to which lists are in a row after a write.

## Decisions

### 1. Re-lead in `planPostRows`, as a last step over its own plan

After the existing plan is made, pair each insert with a doomed row: a row in `deletes` whose lead is the insert's want list (the Buy post that gained a have list). The insert and the delete become one update `{ id, leadListId, wantListId }`. Lowest row id first, each row used once.

Doing it as a step over the finished plan keeps the three rules of the doc comment as they are, and makes the property checkable on any plan: **no plan deletes a row and inserts a row that holds one of its lists.**

Alternative: key rows by "post" rather than by lead from the start. Refused: there is no post identity but the row, and the lead-keyed plan is what the differential test already proves equal to the old link writes.

### 2. `planPostWrite` re-leads a removed lead's row itself

For a removed lead whose row has a want list that will lead a row after the write (it is on Trade and no other list takes it), the plan emits an update of that row to `{ leadListId: want, wantListId: null }` and no insert. For every other removed list it emits what the foreign keys would have done, explicitly: a delete of the removed lead's row, an update clearing a removed want list. The plan no longer assumes the foreign keys ran.

### 3. `deleteList` writes the rows, then deletes the list

`writePosts` runs before `tx.delete(lists)`, inside the same transaction and under the same `lockPosts`. After it, no row names the list, so the delete fires no cascade. The `removed` field of `PostWrite` keeps its name and now means "lists this write is about to delete".

`anonymizeUser` is unchanged: it deletes every list of the person under `lockTradeLists`, and the cascade takes every row.

### 4. `writePosts` order

Deletes, then updates, then inserts, as today. An update may now set `lead_list_id`. No unique index exists on either list column, so no order of these statements can collide.

### 5. A merge keeps the row of the post that was on Trade

Revised during apply, with the owner's agreement. `savePost` refuses a list that is in another post on Trade, so the one merge a person can make is a Buy post on Trade gaining a have list that is off Trade and still has a row from before. Keeping the lead's row there would change the id of the post being edited and keep the id of a row nobody sees.

`planPostRows` takes an optional `live` set: the lists that were on Trade before the write, which `planPostWrite` builds from the state it read. When a lead and the want list it takes both have a row, and the want list was live and the lead was not, the want list's row stays and gets the lead; the lead's row is deleted, or taken over by the lead's old want list if that one now needs a row. In every other merge (both live, the lead alone, neither, or no `live` given) the lead's row stays, as the lead is what a post is anchored by elsewhere (`postsCte`'s anchor, `theirPostId`, `replaces`).

### 6. Proof

- Unit tests for the two re-lead cases, the merge and the split, and the property above over the differential test's random runs: after every planned write, no deleted row shares a list with an inserted row.
- The differential test compares the legacy link world with the row world. Both call `planPostRows`, so decision 1 keeps their ids equal. Decision 2 does not: the legacy world models the cascade and inserts a new row. The comparison of rows therefore ignores ids, and the id property is asserted on the row world alone.
- A local write pass through the service functions, with the owner's approval for the local rows: a Buy post paired with an off-Trade have list keeps its row id; a pair's lead deleted keeps the row id for the want list; a lead deleted with its want list off Trade loses the row; a merge keeps the lead's id. The drift script reads zero after it.
- The two-writers rounds of `trade-post-writes` rerun locally, since `deleteList`'s statement order changes.

## Risks / Trade-offs

- **[`deleteList` reorders its statements.]** A mistake leaves a row naming a deleted list for an instant, which the foreign keys then clean, or deletes a row the want list needed. → The write pass asserts the rows after each delete; the drift script's "a list on Trade that is in no row" catches the second.
- **[The planner grows a step.]** → It is a step over the finished plan with one stated property, tested on random runs.
- **[Rows written by this build, read by an older one after a rollback.]** → A re-led row is an ordinary row; `c66841be` and later plan from it without change.

## Migration Plan

1. The owner commits and pushes; CI builds web. No migration.
2. Deploy web. The worker runs none of the changed code.
3. With the owner's go-ahead, the drift script read-only on production reads zero.

## As built

- **The planner.** The re-lead is one step over the finished plan, as decision 1 says, and wider than it: an insert takes over any row the plan deletes that holds one of the insert's lists, lowest row id first, each row once. That one step covers both cases, so decision 2 needed no code of its own: `planPostWrite` now hands `planPostRows` the rows as they are, with the removed lists left out of the lists, and the plan deletes a removed lead's row, empties a removed want list's row, or re-leads. The rows without the removed lists are still computed, for the partners only.
- **Checks:** `bun run check` passes; `bun run build --filter=web` builds.
- **Tests:** unit tests for the two re-lead cases, a new sale list taking over a Buy post's row, a lead gone with its want list off Trade, two doomed rows taken over in id order, and the removed-list cases of `planPostWrite`. In the random runs every plan is checked before it is applied: no deleted row shares a list with an inserted row; 816 rows changed their lead and kept their id. In the row world a delete now writes the rows first and asserts the foreign keys then change nothing. With the re-lead step switched off, both random tests and four unit tests fail.
- **The differential comparison ignores row ids**, as decision 6 planned.
- **Local write pass**, through the service functions from scratch scripts inside `apps/worker` (deleted), which refuse to start unless the database and Redis are local. Run under "apply", without asking again for the local rows; the task text that asked for an approval was mine and is removed. As `localtest2`, asserting the rows with their ids and the three drift counts after each step:
  - a have list created paired with the Buy post `lt2 wants`: row `1000423` became `have → lt2 wants`, same id;
  - that lead deleted with `lt2 wants` on Trade: row `1000423` back to `lt2 wants` alone, same id;
  - a have list paired with an off-Trade want list, then deleted: its row went;
  - a want list created paired with `lt2 extras`, then deleted: row `1000304` gained it and was emptied, same id;
  - **merge**, the way the composer reaches it, rerun after decision 5 changed: a Buy post (row `1000452`) edited into a swap with `lt2 quiet`, which was off Trade and kept row `1000307`. Row `1000452` stayed and became `lt2 quiet → want list`; row `1000307` went;
  - **split**: `lt2 quiet` posted alone again kept row `1000452`; the want list went off Trade with no row.
  All held. The Trade state ended as it began; `lt2 quiet` now leads row `1000452`.
- **Not reachable through `savePost`:** a merge of two posts that are both on Trade. It refuses a list that is in another post on Trade (`That list is already in another post on Trade`), as the composer greys it out.
- **Two writers at once**, local: five rounds behind a held lock (a have list created on the Buy post then a take-down; a lead deleted then a create; a paired want list deleted then a create; a create then a delete; a lead deleted then a Buy post) and 40 rounds of up to three writers with lead and want-list deletes among them (86 writes done, 21 refused by the post rules). Three drift counts zero after every round, no error but a refusal. The local drift script read zero.
- **Local data after the runs:** every list has the Trade state it had. `lt2 wants` leads row `1000439` (was `1000423`): in the last round its lead was deleted while it was off Trade, so the row went, and posting it again made a new one.
- **Found while testing:** the first build kept the lead's row on every merge, which changed the id of the live Buy post in the one merge the composer allows. The owner agreed to keep the live post's row; decision 5 and its tests are the result.
- **Also by rule, not changed:** a pair off Trade whose lead is deleted loses its row, since an off-Trade want list leads none; posting that want list later makes a new id.
- **Not run:** the composer's clicks in a browser.

## Open Questions

None.

No task commits, pushes or runs a migration. The root `.env` is production; local runs use `.env.local`; a production read is read-only and needs the owner's go-ahead.

## 1. The planner

- [x] 1.1 `PostRowOps.updates` entries take an optional `leadListId`. Tests first: a Buy post paired with a have list that has no row is one update that sets the lead and the want list, with no delete and no insert; a merge still deletes the want list's row; a split still inserts one row.
- [x] 1.2 `planPostRows` re-leads: an insert whose want list leads a doomed row becomes an update of that row (design decision 1).
- [x] 1.3 `planPostWrite`: a removed lead whose want list will lead a row re-leads its row; other removed lists get explicit deletes and updates (decision 2). Tests for each: want list on Trade, off Trade, taken by another lead in the same write.
- [x] 1.5 A merge keeps the row of the post that was on Trade before the write (`live`, design decision 5), with tests for each combination and for the lead's old want list taking over the lead's old row.
- [x] 1.4 The property test over the random runs: no planned write deletes a row and inserts a row that shares a list with it. The differential comparison ignores row ids.

## 2. The writers

- [x] 2.1 `writePosts` writes `lead_list_id` when an update carries one.
- [x] 2.2 `deleteList` calls `writePosts` before it deletes the list; comments say why.

## 3. Docs

- [x] 3.1 `packages/api/docs/trade.md` and `packages/db/AGENTS.md`: the id rule, the merge and split cases, and that `deleteList` writes rows before deleting.

## 4. Proof

- [x] 4.1 `bun run check` and `bun run build --filter=web` pass.
- [x] 4.2 The local write pass of design decision 6, asserting row ids; local data restored, scratch script deleted.
- [x] 4.3 The two-writers rounds rerun locally; the drift script reads zero.

## 5. Rollout

- [ ] 5.1 The owner commits, pushes and deploys web. With a go-ahead afterwards, the drift script read-only on production reads zero; record it in design.md.

## Why

`trade_post` now holds every post's pairing, and the next phases want other things to point at a post by its row id: hides, offers, URLs. That only works if a post keeps its id while it stays the same post. Today the planner keys a row by its lead list, so two ordinary writes delete a post's row and insert a new one for the same post:

- **A Buy post gains a have list that has no row** (a have list off Trade, or a new one). The want list's row is deleted and a row led by the have list is inserted: the post's id changes although the post only grew a side.
- **A pair's lead list is deleted while its want list stays on Trade.** The foreign key takes the row with the lead, and the want list gets a new row: the post, now a Buy post, has a new id.

Nothing reads a row id yet (a grep on 2026-11-15 found only the writers and the "lowest row wins" order of `postPartnerSql`), so this is the moment to fix it, before anything stores one.

## What Changes

- The rule, stated once: **a write never deletes a row and inserts another that holds one of its lists. It re-leads the row instead.**
  - A Buy post paired with a have list that has no row: the row gets the have list as its lead and keeps the want list. Same id.
  - A lead deleted with its want list on Trade: the row gets the want list as its lead, with no want list. Same id.
- What stays as it is, on purpose:
  - **Two posts merged into one** (a Buy post paired with a have list that already has a row): one of two ids has to end. The row of the post that was on Trade before the write survives: the Buy post's when the have list was off Trade, which is the only merge the composer allows; otherwise the lead's.
  - **One post split in two** (an unpair, or a want list swapped out, with the freed want list on Trade): the lead keeps the row, the want list gets a new one.
  - A lead deleted with its want list off Trade: the row goes, as today; an off-Trade want list leads no row.
- `PostRowOps.updates` can set a row's lead as well as its want list, and `writePosts` writes it.
- `deleteList` plans and writes the rows before it deletes the list, so the row is re-led before the foreign key could take it. The foreign keys stay as the safety net for a delete that goes around `deleteList` (`anonymizeUser` deletes every list of the person, where no row is left to keep).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. `.openspec.yaml` sets `skip_specs: true`: after every write the posts, pairs, Trade state and touched lists are what they are today; only which row id holds a post differs, and nothing a user, an open tab or `/api/v1` can see reads a row id.

## Routes

No route changes.

## Impact

- `packages/api/src/lib/trade-post-rows.ts` (`planPostRows`, `planPostWrite`, `PostRowOps`) and its two tests.
- `packages/api/src/services/list/shared.ts` (`writePosts`), `services/list/edit.ts` (`deleteList`).
- Docs: `packages/api/docs/trade.md`, `packages/db/AGENTS.md`.
- No migration. Deploy: web only. Rollback to `c66841be` or later is safe: every row this change writes is a row those builds already understand.

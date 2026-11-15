## Why

Since `trade-post-writes`, `trade_post` is the source of a post's pairing for reads and writes alike. `lists.linked_list_id` is only a mirror: `writePosts` copies the rows into it, and nothing reads it but the drift script. It was kept so the build before `trade-post-writes` could be redeployed. Production has now run the new writers with zero drift on all eleven checks (three read-only runs on 2026-11-15, the last after a row created with a pair and rows removed by the new code), and two writers of one person at once held in a local run. This change is phase 5 of the owner's rollout: stop keeping the mirror, so the column can be dropped.

## What Changes

- `writePosts` stops writing `lists.linked_list_id`. `planPostWrite` loses its `mirror` flag.
- `lists.linkedListId`, its index `lists_linked_list_id_idx` and its foreign key leave `packages/db/src/schema.ts`.
- A migration records that in its snapshot and runs a no-op, as `20261024135516_retire_privacy_columns` does. **The column and its values stay in the database.** Migrations run before the deploy (`packages/db/AGENTS.md`), so a `DROP COLUMN` here would break the live build's mirror write until the new web image is up.
- The drift script keeps the three checks that compare the rows with `lists` without the link (a list on Trade in no row, a list in two rows, a row with a wrong list) and loses the eight that read the link, the legacy SQL and the `EXPLAIN=1` mode, which only compared old plans with new ones.
- The differential test keeps the old link writes as the pairing rule's reference, and compares them with the partners the rows give instead of with a mirrored link.
- Docs and doc comments stop describing a mirror.

Not in this change:

- **The `DROP COLUMN`.** It is a follow-up, `trade-post-drop-link`: one `IF EXISTS` custom migration, proposed once this change is live. It is the point of no return for redeploying a build from before this one.
- **Renaming `linkedListId`.** The earlier plan listed it. It is left out: `list.find` returns the field and `createListInputSchema` takes it, so an open tab reads and sends that name; the pure modules use the same name for the same thing (the list's partner); and a rename would touch about fifty files, web components among them, for no change in behaviour. The name stays, meaning "the other list of this list's post row".

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. `.openspec.yaml` sets `skip_specs: true`: every write leaves the same `trade_post` rows and the same `lists` state apart from a column nothing reads, gives the same refusals and touches the same lists; `/rpc` inputs and outputs are unchanged.

## Routes

No route changes.

## Impact

- `packages/api/src/lib/trade-post-rows.ts` and its two tests; `packages/api/src/services/list/shared.ts`.
- `packages/db/src/schema.ts`, one new migration folder.
- `apps/worker/src/script/trade-post-drift.ts`.
- Docs: `packages/db/AGENTS.md`, `packages/api/docs/trade.md`, `lists.md`, `apps/worker/AGENTS.md`, doc comments.
- Deploy: the no-op migration, then web. The worker runs none of the changed code. **Before the deploy, the production worker must be built from `56b04e99` (`trade-post-reads`) or later:** an older worker reads `linked_list_id` for want alerts (`swapPair`, `postsCte`), and would send or skip alerts wrongly from the first pair change after this deploy.
- Rollback: the floor is the `trade-post-writes` image (`4f2ad06c` or `b5c5965c`), which reads nothing from the link. It writes the link again only on a write that pairs, unpairs or changes a row, which harms nothing, since it never reads it. An image from before it (`trade-post-reads`, `trade-post-hides` or older) must not be redeployed: those read the link inside write paths and rebuild the rows from it, so a stale link would corrupt `trade_post`.

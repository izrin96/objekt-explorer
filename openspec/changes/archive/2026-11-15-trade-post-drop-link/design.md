## Context

Production, read-only, 2026-11-15: the column, `lists_linked_list_id_idx` and `lists_linked_list_id_lists_id_fkey` are all that mention `linked_list_id`. `schema.ts` and its migration snapshot already lack them (`20261115092944_retire_linked_list_id`), so a plain `drizzle-kit generate` finds no diff and the drop is a `--custom` migration, as `packages/db/AGENTS.md` describes.

## Goals / Non-Goals

**Goals:** the column is gone from every database the migration runs on; docs describe the database as it is.

**Non-Goals:** any code change; renaming the pure modules' `linkedListId` (see the archived `trade-post-contract` proposal).

## Decisions

### 1. One statement, `IF EXISTS`, behind a lock timeout

`DROP COLUMN` is a catalog change: it does not rewrite the table, and it drops the column's index and foreign key itself. It takes `ACCESS EXCLUSIVE` on `lists` for an instant, but while it waits for that lock every later reader of `lists` queues behind it. `lock_timeout = 3s`, set the way `20261104090717_drop_collection_override` sets it, makes the migration fail instead of stalling the site; the owner reruns it.

`IF EXISTS` because Drizzle v1 runs every unrecorded migration folder, and a database may already lack the column.

### 2. The gate before production

The drop must not run while any live build writes the column. Two facts are needed, both read-only:

- **web:** a `trade_post` row with a want list, created after the `trade-post-contract` deploy (2026-11-15 12:47 UTC), whose lead list's `linked_list_id` is null. The previous image would have written it. A watcher polls for this.
- **worker:** the owner rebuilt it with that deploy.

### 3. Proof

- `bun run check`.
- With the owner's approval, `db:migrate` on the local database (it applies the no-op and the drop); then the column, the index and the foreign key are gone, a write pass through the service functions holds, and the drift script reads zero. This is the one run that shows no raw SQL still names the column, which typecheck cannot.
- After the owner runs the migration on production: the column is gone, and the drift script reads zero.

## Risks / Trade-offs

- **[No rollback to a build from before `c66841be`.]** → Accepted by the owner as the purpose of this phase. Rolling back to `c66841be` itself needs nothing.
- **[The lock waits behind a long transaction.]** → `lock_timeout`; rerun at a quiet moment.
- **[A build that still writes the column is live.]** → The gate in decision 2.

## Migration Plan

1. The gate reads true.
2. The owner commits and pushes, then on the VPS runs the migrate step. Web and worker need no redeploy for correctness.
3. With the owner's go-ahead, the read-only production check.

## As built

- **Checks:** `bun run check` passes.
- **Local migration** (the owner approved it, 2026-11-15): `db:migrate` applied the no-op and the drop. The column, `lists_linked_list_id_idx` and `lists_linked_list_id_lists_id_fkey` are gone from the local database.
- **Local write pass** without the column, through the service functions from a scratch script inside `apps/worker` (deleted): create a want list paired with `lt2 extras`; a second paired with it; `savePost` pairs `lt2 spares`; `savePost` unpairs it; take down the pair; post it again; delete both want lists. After each of the eight steps the person's rows were as expected, with no list on Trade in no row and no list in two rows. The local data ended as it began. The local drift script read zero on its three checks.
- **Local reads** without the column, from the dev server: `/` and `/trade` answer 200; the pages of `lt2 spares`, of the paired `lt1 paired wants` and of its partner `spares 2` answer 200, and each paired page names its partner. The dev-server log gained no error.
- **The gate** (task 3.1), read-only on production, 2026-11-15 13:19 UTC: one pair was made at 13:14, after the `trade-post-contract` deploy, and its lead list's `linked_list_id` is null, so the build that writes is the one that no longer writes the column. Two lists' links now differ from their row partner, as expected once the mirror stops. 1,355 rows, zero on the three drift checks.
- **Rollout** (task 3.2): pushed as `57f74478`; CI passed. The owner ran the migrate step. Production, read-only, 2026-11-15 13:55 UTC: the migration is recorded (applied 13:54:59), and the column, `lists_linked_list_id_idx` and `lists_linked_list_id_lists_id_fkey` are gone. 1,355 rows, zero on the three drift checks. Two lists had been written since the drop and no post row created. Sentry held no error event in the 30 minutes before the check, none naming the column. The check came half a minute after the drop, so it shows little about traffic after it.
- **Not run:** the composer's clicks in a browser.

## Open Questions

None.

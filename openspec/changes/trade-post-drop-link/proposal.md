## Why

`trade-post-contract` stopped every read and write of `lists.linked_list_id` and took it out of `schema.ts`, with a no-op migration, because the build live at the time still wrote the column. That build is gone from production now, so the column can go. This is the last step of removing the old link: after it, `trade_post` is the only place a post's pairing exists, in code and in the database.

## What Changes

- One custom migration, `20261115125616_drop_linked_list_id`: `ALTER TABLE lists DROP COLUMN IF EXISTS linked_list_id`, behind a 3 s `lock_timeout`. Dropping the column takes its index `lists_linked_list_id_idx` and its foreign key `lists_linked_list_id_lists_id_fkey` with it; a read-only look at production found nothing else that depends on it (no view, function, trigger or policy).
- The lock-order reason in `deleteList` and `docs/lists.md` named that foreign key ("`ON DELETE SET NULL` locks the partner"). It now names what is true: the delete changes the person's rows through `trade_post`'s foreign keys, so it runs under the lock every post writer takes. The lock itself is unchanged.
- `packages/db/AGENTS.md` and `docs/trade.md` say the column is dropped.

No code path changes: one comment in `services/list/edit.ts`, and docs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. `.openspec.yaml` sets `skip_specs: true`: nothing a user, an open tab or `/api/v1` can see changes.

## Routes

No route changes.

## Impact

- `packages/db/migrations/20261115125616_drop_linked_list_id/`.
- `packages/api/src/services/list/edit.ts` (a comment), `packages/api/docs/lists.md`, `docs/trade.md`, `packages/db/AGENTS.md`.
- **Point of no return.** After the migration no web or worker build from before `c66841be` can run: an older web build writes the column on every pair or row write, and an older worker names it in its `lists` schema. The link values are lost; they were already going stale, and the rows hold every pairing.
- Deploy: the migration only. The web image CI builds differs from the live one by a comment.

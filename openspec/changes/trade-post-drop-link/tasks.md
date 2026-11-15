No task commits, pushes or runs a migration without the owner's approval for that action. The root `.env` is production; local runs use `.env.local`; a production read is read-only.

## 1. The migration and the docs

- [x] 1.1 `drizzle-kit generate --custom --name drop_linked_list_id`; its SQL is the `lock_timeout` line and `ALTER TABLE "lists" DROP COLUMN IF EXISTS "linked_list_id"`.
- [x] 1.2 The lock-order reason in `deleteList` and `docs/lists.md`; `packages/db/AGENTS.md` and `docs/trade.md` say the column is dropped.

## 2. Proof

- [x] 2.1 `bun run check` passes.
- [x] 2.2 With the owner's approval, `db:migrate` on the local database. Verify the column, its index and its foreign key are gone.
- [x] 2.3 A local write pass through the service functions holds, local data restored, scratch script deleted; the drift script reads zero.

## 3. Rollout

- [ ] 3.1 The gate: a pair made on production after 2026-11-15 12:47 UTC whose lead list has no link, read-only.
- [ ] 3.2 The owner commits, pushes and runs the migrate step. With a go-ahead afterwards, verify read-only that the column is gone and the drift script reads zero; record it in design.md.

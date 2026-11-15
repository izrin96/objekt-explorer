No task commits, pushes or runs a migration. The root `.env` is production; every local run uses `.env.local`, and a production read runs read-only with the owner's go-ahead.

## 1. Stop the mirror

- [x] 1.1 `planPostWrite` returns `{ ops, relinked }`: remove `mirror` from the type, the function and `trade-post-rows.test.ts`.
- [x] 1.2 `writePosts` no longer runs the mirror `UPDATE`; its doc comment and `LockedList`'s say so.
- [x] 1.3 `trade-post-rows.model.test.ts`: the row world sets each list's `linkedListId` from `partnerByRows` after every write; no reference to a mirror.

## 2. The column leaves the schema

- [x] 2.1 Remove `linkedListId`, `lists_linked_list_id_idx` from `schema.ts` (`AnyPgColumn` stays: `offer` and `trade` still use it); fix the `tradePost` doc comment.
- [x] 2.2 `bun run --filter=@repo/db db:generate`, named `retire_linked_list_id`; replace its SQL with a no-op and a comment, keeping the snapshot. Verify the snapshot lacks the column, the index and the foreign key.

## 3. The drift script

- [x] 3.1 Keep the three checks that need no link; remove the rest, the legacy SQL, the relations check and `EXPLAIN=1`; rewrite the header.

## 4. Docs

- [x] 4.1 `packages/db/AGENTS.md`, `packages/api/docs/trade.md`, `lists.md`, `offers.md`, `apps/worker/AGENTS.md`, and the comment on `postPartnerSql`: the column is retired, kept in the database until its drop migration, and nothing reads or writes it.

## 5. Proof

- [x] 5.1 `bun run check` and `bun run build --filter=web` pass.
- [x] 5.2 A grep for `linked_list_id` over `packages` and `apps`, outside migrations, finds doc text only.
- [x] 5.3 A local write pass through the service functions; after each step the three counts are zero and no list's `linked_list_id` changed. Local data restored, scratch script deleted.
- [x] 5.4 The drift script read-only against the local database: zero.

## 6. Rollout

- [x] 6.1 The owner confirms the production worker is built from `56b04e99` or later (rebuilding it if not), then commits, pushes and deploys (the no-op migration, then web). With a go-ahead afterwards, the drift script read-only on production reads zero; record it in design.md.

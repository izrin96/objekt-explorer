## Context

`writePosts` (`packages/api/src/services/list/shared.ts`) writes the row operations `planPostWrite` plans, then, when the plan's `mirror` flag is set, runs one `UPDATE lists SET linked_list_id = …` from the rows. A grep for `linked_list_id` and `linkedListId` over `packages` and `apps` on 2026-11-15 found the column used in exactly three places outside tests and docs: that `UPDATE`, the column and index in `schema.ts`, and the drift script. Every other `linkedListId` is a field of a pure module, an input or an output, filled from the rows (`postPartnerSql`, `lockPosts`, `findOwnedList`).

## Goals / Non-Goals

**Goals:** no code reads or writes the column; `schema.ts` lacks it; the next `db:generate` does not write a `DROP COLUMN` into an unrelated change.

**Non-Goals:** dropping the column; renaming `linkedListId`; any change to what a write leaves in `trade_post`.

## Decisions

### 1. Two steps: retire now, drop later

`packages/db/AGENTS.md`: migrations run before the deploy, so each must work with the code still live; "expand, deploy, then contract". The live build writes the mirror on every pairing or row write. A `DROP COLUMN` applied before the new web image is up would fail those writes. So this change removes the column from `schema.ts` with a no-op migration whose snapshot drops it (the documented way, `20261024135516_retire_privacy_columns`), and the drop is its own change after this one is live.

Alternative: drop in this change and tell the owner to deploy web before running the migration. Refused: it reverses the documented order, and one mistake breaks every post write on production.

### 2. `planPostWrite` returns `{ ops, relinked }`

The `mirror` flag existed only to decide whether to run the `UPDATE`. It goes, with its test expectations.

### 3. The differential test keeps the legacy model

`trade-post-rows.model.test.ts` transcribes the old link writes as pure functions and compares them with the row writes. The old writes are still the reference for what pair and unpair mean, so the link world stays. The row world stops carrying a mirrored link: after each write its lists' `linkedListId` is set from `partnerByRows` for comparison, unconditionally, which is what a read gives.

### 4. The drift script keeps what needs no link

Kept: a list on Trade in no row; a list in two rows; a row with another owner's list, a want list that is not one, or a want-led row holding a want list. Removed: the five checks that compare a row with the link, the three that compare reads over the link with reads over the rows, the relations check, the legacy SQL, and `EXPLAIN=1`.

Once the mirror stops, the removed checks would report every later pair change as drift, so they cannot stay even while the column exists.

### 5. Proof

- `bun run check`, and `bun run build --filter=web`.
- A grep for `linked_list_id` over `packages` and `apps`, outside migrations: only doc text about the retired column.
- The generated migration: its snapshot lacks the column, the index and the foreign key; its SQL is the no-op.
- A local write pass through the service functions (create with a pair, save a pair, unpair, take down, delete), asserting after each step the three kept counts and that `lists.linked_list_id` did not change for any list.
- The drift script, read-only, locally and, with the owner's go-ahead, on production before and after the deploy.

## Risks / Trade-offs

- **[The mirror goes stale from the first write after the deploy.]** Any web image from before `trade-post-writes` reads the link inside its write paths and derives the rows from it, so redeploying one would rebuild `trade_post` from a stale link. A worker built before `56b04e99` reads the link for want alerts. → The rollback floor is the `trade-post-writes` image, which reads nothing from the link. The worker's commit on production is checked before the deploy (task 6.1).
- **[A wrong row is no longer visible against the link.]** → Already true since `trade-post-writes`: the mirror was written from the rows. The three kept checks see what the rows alone can show.
- **[The local database keeps the column, and a later `db:generate` sees no diff.]** → The drop must be a `--custom` migration with `IF EXISTS`, as `packages/db/AGENTS.md` says.

## Migration Plan

0. The owner confirms the production worker is built from `56b04e99` or later, and rebuilds it if not.
1. The owner commits and pushes; CI builds web.
2. On the VPS: the migrate step (a no-op), then web.
3. With the owner's go-ahead, the drift script read-only on production: the three checks read zero.
4. Follow-up `trade-post-drop-link`: the worker is rebuilt from this commit or later, then the `DROP COLUMN IF EXISTS` migration. It also rewrites the lock-order reason in `docs/lists.md` and `deleteList` ("`ON DELETE SET NULL` locks the partner"), which is the dropped foreign key's.

## As built

- **Checks:** `bun run check` passes (lint, typecheck, 1,135 tests in `@repo/api`), and `bun run build --filter=web` builds. Removing the column from `schema.ts` broke no typecheck: no Drizzle query named it.
- **Grep** for `linked_list_id` over `packages` and `apps`, outside migrations: the two doc paragraphs that say the column is retired, and four comments in `trade-post-rows.model.test.ts` that quote the old link statements the model transcribes.
- **Migration** `20261115092944_retire_linked_list_id`: generated as a drop of the foreign key, the index and the column; its SQL replaced by `SELECT 1` and a comment. Its snapshot is the diff format the precedent has, with the three drops as footprints. Not run anywhere: no code depends on it.
- **Local write pass**, through the service functions from a scratch script inside `apps/worker` (deleted), which refused to start unless the database and Redis were local. Eight steps as `localtest2`: create a want list paired with `lt2 extras`; create a second paired with it, so the first loses it; `savePost` pairs `lt2 spares` with the first; `savePost` unpairs it; take down the `lt2 extras` pair; post it again; delete the paired want list; delete the other. After each step the person's rows matched the expected rows, the three kept counts were zero over the whole database, and `linked_list_id` (still in the local database) was unchanged on every list that existed at the start. The local data ended as it began.
- **Local drift script**, read-only: 410 rows, zero on the three checks.
- **Review** (a critic agent, read-only): no code reaches the column; the migration folder matches the precedent. Its findings changed the rollback floor and the worker condition above, a stale comment in `schemas/trade-post.ts`, two doc sentences, and removed a model-test loop that could no longer fail (it compared two partner functions over the same rows; the line above it still compares every legacy-written link with the partner the rows give).
- **Worker** (the owner, 2026-11-15): production already runs the latest worker, so it reads pairs from the rows.
- **Rollout** (task 6.1): pushed as `c66841be`; CI passed and moved `:latest`. The owner ran migrate, then web and the worker. Production, read-only, 2026-11-15 12:48 UTC: the migration is recorded (applied 12:47), the column is still there, 1,354 rows, zero on the three checks. No list's link differed from its row partner yet, because no pair had been made or changed in the minute since the deploy; the 14 rows created since the build were all written by the previous image, which still mirrored.
- **Not run:** the composer's clicks in a browser; the no-op migration.

## Open Questions

None.

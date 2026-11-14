These rules hold for every task:

- No task commits, pushes or uses `git stash`.
- The root `.env` is production. Migrations are applied to the local database only (`.env.local`'s `DATABASE_URL`; the `guard-prod-db` hook refuses anything else). The production migrate and deploy are the owner's separate approval and are never run from these tasks.
- A production read runs only with the owner's go-ahead and `PGOPTIONS='-c default_transaction_read_only=on'`, and never prints a connection string.
- "Build" for `@repo/api` means `bun run build --filter=web`, which bundles it.
- For the worker, "build" means `bun run typecheck --filter=worker` and `bun test apps/worker/src/import-boundary.test.ts`.
- No `.tsx` change is expected. If one turns out to be needed, load the `vercel-react-best-practices` skill before editing it.

## 1. Owner go-ahead and production reads

- [x] 1.1 Ask the owner for a go-ahead to run read-only queries against production. With it, read `max(lists.id)` and the backfill guard's five counts (design decision 5). Record them in design.md (Assumptions). Verify `max(lists.id)` is far below 1,000,000 and every guard count is zero. If any count is not zero, stop and report to the owner.
- [x] 1.2 With the same go-ahead, run the backfill's two `SELECT`s (decision 5, without the `INSERT`) read-only against production. Record the rows per rule in design.md. Verify the numbers are written there.

## 2. Schema and migrations

- [x] 2.1 In `packages/db/src/schema.ts`, add `tradePost` exactly as design decision 2 gives it:
  - `id` identity starting at 1,000,000; `userId`; `leadListId` (CASCADE); `wantListId` (SET NULL); `createdAt`;
  - the check `trade_post_want_not_lead`;
  - the three indexes;
  - a doc comment saying the row is the post, kept in step by `planPostRows`, and not read yet.

  Add its relations in `packages/db/src/relation.ts`. Verify lint and typecheck pass for `@repo/db` and `bun run build --filter=web` passes.
- [x] 2.2 Run `bun run --filter=@repo/db db:generate` and read the SQL:
  - the identity starts at 1000000; edit it by hand to decision 2's statement if drizzle-kit dropped `startWith`;
  - the foreign key actions and the partial index are present;
  - add `SET LOCAL lock_timeout = '5s';` and `--> statement-breakpoint` at the top.

  Verify a second `db:generate` finds no diff, and lint and typecheck pass for `@repo/db`.
- [x] 2.3 From `packages/db`, run `bunx drizzle-kit generate --custom --name=trade_post_backfill`. Write the `lock_timeout` line, the `DO` guard (each check names its count in the exception) and the two `INSERT`s of decision 5, separated by `--> statement-breakpoint`. Apply both migrations to the local database with `bun run --filter=@repo/db db:migrate`. Verify, by read-only `SELECT`s:
  - 410 rows: 89 pairs, 219 lone have or sale lists, 102 lone want lists;
  - no list is in two rows;
  - each row's `user_id` equals its lists' owner;
  - lint and typecheck pass for `@repo/db`.

## 3. Row planner (pure)

- [x] 3.1 Add `packages/api/src/lib/trade-post-rows.ts`: the branded `PostId` type and `planPostRows(rows, lists)`, implementing decision 3's rule over the whole row set (decision 4). Add `trade-post-rows.test.ts` with one case per transition:
  - post, Take off Trade, post again;
  - link, unlink, swap the want list;
  - a lone want list linked to an off-Trade have list;
  - delete the lead, delete the want list, a Buy post's lead deleted;
  - create on Trade, unlinked;
  - every list gone;
  - an off-Trade unlinked list keeping its row;
  - duplicate rows collapsing onto the lowest id.

  Verify `bun test packages/api/src/lib/trade-post-rows.test.ts` passes, and lint, typecheck and build pass for `@repo/api`.
- [x] 3.2 Add `packages/api/src/lib/trade-post-rows.model.test.ts` (decision 7). Use a seeded generator of transition sequences that follow `pairRefusal`. After every step, compare `groupPosts` over the lists on Trade with the posts the rows give. Check that no list is in two rows and owners match. Add the healing variant, which corrupts rows before each step. Verify it passes at a fixed seed with at least 1,000 sequences of 30 steps, and fails when a rule in the planner is deliberately broken (try it, then revert). Lint, typecheck and build pass for `@repo/api`.

## 4. Drift script

- [x] 4.1 Add `apps/worker/src/script/trade-post-drift.ts`, read-only. It refuses to start unless `default_transaction_read_only` is on, as `fix-transferability.ts` does. It runs the six checks of decision 7, printing a count and up to 10 ids each, and exits non-zero when any is above zero. Pure parts go in `apps/worker/src/lib/` with a test. Verify that, run with `PGOPTIONS='-c default_transaction_read_only=on'` against the local database after task 2.3, every count is zero. The worker's typecheck and import-boundary test pass.

## 5. Writers

- [x] 5.1 `lockTradeLists` (`services/list/shared.ts`) also returns, per list, the rows it leads, in the same locked statement. Its comment names `trade_post` among what the lock guards. Verify lint, typecheck and build pass for `@repo/api`.
- [x] 5.2 `trade.savePost` and `trade.takeDownPost` (`services/trade/post.ts`) build the after-state in memory and apply `planPostRows` after their list writes, in the same transaction. Verify on the local database, in the browser with the local test accounts, running the drift script after each step and seeing zero:
  - post a Swap pair, then a Buy post;
  - edit the pair to drop the have list;
  - take a post off Trade and post it again (the same row id);
  - unpair in the composer.

  Lint, typecheck and build pass for `@repo/api`.
- [x] 5.3 `writeList` (`services/list/create.ts`) takes `lockTradeLists` for every have, want and sale list, not only one that links, and applies `planPostRows` after the insert and partner writes. This covers `list.create` and `list.copy`. Verify locally, with the drift script reading zero after each:
  - create a want list linked to a have list;
  - copy a list;
  - a `list.create` call over `/rpc` as the signed-in local user with `discoverable: true` and no link, which gets a row.

  Lint, typecheck and build pass for `@repo/api`.
- [x] 5.4 `deleteList` (`services/list/edit.ts`) plans with the list removed and its partner unlinked, writes the rows, then deletes the list. `anonymizeUser` (`services/account/anonymize.ts`) plans with no lists before its list delete. Verify:
  - locally, deleting the have half of a posted pair leaves the want list's own row, and the drift script reads zero;
  - deleting the want half leaves the pair's row with `want_list_id` null;
  - account deletion is covered by the model test, and is run on a local account only with the owner's approval;
  - lint, typecheck and build pass for `@repo/api`.
- [x] 5.5 In `packages/api/docs/trade.md` (Trade posts), add that `trade_post` holds one row per post, written by the listed writers through `planPostRows` under `lockTradeLists` and read by nothing yet, and that a new writer of a link or of `discoverable` must call the planner. Verify the doc names the five writers, and lint passes.

## 6. Checks

- [x] 6.1 Run `bun run check` and `bun run build --filter=web` from the root. Both pass.
- [x] 6.2 Run the drift script against the local database after all of group 5. Every count is zero. Record the output.
- [x] 6.3 Stop. Report to the owner what this change contains, task 1's production numbers and task 6.2's output. The owner approves and runs the production migrate and deploy separately. After it, with their go-ahead, run the drift script read-only against production and report its output. Verify the approval is recorded before anything touches production.

## 7. Agent docs

- [x] 7.1 Use `writing-for-agents` for these edits:
  - in `packages/db/AGENTS.md`, add a short "Trade posts" note: `trade_post` is written and not yet read, rows follow `planPostRows`, and the backfill ran once on an empty table;
  - in `apps/worker/AGENTS.md`, add the drift script: what it checks, and that it is read-only.

  `packages/api/AGENTS.md` (task 5.5 covers its domain doc), `apps/web/AGENTS.md` and the root are expected unchanged; state so. Verify lint passes for each touched package.

## Workflow follow-up

- Propose `trade-post-reads` from design.md's "Inputs for `trade-post-reads`" once this change is live and the production drift script reads zero, or only window drift that people's writes are clearing.
- Archive this change after the deploy is verified.

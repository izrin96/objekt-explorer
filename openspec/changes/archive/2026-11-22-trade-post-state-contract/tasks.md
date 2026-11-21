## Ground rules

- **Git.** No task commits, pushes or uses `git stash`: the stash stack is shared by every worktree and holds 34 entries. A checkpoint is a WIP commit, made only with the owner's approval. The work happens in the `shared-lists-orca` worktree.
- **Production.** The root `.env` is production, and every local run uses `.env.local`.
  - A production read runs only with the owner's go-ahead for that run. It uses `PGOPTIONS='-c default_transaction_read_only=on'` and never prints a connection string or secret.
  - The owner deploys, runs every migrate and approves each migration.
- **Local data.** The owner approves three things once, at task 6.2:
  - applying the migrations to the local database;
  - the test rows on `localtest1@local.invalid` and `localtest2@local.invalid`;
  - one local account, `localtest3@local.invalid`, with no lists, for the first-list path.

  Group 6 puts back what it changed.
- **"Checks pass"** means:
  - for `@repo/api` and `@repo/db`: `bun run lint --filter=<pkg>`, `bun run typecheck --filter=<pkg>` and `bun run build --filter=web`;
  - for the worker: `bun run lint --filter=worker`, `bun run typecheck --filter=worker` and `bun test apps/worker/src/import-boundary.test.ts`.
- **Tests** cover pure modules only, never the database.
- **No `.tsx`, message, `/rpc` input or cache-key change is expected.** If one turns out to be needed, stop and ask.
- **Comments** state only a non-obvious why.
- **Scratch files** live in `/private/tmp/claude-501/state-contract/`. A script that needs `@repo/*` is copied into `apps/worker/.state-contract/` only to run, and removed after.
- **The drift script** runs from `apps/worker`:

  ```
  PGOPTIONS='-c default_transaction_read_only=on' bun run --env-file=../../.env --env-file=../../.env.local src/script/trade-post-drift.ts
  ```

  - Drop the second `--env-file` for production.
  - "The old drift script" is `git show 6f4de4c2:apps/worker/src/script/trade-post-drift.ts`, saved in the scratch folder and copied in only to run.

## 1. Bump readers read the rows

- [x] 1.1 In `packages/api/src/lib/trade-sql.ts`, beside `postStateSql`:
  - add `personBumpSql(userId)` as design decision 1 gives it;
  - drop `postStateSql("bumpedAt")`'s no-row fallback, so it reads null for a list in no row.

  In `trade-sql.test.ts`, pin its text, and update the pinned `postStateSql("l", "bumpedAt")` text (`:151-152`). Verify with `bun test packages/api/src/lib/trade-sql.test.ts`. Checks pass for `@repo/api`.
- [x] 1.2 Make `personBumpedAt` (`services/list/shared.ts:27-29`) and `lastBumpOf` (`services/trade/feed/mine.ts:81-87`) read through `personBumpSql`. Keep `personBumpedAt`'s doc comment: off sides count. Checks pass for `@repo/api`.
- [x] 1.3 Remove `bumpedAt` from list objects (design decision 1, the owner's answer 3):
  - from `baseListSchema` (`schemas/list.ts:83`);
  - from `toPublicList` (`services/list/read.ts:140`) and the profile lists read's columns (`:206`).

  Verify:
  - `grep -rn "bumpedAt" apps/web/src` finds only post bumps (`features/trade/post-time.ts`, `person-row.ts`);
  - `bun run typecheck --filter=web` is clean;
  - checks pass for `@repo/api`.

## 2. Bump

- [x] 2.1 Rewrite `bumpPerson` (`services/trade/feed/mine.ts:89-139`) as design decision 3 gives it:
  - one `UPDATE trade_post` under `lockTradeLists`;
  - no `lists` write;
  - the cooldown over every side of the person's rows;
  - the same return value and refusal.

  Update its doc comment and the lock comment. In `packages/api/docs/trade.md`, Trade posts, replace "`bumpPerson` bumps the lists and the sides that hold them…" with: it bumps the person's on-Trade sides; the lock's reason; and that `personBumpedAt` and `lastBumpOf` read the rows. Checks pass for `@repo/api`.

## 3. The planner and writers drop the list's bump

- [x] 3.1 In `packages/api/src/lib/trade-post-rows.ts`, as design decision 4 gives it:
  - drop `bumpedAt` from `TradeListState` and `ListSummary`;
  - make `rowStateOf`'s two list-bump fallbacks (`:427`, `:434`) null, and update its doc comment;
  - reduce the summary (`:601-625`) to `discoverable`;
  - delete `laterBump`.

  Update `trade-post-rows.test.ts`:
  - the `rowStateOf` cases, plus one for a list entering a row off, whose side bump is null;
  - the summary cases (`:1120-1255`);
  - delete "the latest bump is the latest in time…".

  Update `trade-post-rows.model.test.ts` as design decision 8 lists. Verify with `bun test packages/api/src/lib/trade-post-rows.test.ts packages/api/src/lib/trade-post-rows.model.test.ts`: every count still meets its floor. Checks pass for `@repo/api`.
- [x] 3.2 In `services/list/shared.ts`:
  - drop `bumpedAt` from `tradeState`;
  - make `writeLists` set `discoverable` only;
  - make the `bumpAt` fallback (`:232`) the created list's `createdAt`.

  In `services/list/create.ts`, drop `bumpedAt` from the insert (`:197`) and return `createdAt` beside the inserted state.

  Update `docs/trade.md`, Trade posts, where it says `writePosts` writes `discoverable` and `bumped_at`, and that `writeList`'s insert sets both. Verify:
  - `grep -rn "bumpedAt\|bumped_at" packages/api/src/services packages/api/src/lib` hits no `lists` column;
  - checks pass for `@repo/api`.
- [x] 3.3 Stop writing `hidden_trade_post.list_id` (design decision 9):
  - `hidePost` (`services/trade/hidden.ts:101-102`) inserts `(user_id, post_id)`;
  - `writeMoves` (`services/list/shared.ts:199-200`) drops the `list_id` column and its `array_agg`;
  - update the doc comments at `hidden.ts:93-96` and `schema.ts:235-238`, and `docs/trade.md`, Partner rules, hidden and idle posts, which says `list_id` is kept for older builds.

  Verify:
  - `grep -rn "list_id" packages/api/src apps/worker/src | grep -i hidden` is empty, apart from the drift script until 5.1;
  - the model test's hide moves still pass;
  - checks pass for `@repo/api`.

## 4. Schema and step 1's migration

- [x] 4.1 In `packages/db/src/schema.ts`:
  - remove `lists.bumpedAt` and `lists_trade_feed_idx`;
  - change `lists_trade_discoverable_idx`'s predicate to `discoverable`;
  - remove `hiddenTradePost.listId` and `hidden_trade_post_list_id_idx`;
  - update `tradePost`'s doc comment (`:262-268`).

  Run `bun run --filter=@repo/db db:generate --name retire_contract_columns`, then edit its `migration.sql` as design decision 6, step 1 gives it:
  - the `lock_timeout` header;
  - a comment in place of both `DROP COLUMN`s and the hide index drop;
  - the three `lists` index statements.

  In `packages/db/AGENTS.md`, Trade posts, record:
  - that bumps live on the rows only;
  - that `list_id` is no longer written or read;
  - the step 1 migration;
  - that both columns, the trigger and its function stay until step 2;
  - that from step 1's deploy no web build older than `1a062e41` may run.

  Verify:
  - one new folder under `packages/db/migrations` and no other change there;
  - `bun run typecheck` from the root is clean, which catches typed readers only (raw SQL is 6.1's grep);
  - checks pass for `@repo/db`.

## 5. Drift

- [x] 5.1 In `apps/worker/src/script/trade-post-drift.ts`:
  - check 5 drops its `bumped_at` comparison and becomes "a list whose Trade state disagrees with its rows (list ids)";
  - note 3 (`:138-142`) goes;
  - the header loses its sentences on `bumped_at` and on note 3 (`:20-23`).

  Update `apps/worker/AGENTS.md`, Trade post drift: the check 5 sentence, and the notes, which become two. Verify that a whole-repo grep for `list_id` on `hidden_trade_post` (outside `migrations/` and `openspec/`) is empty. Checks pass for the worker.

## 6. Local proof

- [x] 6.1 From the root:
  - `bun run check` and `bun run build --filter=web` exit 0;
  - `bunx oxfmt --check` is clean;
  - `grep -rn "bumped_at\|bumpedAt" packages apps --include=*.ts` outside `migrations/` hits only `trade_post` columns and post bumps.

  Record the grep in As built.
- [x] 6.2 With the owner's one approval:
  1. Run the old and the new drift script read-only on the local database: 0 on checks 1 to 7.
  2. Apply step 1's migration locally (`bun run --filter=@repo/db db:migrate`; the guard refuses a non-local `DATABASE_URL`).
  3. Save, read-only, the rows and lists the pass will touch to the scratch folder.
  4. Run the dev server from this worktree on `.env.local`. Drive it with `browser-use` on the automation Chrome (`BU_CDP_URL=http://127.0.0.1:9333`):
     - each account in its own tab, by target id, in an isolated context;
     - sign in only after hydration, or by `fetch` from the loaded page, so no credential reaches a URL or the dev-server log.

  Then, with the new drift script at 0 after each step:
  - (a) Set localtest2's row bumps back 25 hours (local SQL). Bump: every on side takes one time, off sides keep theirs, Your posts shows the last bump as just now and the next in 24 hours, and localtest2 leads localtest1's Browse.
  - (b) Bump again: refused with `trade_bump_too_soon`, and Your posts' next bump is unchanged.
  - (c) Take a post off Trade and put it back: it keeps (a)'s bump. Create a want list on Trade: its side takes (a)'s bump.
  - (d) `GET /api/v1/lists/{slug}` and `GET /api/v1/profiles/{address}/lists` carry no `bumpedAt`. `GET /api/v1/trade/people` posts still do. The list page and the profile's lists render.
  - (d2) As localtest1, hide one of localtest2's posts, then unhide it: the hide row has a null `list_id`, the post leaves Browse and comes back.
  - (e) As `localtest3`, who has no have, sale or want list, create a want list on Trade. This is the `createdAt` fallback of design decision 4. The create succeeds, and its row's side bump equals the list's `created_at`.
  - (f) Read-only on the local database, `SET enable_seqscan = off`, then `EXPLAIN` `countedListings`' per-slug count and want alerts' `discoverable` read (`apps/worker/src/job/want-alerts/index.ts:48-51`). Each can use `lists_trade_discoverable_idx`.
  - (g) No console error on the pages visited, client or server.

  Then put back what the pass changed:
  - delete the lists it created;
  - restore the saved rows and lists;
  - remove `localtest3` if the owner asks.

  Record each step's result in As built.

## 7. Step 1 rollout

- [x] 7.1 **G1**, read-only, with a go-ahead, after the push and before step 1's web comes up:
  - the old and the new drift script: checks 1 to 7 at 0;
  - decision 2's count:

    ```sql
    WITH own AS (SELECT user_id, max(bumped_at) AS at FROM lists GROUP BY user_id),
    side AS (SELECT user_id, max(greatest(lead_bumped_at, want_bumped_at)) AS at,
               bool_or(lead_on_trade OR want_on_trade) AS posted
             FROM trade_post GROUP BY user_id)
    SELECT count(*) FILTER (WHERE own.at IS DISTINCT FROM side.at) AS differs,
           count(*) FILTER (WHERE own.at > coalesce(side.at, '-infinity')
             AND (coalesce(side.posted, false) OR own.at > now() - interval '24 hours')) AS matters
    FROM own LEFT JOIN side USING (user_id) WHERE own.at IS NOT NULL;
    ```

  - the number of have, sale and want lists in no row with a `bumped_at`;
  - the baseline: rows and lists on Trade.

  A non-zero drift check, or a `matters` above 0, stops the rollout for the owner. `differs` is information. Record all of it in As built.
- [x] 7.2 The owner runs `docker compose run --build --rm migrate`, brings up web, and rebuilds and brings up the worker from the same commit. Record the times.
- [x] 7.3 **G2**, read-only, with a go-ahead:
  - the new drift script: checks 1 to 7 at 0;
  - `EXPLAIN (ANALYZE, BUFFERS OFF, TIMING OFF, COSTS OFF)` of `countedListings`' per-slug count and of want alerts' `discoverable` read (`apps/worker/src/job/want-alerts/index.ts:48-51`).

  Record the plans and times against `trade-post-state` 11.3 (162.4 ms for the market). A slower market read is a finding for the owner, not a stop.

## 8. Step 2: drop the column

- [x] 8.1 Once step 1 has served for a day with G2 clean:
  1. Run `bun run --filter=@repo/db db:generate --custom --name drop_contract_columns`.
  2. Write its SQL as design decision 6, step 2 gives it: the locks in order, the trigger and its function, then both columns, with a comment on why it is safe now.
  3. Apply it locally (the approval of 6.2 covers it).
  4. Load the list page, Browse and Your posts as localtest2, and hide and unhide a post as localtest1, with no error.
  5. Record in `packages/db/AGENTS.md`, Trade posts: the drop of both columns, the trigger and its function, and that no web or worker build older than step 1's commit can run.

  Checks pass for `@repo/db`.
- [x] 8.2 The owner commits and pushes 8.1, then confirms that the web and worker images both run step 1's commit or later.
- [x] 8.3 **G3**, read-only, with a go-ahead: the new drift script at 0. Then the owner runs migrate alone. **G4**: the new drift script at 0. Record the new rollback floor in As built.

## 9. Agent docs

- [x] 9.1 With `writing-for-agents` loaded, check what groups 1 to 5 and 8 wrote against the code as built:
  - `packages/db/AGENTS.md`;
  - `apps/worker/AGENTS.md`;
  - `packages/api/docs/trade.md`, Trade posts. Its list of reads that stay on `lists` loses `personBumpedAt` and `lastBumpOf`. Partner rules no longer mentions `list_id`.

  State that `packages/api/AGENTS.md`, `apps/web/AGENTS.md` and the root `AGENTS.md` need no change, or fix them.

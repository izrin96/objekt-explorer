These rules hold for every task:

- **Git.** No task commits, pushes or uses `git stash`. A checkpoint is a WIP commit, made only with the owner's approval. The work happens in the `shared-lists` worktree.
- **Production.** The root `.env` is production, and every local run uses `.env.local`.
  - A production read runs only with the owner's go-ahead for that run. It uses `PGOPTIONS='-c default_transaction_read_only=on'` and never prints a connection string or secret.
  - Production migrations are run by the owner.
- **Local data.** Applying a migration to the local database, and each local test row (a list, a post, a bump), needs the owner's approval for that action.
- **"Checks pass"** means lint, typecheck and build for the touched package:
  - for `@repo/api` and `@repo/db`: `bun run lint --filter=<pkg>`, `bun run typecheck --filter=<pkg>` and `bun run build --filter=web`, which bundles them;
  - for the worker: `bun run lint --filter=worker`, `bun run typecheck --filter=worker` and `bun test apps/worker/src/import-boundary.test.ts`.
- **Tests** cover pure modules only, never the database.
- **No `.tsx`, message or cache-key change is expected.** If one turns out to be needed, stop and ask.
- **Comments** state only a non-obvious why.
- **Scratch scripts** live in `apps/worker/.trade-post-state/`. Bun resolves `@repo/*` from the script's path, and the dot-directory keeps them out of lint and commits. Each script refuses to start unless the hosts of `DATABASE_URL` and `REDIS_URL` are `localhost` or `127.0.0.1`. Run them from `apps/worker` with `bun run --env-file=../../.env --env-file=../../.env.local <path>`. Delete the directory when group 10 is done, and confirm `git status` shows nothing of it.
- **The drift script** runs from `apps/worker`:

  ```
  PGOPTIONS='-c default_transaction_read_only=on' bun run --env-file=../../.env --env-file=../../.env.local src/script/trade-post-drift.ts
  ```

  Drop the second `--env-file` for production.

Part A (groups 1 to 7) ships as deploy A. Part B (groups 8 to 11) is written after deploy A is live and ships as deploy B.

## 1. The pure rule and its tests

- [x] 1.1 In `packages/api/src/lib/trade-post-rows.ts`, add `PostState` and `postStateOf(lead, want)` exactly as design decision 4 gives them. Widen `TradeListState` with `bumpedAt`, `matchHave`, `matchSale` and `takesSwaps`, and `PostRow` with `state: PostState`. In `trade-post-rows.test.ts`, add decision 10's `postStateOf` cases. Verify that `bun test packages/api/src/lib/trade-post-rows.test.ts` passes.
- [x] 1.2 In the same module, make `planPostWrite`:
  - apply `ops` to `before.rows` in memory;
  - give each insert `state`;
  - return `ops.states` for every surviving row whose state differs from its stored `state`.

  `planPostRows`, `relead`, `applyPairing` and `relinked` stay as they are. Add the `planPostWrite` cases of design decision 6's table, one per row, and a no-change case with an empty `states`. Verify that the unit tests pass and that `git diff` shows no change to `planPostRows` or `relead`.
- [x] 1.3 In `trade-post-rows.model.test.ts`:
  - give each model list `bumpedAt` from a step counter, set where `tradeColumns(true)` and `bumpPerson` would set it;
  - store each row's `state` in the rows world;
  - add a bump transition at a low rate;
  - after every write, assert that every row equals `postStateOf` of its lists (equation E in full).

  Keep the existing equalities. Verify that the test passes, and that every transition it counts still reaches its floor.
- [x] 1.4 Break `postStateOf` on purpose, once with `matchHave` taken from the lead of a have-led row, and once with `wantOnTrade` left true with no want list. Confirm that the model test fails both times, then restore it. Record the result for design.md's As built. Checks pass for `@repo/api`.

## 2. Schema and migration A

- [x] 2.1 `packages/db/src/schema.ts`, `tradePost`:
  - add the seven columns of design decision 1, with one-line doc comments on `match_have`, `match_sale` and `takes_swaps` (the post's want side and sale lead);
  - add `check("trade_post_open_to_something", sql\`${t.matchHave} OR ${t.matchSale}\`)`;
  - extend the table's doc comment: each side's Trade state and bump, kept equal to its lists by `writePosts` while a list is in at most one row (`packages/api/docs/trade.md`).

  Checks pass for `@repo/db`.
- [x] 2.2 Before generating, look for a migration from `trade-post-hides-by-row` in `packages/db/migrations/`. If it exists and is not yet applied anywhere, stop and ask the owner which goes first (design, Open Question 5). Then, from `packages/db`, run `bun run db:generate --name trade_post_state`. Confirm that `migration.sql` holds only the seven `ADD COLUMN`s and the `ADD CONSTRAINT … CHECK`, and that the snapshot diff adds only those.
- [x] 2.3 Edit that `migration.sql` by hand (design decision 12), each block before its own `--> statement-breakpoint`:
  - at the top, the comment and `SELECT set_config('lock_timeout', '3s', true);` exactly as in `20261115125616_drop_linked_list_id`;
  - at the end, the backfill `UPDATE` by `postStateOf`'s rule, with a comment saying that the build live during it writes `lists` only, so `trade_post_state_reconcile` runs it again.

  Verify by reading that the backfill's SQL gives the same value as `postStateOf` for each column, including the open list and the sale-only `takes_swaps`.

## 3. Writers

- [x] 3.1 `packages/api/src/services/list/shared.ts`:
  - `lockPosts`' second statement also selects the four list columns and the row's seven state columns, and fills `TradeListState` and `PostRow.state`;
  - `tradeState` adds `bumpedAt`, `matchHave`, `matchSale` and `takesSwaps`;
  - `writePosts` writes `ops.states` in one `UPDATE trade_post … FROM unnest(…)` after the lead and want updates, and inserts rows with their state;
  - `writePosts`' doc comment says it keeps each row's state equal to its lists.

  Checks pass for `@repo/api`.
- [x] 3.2 `packages/api/src/services/trade/post.ts`: the `saleSwaps` `UPDATE` gains `.returning(tradeState)`, pushed into `written`. Verify with `git diff` that the `on` and `off` writes, `takeDownPost`, `writeList` and `deleteList` need no change beyond the wider `tradeState`. Checks pass for `@repo/api`.
- [x] 3.3 `packages/api/src/services/trade/feed/mine.ts`, `bumpPerson`:
  - run it in a transaction: `lockTradeLists`, then one statement in which a data-modifying CTE bumps `lists` and sets `lead_bumped_at` and `want_bumped_at` on the person's rows from its `RETURNING` (design decision 5);
  - the refusal path is unchanged;
  - one comment states why the lock is taken.

  Checks pass for `@repo/api`.
- [x] 3.4 `packages/api/docs/trade.md`, Trade posts:
  - a row holds each side's Trade state and bump and the post's Open to;
  - writers keep them equal to the lists through `planPostWrite`, and `bumpPerson` writes them under the lock;
  - `list.edit` leaves an off-Trade row's Open to until the next post write, and why.

  `docs/lists.md`: add `bumpPerson` to the lock's takers. Verify that both docs name `postStateOf`.

## 4. The drift script

- [x] 4.1 `apps/worker/src/script/trade-post-drift.ts`: add checks 5 and 6 of design decision 9 to `CHECKS`, and rewrite the header comment to say that they hold while a list is in at most one row. It runs only after migration A (task 6.1 is its first run). Checks pass for the worker.
- [x] 4.2 `apps/worker/AGENTS.md`, Trade post drift: add the two checks, and that before the reconcile they count rows of people who have not written since migration A.

## 5. Part A checks

- [x] 5.1 Run `bun run check` and `bun run build --filter=web` from the root; both pass. Grep `packages/api/src`, `apps/worker/src` and `apps/web/src` for `lead_on_trade`, `leadOnTrade`, `want_on_trade` and `wantOnTrade`. The only hits are the writers, `lockPosts`, the planner, its tests and the drift script; no reader yet.

## 6. Local proof of part A

- [x] 6.1 Ask the owner to approve applying migration A to the local database. Then run `bun run --filter=@repo/db db:migrate` (the `guard-prod-db` hook allows only a local host). Run the drift script: all six checks read zero.
- [x] 6.2 Ask the owner to approve, by name, the local rows of 6.3 on `localtest1@local.invalid` and `localtest2@local.invalid`. Record those accounts' lists, Trade state, Open to, `takes_swaps`, `bumped_at` and rows, so 6.3 can restore them.
- [x] 6.3 Run the dev server on `.env.local` and drive it through the `browser-use` CLI, under `~/.claude/CLAUDE.md`'s rules:
  - use your own tab by target id;
  - wait for hydration before submitting a sign-in;
  - put these rules in any brief given to a subagent.

  After each step, run the drift script (zero on all six checks) and a read-only query printing the accounts' rows with their seven state columns. The steps:
  - post a Swap pair from the composer;
  - post a Sell post with "Also open to swaps", then edit it to Sell only;
  - post a Buy post with Buying only;
  - edit the Swap post to swap its want list (a split and a new row);
  - Take off Trade, then post it again;
  - post a lone have list paired with an off-Trade want list (lead on, want off);
  - Bump;
  - save Open to on an off-Trade want list in the list form, then check that drift reads zero (check 6 ignores it) and that the row's copy is unchanged;
  - delete a paired lead whose want list is on Trade (a takeover).

  Check also that a written `bumped_at` read back from a row equals the list's to the microsecond. Restore the recorded state at the end. Record each step in design.md's As built.
- [x] 6.4 Check that Browse, For you, the person page and My posts show what they showed before group 1, by comparing screenshots taken before 6.3 with screenshots taken after it. The full byte check comes in group 10.

## 7. Rollout A (the owner)

- [x] 7.1 The owner commits and pushes, and CI passes and moves `:latest`. The owner runs `docker compose run --build --rm migrate`, then brings up web. The worker is not rebuilt. Record the migration's applied time and the time web A serves.
- [x] 7.2 With a go-ahead, run the drift script read-only on production. Checks 1 to 4 read zero. Record the counts of checks 5 and 6 (people who have not written since the migration) in design.md.

## 8. Part B: readers on the row

- [x] 8.1 `packages/api/src/services/trade/lists.ts`: add `onTradeSql` and `postStateSql(alias, field)` (design decision 7). In `lib/trade-sql.test.ts`, pin the text of both. Checks pass for `@repo/api`.
- [x] 8.2 `services/trade/feed/query.ts`: `postsCte`'s `on_trade` becomes `onTradeSql`, and nothing else in `postsCte` or `listedCte` changes. Update the comment above `postsCte`: Trade state and bumps come from the rows' sides. Checks pass for `@repo/api`.
- [x] 8.3 `services/trade/feed/entries.ts`: `feedListColumns`' `matchSale`, `matchHave`, `takesSwaps` and `bumpedAt` come from `postStateSql("lists", …)`. `services/trade/feed/mine.ts`: `fetchOwnTradeLists` filters on a side on Trade. Checks pass for `@repo/api`.
- [x] 8.4 `services/trade/matches/candidates.ts`: `partner_lists` reads `FROM on_trade l`. Its other conditions are unchanged, and `my_want` and `my_have` stay on `lists`. Checks pass for `@repo/api`.
- [x] 8.5 `apps/worker/src/job/want-alerts/pairs.ts`: `cand` joins `on_trade l` in place of `lists l … WHERE l.discoverable`. `wl` and `ol` stay on `lists`. Checks pass for the worker, including the import-boundary test.
- [x] 8.6 Grep for every reader in design decision 8's table and confirm each is unchanged. Grep `packages/api/src` and `apps/worker/src` for `discoverable`, `bumped_at`, `match_have`, `match_sale` and `takes_swaps`, and confirm that every remaining hit is in decision 8's table, a writer, or the drift script. Record the list in As built.
- [x] 8.7 `packages/api/docs/trade.md`:
  - Trade posts: the reads that build posts take Trade state, bumps and the post's Open to from the row (`onTradeSql`, `postStateSql`), and list-level and viewer-own reads stay on `lists`;
  - "Partner rules, hidden and idle posts": the idle rule reads the row's bump and the list's `updated_at`.

  Verify that the sentence "its Trade state and its tags are still read from its lists" is gone.

## 9. Migration B

- [x] 9.1 From `packages/db`, run `bun run db:generate --custom --name trade_post_state_reconcile`. Write its SQL by hand (design decision 12):
  - the `lock_timeout` line;
  - `LOCK TABLE "lists" IN EXCLUSIVE MODE;`, with a comment saying that every `trade_post` writer starts with `lockTradeLists`, so this waits for them and freezes the values read, and that SHARE would deadlock against `deleteList`;
  - migration A's backfill, unchanged.

  Verify that `db:generate` afterwards finds no schema diff.

## 10. Local proof of part B

- [x] 10.1 On part A's committed code (the commit deployed in 7.1), before group 8 is applied, write `apps/worker/.trade-post-state/reads.ts`. It writes one JSON file of, for `localtest1` and `localtest2` and signed out:
  - `trade.people` first pages for every type filter and for Mutual and Any;
  - `trade.myPosts`;
  - `fetchTradeCandidates` for each filter;
  - `fetchPairs` for want alerts over all entries;
  - the post counts of three collection slugs.

  Each is sorted, with fixed `now`s where the code takes one. Run it on part A's code as `reads-before.json`, outside the repo.
- [x] 10.2 With the owner's approval, apply migration B locally, and run the drift script: zero.
- [x] 10.3 Run `reads.ts` on part B's code as `reads-after.json`. `cmp` with `reads-before.json` must find them identical. Then delete the script and both files.
- [x] 10.4 With the owner's approval of the rows, repeat 6.3's browser pass on part B's code, with drift after each step, then restore.
- [x] 10.5 Run `EXPLAIN` for `postsCte`'s people read and the market's `countedListings`, read-only on the local database, before and after part B. Record whether `lists_trade_feed_idx` and `lists_trade_discoverable_idx` appear, and whether `onTradeSql` reads `trade_post` by sequential scan, for the contract change.
- [x] 10.6 Run `bun run check` and `bun run build --filter=web`; both pass.

## 11. Rollout B (the owner)

- [x] 11.1 The owner commits and pushes, and CI passes. The owner runs `docker compose run --build --rm migrate`. The live build is web A, which writes both, so nothing waits on a deploy.
- [x] 11.2 With a go-ahead, run the drift script read-only on production. **All six checks must read zero, or stop.** This is the gate before any reader moves to the rows.
- [x] 11.3 The owner brings up web B, and rebuilds and brings up the worker from the same commit on the VPS. With a further go-ahead, run the drift script read-only again, plus the `EXPLAIN` of task 10.5 on production, read-only. Record all of it, the times, and the rollback floor (web A from migration B on) in design.md's As built.

## 12. Agent docs

- [x] 12.1 Using `writing-for-agents`:
  - `packages/db/AGENTS.md`, Trade posts: each row holds its sides' Trade state, bump and the post's Open to, kept equal to its lists while a list is in at most one row. Note the two migrations, and that no build older than web A may run after `trade_post_state_reconcile`.
  - `apps/worker/AGENTS.md`, Want alerts: a partner list's state comes from `on_trade`, not from `lists`.
  - `packages/api/AGENTS.md`, `apps/web/AGENTS.md` and the root `AGENTS.md`: check them against the diff, and state in As built that none of their conventions changed, or update the one that did.

## Workflow follow-up

- Archive with `/opsx:archive` once group 11 is recorded. Then propose `trade-post-hides-by-row` (if it has not landed) and, after `trade-post-planner-shared`, `trade-post-state-contract`.

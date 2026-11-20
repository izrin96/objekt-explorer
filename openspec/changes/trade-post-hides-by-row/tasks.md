## Ground rules

- **Approvals.** No task commits, pushes or runs a migration without the owner's approval for that action. No `git stash`; use a WIP commit only if the owner asks for commits.
- **Production.** The root `.env` is production. A production read runs read-only (`PGOPTIONS='-c default_transaction_read_only=on'`) and only with the owner's go-ahead.
- **Local runs** use `.env.local`: the local compose Postgres, with the indexer on production read-only.
- **Local test rows.** Writes to `localtest1@local.invalid` and `localtest2@local.invalid` rows are approved once, at task 7.1, and each group restores what it changed.
- **Checks.** Each code task ends with `bun run lint` and `bun run typecheck` passing for the package it touched (`--filter=@repo/db`, `--filter=@repo/api` or `--filter=worker`). A task in `packages/api` also ends with `bun run build --filter=web` passing.
- **Scratch scripts** live in `apps/worker/.hides-by-row/`:
  - bun resolves `@repo/*` from the script's path, and a dot-directory stays out of lint, typecheck and commits;
  - each refuses to start unless the hosts of `DATABASE_URL` and `REDIS_URL` are `localhost` or `127.0.0.1`, except the read-only production runs of group 8, which instead refuse to start unless `show transaction_read_only` is `on`;
  - run them from `apps/worker` with `bun run --env-file=../../.env --env-file=../../.env.local <path>`;
  - delete the directory when group 8 is done.

## 1. Baseline

- [x] 1.1 Write `apps/worker/.hides-by-row/staged.ts`, built from the imported helpers. It puts `WITH hidden_trade_post AS (SELECT user_id, list_id, created_at, <postRowSql over list_id> AS post_id FROM public.hidden_trade_post)` ahead of each statement, or a `VALUES` staging of made-up hides when given `--stage`. Over every hider, it prints:
  - the posts `inHiddenPostSql(…, "posts")` hides over `postsCte`;
  - the lists on Trade `inHiddenPostSql(…, "l")` covers;
  - the hides `hidesOfSql` returns for each list on Trade.

  It also keeps a verbatim copy of today's `coveredListsSql` and `hidesOfSql` text under the aliases `previous_hp` and `previous_row`, for task 8.1. Check: it runs against the unchanged code and writes its output to a file outside the repo, `before.json`.
- [x] 1.2 Read-only on the local database, record:
  - the hides;
  - the hides on a list in no row;
  - the `(user_id, row)` pairs two hides would share after the backfill;
  - the hides on the hider's own row;
  - localtest2's lists, Trade state and `trade_post` rows (ids included), for restores.

  Check: the numbers are written into a new "As built" section of `design.md`.

## 2. Schema and migration

- [x] 2.1 `packages/db/src/schema.ts`, `hiddenTradePost`, per design decision 6:
  - `listId` nullable with no `references`;
  - `postId` NOT NULL, referencing `tradePost.id` `onDelete: "cascade"`;
  - the primary key on `(userId, postId)`;
  - `hidden_trade_post_post_id_idx` added, `hidden_trade_post_list_id_idx` kept;
  - the doc comment rewritten.

  Check: `bun run typecheck --filter=@repo/db`.
- [x] 2.2 From `packages/db`, run `bun run db:generate --name hidden_trade_post_by_row`, on top of `20261120085525_trade_post_state_reconcile` (`trade-post-state`'s decision 5: it went first, so this change generates fresh, with no hand-merged snapshot). Check that the new snapshot's `prevIds` names that migration's id (`011614da-…`), that the SQL holds only these statements, and that the snapshot changes only `hidden_trade_post`, with no `trade_post` state column or `trade_post_open_to_something`:
  - the primary key swap;
  - `ADD COLUMN post_id`;
  - `list_id DROP NOT NULL`;
  - the drop of `hidden_trade_post_list_id_lists_id_fkey`;
  - the new foreign key;
  - the new index.
- [x] 2.3 With the owner's approval of a rolled-back local run: in a local `psql` session, `BEGIN`, then `ALTER TABLE hidden_trade_post DROP CONSTRAINT hidden_trade_post_list_id_lists_id_fkey`, then read this backend's `pg_locks` for `lists` and `ROLLBACK`. Check: the mode is recorded in "As built", and the migration's first `LOCK TABLE "lists"` names it. Also check that the mode conflicts with ROW SHARE (`EXCLUSIVE` or `ACCESS EXCLUSIVE`). A weaker one is granted while `deleteList` holds its `lists` rows and has written its `trade_post` rows; the migration then waits on `trade_post`, and `deleteList`'s list `DELETE` waits on the migration (`trade-post-state`, decision 12). If it is weaker, stop and ask the owner before 2.4.
- [x] 2.4 Hand-edit the migration into the order of design decision 6, steps 1 to 10, each block before its own `--> statement-breakpoint`:
  - the `lock_timeout` line, copied from `20261115125616_drop_linked_list_id`, with its comment naming the tables this migration queues readers and writers behind (`lists`, `trade_post`, `hidden_trade_post`), as `trade_post_state` and its reconcile reworded theirs;
  - the two `LOCK TABLE`s, `lists` in EXCLUSIVE mode (or the stronger mode 2.3 measured, never weaker; owner, 2026-11-20), with a comment giving the writers' order: `lockTradeLists`, then `trade_post` rows, then hides. Since `trade-post-state`, `bumpPerson` and `writePosts`' state `UPDATE` (`writeStates`) also write `trade_post` after `lockTradeLists`, so the order holds for them. The migration writes no `trade_post` row, so its state columns and `trade_post_open_to_something` are untouched;
  - the backfill, the fold and the orphan delete, each with a one-line comment;
  - the primary key and NOT NULL statements;
  - the index and the foreign key;
  - the trigger function and trigger of decision 7, with a comment: for the build before this change, which writes hides without `post_id`; dropped with `list_id`.

  Check: `bun run --filter=@repo/db db:generate` afterwards reports no schema change.
- [x] 2.5 `packages/db/AGENTS.md`, Trade posts. Add:
  - `hidden_trade_post.post_id`, the primary key and the cascade;
  - that `list_id` has no key and is read only by builds before this change;
  - the trigger, why it exists and when it goes;
  - that Drizzle's snapshot does not track it.

  Check: the paragraph names migration `hidden_trade_post_by_row`.

## 3. The planner reports moves

- [x] 3.1 `packages/api/src/lib/trade-post-rows.ts`:
  - add `moves: { from: PostId; to: PostId }[]` to `PostRowOps` (`:31-36`);
  - add `movesOf` (design decision 3), called last in `planPostRows` (`:58-108`), on `relead`'s result. `relead` returns early with `ops` as it is, so set `moves` on whatever it returns;
  - extend the `planPostRows` doc comment with one sentence on where a hide goes.

  `planPostWrite` (`:261-323`) needs no edit: it spreads `ops` into `PostWriteOps`, which is `Omit<PostRowOps, "inserts">` plus state, so `moves` reaches `writePosts` typed. `movesOf` reads `PostRow`s, which now carry `state`; it copies them whole and reads only ids and lists.
- [x] 3.2 `trade-post-rows.test.ts`: one test per row of design decision 2's table, asserting `moves` exactly:
  - D3 merge, D2 merge, `relead`;
  - D1;
  - `deleteList` with the want list on and off Trade;
  - unpair;
  - takeover;
  - Edit post swap.

  The test's `PlainOps` type and `NONE` gain `moves`, so every `planPostRows` expectation states it (`moves: []` where none). The `planPostWrite` helper `write` (`:368-378`) drops `states` and each insert's `state` and passes the rest on, `moves` included, so its expectations gain `moves` too. The state helper at `:500` returns only `inserts` and `states` and is unchanged. The `deleteList` cases need `removed`, so they go through `write`. Check: `bun test packages/api/src/lib/trade-post-rows.test.ts`.
- [x] 3.3 `trade-post-rows.model.test.ts`: in `applyOps` (`:132`), which takes `PostRowOps | PostWriteOps` and already counts `releads`, on every random write keep one simulated hide per row, apply `moves`, then the explicit source delete and the cascade of `deletes`, and assert:
  - every `to` survives the write;
  - no id is both a `from` and a `to`;
  - each `from` appears once;
  - each `to` holds its `from`'s old lead;
  - no simulated hide points at a deleted row;
  - a row re-led because its lead was removed keeps its hide.

  Count moves by kind beside `releads`: at least 100 each for D2, D3 and takeover, and exactly 0 for D1. The model's own invariant (no list in two rows) keeps random writes from making a second row of one lead, so task 3.2's unit test is D1's only cover. Check: `bun run test --filter=@repo/api`.

## 4. `writePosts` applies the moves

- [x] 4.1 `packages/api/src/services/list/shared.ts`, `writePosts` (`:191-219`): when `ops.moves` is not empty, run before the row deletes (`:202`) the `INSERT … ON CONFLICT … DO UPDATE` and the `DELETE` of design decision 4, with one `unnest` of two int arrays, in a helper beside `writeStates`. The order becomes moves, deletes, updates, `writeStates`, inserts. Add one comment: before the deletes, or the `post_id` cascade takes the hides first.
- [x] 4.2 Extend the `writePosts` doc comment: it moves hides as the planner says, in the same transaction. Extend the `lockTradeLists` comment (`:60-66`, which now names `bumpPerson` among the writers) with the order: lists, then rows, then hides. Check: lint, typecheck, `bun run build --filter=web`.

## 5. Readers and writers of hides

- [x] 5.1 `packages/api/src/services/trade/lists.ts`:
  - `coveredListsSql` (`:67-76`) and `hidesOfSql` (`:83-86`) as in design decision 1. `inHiddenPostSql` and `hiddenPostAtSql` keep their text. Their callers need no edit: the feed's `posts` and candidates' `on_trade l` (part B) both carry the list as `id`, and `pairs.ts` asks over `lists pl`;
  - their doc comments rewritten ("the lists of a hidden row");
  - `hidesOfSql` no longer imports `postPartnerSql`.
- [x] 5.2 `packages/api/src/services/trade/hidden.ts`:
  - `hidePost` and `unhidePost` as in design decision 5;
  - `fetchHiddenPosts` rewritten on `trade_post` (`listId` = the lead, `slug`, `names` and `profile` as decided), with the two subqueries and the JS dedupe dropped. The slug `CASE` keeps reading `lists.discoverable`: `trade-post-state` left that `CASE` on `lists` for `trade-post-reads-by-row` (its decision 8), and drift check 5 keeps the two equal;
  - the doc comments say a hide names a row.
- [x] 5.3 `packages/api/docs/trade.md`, Partner rules, hidden and idle posts, and Trade posts, per design decision 11. The Trade posts paragraph on row state keeps "hides" in "Reads that ask about a list as such stay on `lists`": that sentence is about Trade state, and hides read the row's lists but no state. Check: `grep -n "list_id" packages/api/docs/trade.md` no longer describes a hide ending by the list cascade.
- [x] 5.4 Grep `hidden_trade_post`, `hiddenTradePost`, `hidesOfSql`, `coveredListsSql` and `list_id` over `packages/api/src` and `apps/worker/src`. Check: the only hide code left on `list_id` is what writes it (`hidePost`, the move). Run lint, typecheck and `bun run build --filter=web`.

## 6. Worker and drift

- [x] 6.1 `apps/worker/src/job/want-alerts/record.ts`, `unhidePosts` (`:40-53`, the predicate at `:51`): delete by `gone.post_id IN (SELECT hp.post_id …)` (design decision 5). Keep the doc comment true: "the hide of the post that holds the list". Check: `bun run test --filter=worker`, which includes `import-boundary.test.ts`.
- [x] 6.2 `apps/worker/src/script/trade-post-drift.ts`:
  - add the check of design decision 9 as check 7, after today's six (`CHECKS`, `:41-93`), and its note as the third entry of `NOTES` (`:96-108`);
  - add a header sentence on hides: check 7 holds whatever the pairing, and the note counts what a build before this change reads differently. The header has no sentence on hides today.
- [x] 6.3 `apps/worker/AGENTS.md`:
  - Trade post drift: drop "and none compares hides with rows: a hide names a list and is valid whatever the rows say", and add check 7 and the third note;
  - want alerts: the worker's unhide deletes the hides of the entry list's row.

  Check: lint and typecheck for `worker`.

## 7. Local proof

- [x] 7.1 Ask the owner to approve:
  - applying the migration to the local database;
  - the local test rows of group 7.

  Then run `bun run --filter=@repo/db db:migrate`; the `guard-prod-db` hook allows it only against the local host. Check, read-only:
  - every hide has a `post_id`, the lowest row its `list_id` leads, else the lowest it is the want list of;
  - the counts match task 1.2, minus orphans and folds;
  - `\d hidden_trade_post` shows the primary key, the index, the foreign key and the trigger.
- [x] 7.2 Run `staged.ts` again on the new code, writing `after.json`. Check: posts and lists hidden are identical to `before.json`. Then run it with `--stage` over a made-up viewer's hides on every third list of each kind. Check that every hide's covered lists are exactly its row's lists, and that the set and lookup forms agree on every list. Then run `EXPLAIN (ANALYZE)` of the `pairs.ts` lateral (`hiddenPostAtSql` over a `lists` alias) for the staged viewer, and record the plan's shape in "As built" (design decision 10).
- [x] 7.3 Write `apps/worker/.hides-by-row/paths.ts`. As localtest2, through `savePost`, `takeDownPost` and `deleteList`, run each path of design decision 2's table, with a hide by localtest1 on the post first, inserted through `hidePost`. After each path, assert localtest1's hides: which row each sits on, its `created_at`, and that no statement errored. Then:
  - with hides on both posts of a merge, assert one hide survives at the later `created_at`;
  - run the old build's insert, `INSERT INTO hidden_trade_post (user_id, list_id) VALUES (…) ON CONFLICT DO NOTHING RETURNING list_id`, for a list in a row and for a list in no row, and assert the trigger set the row or skipped the insert.

  Restore localtest2 to task 1.2's record.
- [x] 7.4 Run the drift script read-only against the local database. Check: all seven checks read zero, and the hide note prints the count the runs above left.
- [x] 7.5 Browser pass, local, as localtest1 viewing localtest2. Use the `browser-use` CLI (`browser-use <<'PY' … PY`) on the automation Chrome:
  - **Setup:** `BU_CDP_URL=http://127.0.0.1:9333`, profile `~/.chrome-automation`; start it per `~/.claude/CLAUDE.md` if `curl -s http://127.0.0.1:9333/json/version` fails.
  - **Tabs:** open and drive a tab of your own by target id.
  - **Sign-in:** wait until the page has hydrated before submitting the sign-in form. If a credential reaches a URL or log, delete that log and tell the owner.

  Check each step, with the owner's approval of its rows:
  - (a) Hide post on a post in Browse: it leaves at once. Undo brings it back. Hide it again.
  - (b) `/account/hidden` lists it once by its lists' names, and its link opens the post page, which offers Unhide post.
  - (c) localtest2 pairs a hidden Buy post with a have list that is off Trade: the pair stays hidden, and `/account/hidden` names both lists.
  - (c2) localtest1 hides a post that is one have list alone. localtest2 takes it off Trade, then edits a live Buy post into a Swap post with that have list: the merged post is hidden, and `/account/hidden` lists it once. This step runs a move (D2, R1 → R2) through the UI.
  - (d) localtest2 unpairs it and posts the want list again: the have list stays hidden, and the want list is on Browse with Hide post.
  - (e) localtest2 deletes the have list of a hidden pair whose want list is on Trade: the Buy post stays hidden, and `/account/hidden` names it.
  - (f) Unhide from `/account/hidden`: the post is back on Browse.
  - (g) No console error from the app.

  Restore localtest2's lists and rows to task 1.2's record, and leave no hide. Record what each step showed in "As built".
- [x] 7.6 Check: `bun run check` passes, and `bun run build --filter=web` builds.

## 8. Rollout (the owner)

- [ ] 8.1 With a go-ahead, read-only on production, from the working tree before the migration:
  - the counts of task 1.2: orphans expected 2, shared `(user, row)` pairs 0, own-row hides 0;
  - `staged.ts` against the previous helpers' text: 0 posts and 0 lists on Trade newly hidden or no longer hidden;
  - the drift script: checks 1 to 6 at zero, since web B and worker B (`1568f6b1`) are live and the hide check and note are not there yet;
  - `EXPLAIN (ANALYZE)` of the For you hide filter for the heaviest hider, on the live build's helpers, as 8.4's baseline. The 2026-11-15 figure predates `trade-post-state` part B, which rebuilt `on_trade` from the rows.

  Any other number stops the rollout.
- [ ] 8.2 The owner commits and pushes; CI passes and moves `:latest`.
- [ ] 8.3 The owner runs `docker compose run --build --rm migrate`, then brings up web, then rebuilds and restarts the worker. The build live during the migrate is web B and worker B, `1568f6b1`; the trigger serves its hides. Check: the migration's `applied_at` and the time the new web serves are recorded in "As built". Drizzle's `created_at` holds the folder's timestamp, not the apply time (`trade-post-state`, As built), so record the time the migrate exits.
  - **Rollback:** web B and worker B, `1568f6b1`. Web goes no lower than web A, `2f107ab3`, which has the same hide code (`packages/db/AGENTS.md`, Trade posts).
- [ ] 8.4 With a go-ahead, read-only on production:
  - the drift script: all seven checks zero, the hide note printed;
  - the hide count, equal to 8.1's minus orphans and folds, plus any hides made since;
  - `EXPLAIN (ANALYZE)` of the For you hide filter for the heaviest hider, within 1.5 times 8.1's figure;
  - `EXPLAIN (ANALYZE)` of the `pairs.ts` lookup for the same hider, at most 1 ms per probe, with its plan's shape recorded.

  Record all of it in "As built". Delete `apps/worker/.hides-by-row/`, and check that `git status` shows nothing of it.

## 9. Package docs

- [x] 9.1 Check that `packages/db/AGENTS.md` (task 2.5), `apps/worker/AGENTS.md` (task 6.3) and `packages/api/docs/trade.md` (task 5.3) describe the code as built. `packages/api/AGENTS.md`, `apps/web/AGENTS.md` and the root `AGENTS.md` lose no convention, trap or workflow: state that in "As built" and leave them as they are.

## Workflow follow-up

- The contract change (stop writing `list_id`, then drop it with the trigger and function) follows once this build is live: design, Inputs for later phases.
- Archive with `/opsx:archive` after group 8.

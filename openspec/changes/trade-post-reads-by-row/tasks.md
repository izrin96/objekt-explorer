## Ground rules

- **Git.** No task commits, pushes or uses `git stash`: the stash stack is shared by every worktree and holds 34 entries. A checkpoint is a WIP commit, made only with the owner's approval. The work happens in the `shared-lists-orca` worktree, after `trade-post-state-contract`'s uncommitted As built is committed or set aside by the owner. Leave `openspec/changes/trade-post-state-contract/` alone.
- **Production.** The root `.env` is production, and every local run uses `.env.local`.
  - A production read runs only with the owner's go-ahead for that run. It uses `PGOPTIONS='-c default_transaction_read_only=on'` and never prints a connection string or secret.
  - The owner deploys. This change has no migration.
- **Local data.** The owner approves once, at task 0.1, for tasks 0.1 and 7.4: the test rows on `localtest1@local.invalid`, `localtest2@local.invalid` and `localtest5@local.invalid` (which exists locally with no lists), including one second `trade_post` row and one off-Trade Open to edit. Each task puts back what it changed.
- **"Checks pass"** means:
  - for `@repo/api`: `bun run lint --filter=@repo/api`, `bun run typecheck --filter=@repo/api` and `bun run build --filter=web`;
  - for the worker: `bun run lint --filter=worker`, `bun run typecheck --filter=worker` and `bun test apps/worker/src/import-boundary.test.ts`.
- **Tests** cover pure modules only, never the database.
- **No `.tsx`, message, `/rpc` input, output shape, migration or index change is expected.** If one turns out to be needed, stop and ask. A `.tsx` edit would also need `vercel-react-best-practices` loaded first (a repo hook enforces it).
- **Comments** state only a non-obvious why.
- **Read first:** `packages/api/docs/trade.md` (Trade matching, Trade posts) and `apps/worker/AGENTS.md` (Want alerts, Trade post drift).
- **Scratch files** live in `/private/tmp/claude-501/reads-by-row/`. A script that needs `@repo/*` is copied into `apps/worker/.reads-by-row/` only to run, and removed after.
- **The drift script** runs from `apps/worker`:

  ```
  PGOPTIONS='-c default_transaction_read_only=on' bun run --env-file=../../.env --env-file=../../.env.local src/script/trade-post-drift.ts
  ```

  - Drop the second `--env-file` for production.
  - "The old drift script" is `git show 8b05487c:apps/worker/src/script/trade-post-drift.ts`, saved in the scratch folder and copied in only to run.

## 0. Baseline

- [x] 0.1 Before any code changes, at `8b05487c`, with the owner's one approval (Ground rules, Local data), save a baseline to the scratch folder. Run the dev server and drive it as task 7.4 step 3 says, then save as JSON:
  - as localtest1: `trade.people` (no filter, then Mutual), `trade.person` for localtest2, `trade.hiddenPosts`;
  - as localtest2: `trade.myPosts`;
  - a screenshot of localtest2's row on Browse and For you;
  - a dry want-alerts run: a scratch script runs `fetchPairs`, `loadContext`, `selectAlerts` and `selectUnhides` read-only, never `recordRun`, over the last 1,000 entries.

  Put the local data back as task 7.4 does. Lint and typecheck are unchanged, since no code changed.

## 1. Reading helpers, added beside the old ones

- [x] 1.1 In `packages/api/src/lib/trade-sql.ts`, as design decisions 1 and 2 give them:
  - `onTradeRowsSql` adds `tp.id AS post_id` and `side`;
  - add `listTradeStateSql(alias, field)`: the `bool_or` of the list's sides on Trade by the type rule, else the list's own; the bump is the latest of its sides on Trade, else null;
  - add `sideStateSql(row, list, field)`, the twin of `sideStateOf`;
  - add `listPostSql(alias)`: the lowest row whose side holding the list is on Trade, else `postRowSql`'s.

  In `trade-sql.test.ts`, pin the text of each. `postStateSql` stays until task 3.4. Checks pass for `@repo/api`.
- [x] 1.2 In `packages/api/src/services/trade/lists.ts`, add `hiddenRowsSql(viewer)` and `hiddenRowAtSql(viewer, row)`, the row form of `hiddenPostAtSql`. `hidesOfSql` keeps its list form for `unhidePost`. Checks pass for `@repo/api`.
- [x] 1.3 In `packages/api/src/lib/trade-posts.ts`, add `sideStateOf(row, list)` and `postFromRow(row, lead, want)` (design decisions 1 and 3). Lock `sideStateSql` to `sideStateOf` in `trade-sql.test.ts` with a table. Unit cases in `trade-posts.test.ts`:
  - a pair;
  - a lone side, lead or want;
  - a Sell only lead with its want side on Trade, which gives two posts;
  - an off side, which takes the list's own Open to;
  - one list in two rows with different Open to, which gives two posts, each with its own row's values.

  Verify with `bun test packages/api/src/lib/trade-posts.test.ts packages/api/src/lib/trade-sql.test.ts`. Checks pass for `@repo/api`.

## 2. Posts by row

- [x] 2.1 In `packages/api/src/services/trade/feed/query.ts`, as design decision 2 gives it:
  - `postsCte` pairs within a row and carries `post_id`;
  - add `listedPostsCte`, the row ids of listed posts. `listedCte` stays until task 5.1 moves its last caller;
  - `feedWhere` and `fetchPersonRows` test hides with `hiddenRowsSql`;
  - `FeedRow` gains `post_id`;
  - `matchesIndex` joins the post's own sides.

  Then:
  - `computePostCounts` (`counts.ts:25-33`) joins the post's own sides;
  - `hidePost` (`hidden.ts:98-108`) hides the lowest `post_id` anchored at the list.

  Checks pass for `@repo/api`.

## 3. Post readers

- [x] 3.1 `loadPosts` (`feed/posts.ts:99-238`) reads the page's lists and rows in one `Promise.all`, and builds each post with `postFromRow`. `fetchMyPosts` (`feed/mine.ts:25-72`) reads the viewer's `postsCte` rows and builds them the same way. Checks pass for `@repo/api`.
- [x] 3.2 Add a by-list variant of `feedListColumns` with `listTradeStateSql`. `findTradeList` takes it. `listedTradeLists` (`feed/shared.ts:45-60`) takes the person's listed posts from `postsCte`, then the by-list columns. Checks pass for `@repo/api`.
- [x] 3.3 `fetchPostCards` and `staffPosts` (`feed/post-cards.ts`), and `reportedPost` (`services/moderation/report.ts:69-99`), read `listPostSql`'s row and its lists and build the post with `postFromRow`, each with its own filter (design decision 3). Delete `inPostsOf`. `fetchHiddenPosts`' slug (`hidden.ts:133-137`) reads the row's `lead_on_trade` and `want_on_trade`. Checks pass for `@repo/api`.
- [x] 3.4 `feedListColumns` (`feed/entries.ts:19-39`) keeps list columns only. Delete `postStateSql` and its cases in `trade-sql.test.ts`. Verify:
  - `grep -rn "postStateSql\|inPostsOf" packages apps` is empty outside `openspec/`;
  - checks pass for `@repo/api`.

## 4. Matching

- [x] 4.1 As design decision 4 gives it:
  - rewrite `fetchTradeCandidates` (`matches/candidates.ts`): `partner_sides` over `listedPostsCte` and `hiddenRowsSql`, `partner_lists` with the union, `partner_post` by row, and `post_of` with `post_leads` in their own CTE; `my_want` and `my_have` take `listTradeStateSql`;
  - make `PostOf` (`lib/trade-person.ts`) `list id → row ids`, with `postLeads` beside it;
  - change `swapScore` and `fillMatches` (`lib/offer-prefill.ts`). `theirPostId` stays the lead list id;
  - delete `coveredListsSql` and `inHiddenPostSql`, whose last caller this was.

  Add unit cases:
  - a partner have list in two pair rows;
  - a tie, which names the same pairing as the old keys;
  - `fillMatches` keeping only the best row's lists.

  Verify with `bun test packages/api/src/lib/trade-person.test.ts packages/api/src/lib/offer-prefill.test.ts`. Checks pass for `@repo/api`.
- [x] 4.2 The viewer (decision 5):
  - `viewerPostOf` (`lib/trade-rank.ts:55-64`) takes the viewer's rows and `sideStateOf`;
  - `resolveTradeSides` reads the lists and the rows in one `Promise.all`;
  - `myEntries` (`matches/recount.ts:70-80`) and `fetchViewer` (`feed/viewer.ts:72-90`) take `listTradeStateSql`.

  Add `viewerPostOf` cases in `trade-rank.test.ts`:
  - a pair on Trade and a pair off Trade;
  - an off pair whose row's `takes_swaps` lags the list, which follows the list;
  - a list in two rows.

  Checks pass for `@repo/api`.
- [x] 4.3 Bump the version of each ranking cache whose value holds a post key, `postOf` or a count from one. Read each cache's value type, and record the ones bumped and the ones left in design As built. In `docs/trade.md`, update Cache versions and the post-key sentences in Can swap (Mutual): a post key is a row, and `swapPair` maps it to the lead. Checks pass for `@repo/api`.

## 5. Want alerts

- [x] 5.1 As design decision 6 gives it:
  - in `apps/worker/src/job/want-alerts/pairs.ts`: `cand` per side over `listedPostsCte`, with `post_id`; `pairs` carry `post_id`; the hide test through `hiddenRowAtSql`; `wl` and `ol` through `listTradeStateSql`;
  - in `apps/worker/src/lib/want-alert-match.ts`: `AlertPair` gains `postId`; `judge` reads the group's union (`partnerSale` when every pair says so, `partnerWantsSwaps` when any does); `Unhide` becomes `{ userId, postId }`;
  - `unhidePosts` (`job/want-alerts/record.ts:40-53`) deletes by `post_id`;
  - `loadContext` (`context.ts:15-38`): `swapPair` reads the rows through `sideStateSql`, and `takesSwaps` and `matchHave` take `listTradeStateSql`;
  - delete `listedCte` and the list form of `hiddenPostAtSql`, whose last callers these were.

  Add unit cases in `want-alert-match.test.ts`:
  - a group of two rows with different flags;
  - an unhide for the hidden row only.

  Checks pass for the worker and for `@repo/api`.

## 6. Drift and docs

- [x] 6.1 In `apps/worker/src/script/trade-post-drift.ts`, delete check 6c and its `held` CTE (`:93-98`, `:106-111`), and the header's sentences on it (`:13-17`). Check 6 keeps (a) and (b). Checks pass for the worker.
- [x] 6.2 Update `packages/api/docs/trade.md`.

  Partner rules, hidden and idle posts: the hide set is row ids (`hiddenRowsSql`), and `coveredListsSql` and `inHiddenPostSql` are gone.

  Trade posts:
  - posts are built per row;
  - post readers read their row, and list readers take the union (`listTradeStateSql`), with the list's own off Trade;
  - `listPostSql`;
  - the readers that stay on `lists`.

  Update `apps/worker/AGENTS.md`: Want alerts (per-row pairs, the union in `judge`, unhide by row, the recipient through `listTradeStateSql`) and Trade post drift (check 6 without its last part). Checks pass for `@repo/api` and the worker.

## 7. Local proof

- [x] 7.1 From the root:
  - `bun run check` and `bun run build --filter=web` exit 0;
  - `bunx oxfmt --check` is clean;
  - `grep -rn "match_have\|match_sale\|takes_swaps\|matchHave\|matchSale\|takesSwaps" packages/api/src apps/worker/src` outside tests: each hit on `lists` is the list's own, read by `listTradeStateSql`'s fallback, `sideStateOf`'s off side or a "Readers that stay" site.

  Record the grep in As built.
- [x] 7.2 Set equality, read-only, on the local database. A scratch script runs, in one statement, `posts` from the old `postsCte` (`git show 8b05487c:packages/api/src/services/trade/feed/query.ts` and its `onTradeSql`) and from the new one. It compares `id`, `partner_id`, `user_id`, `type`, the flags, `bumped_at` and `updated_at` with `EXCEPT` both ways, and checks that each new `post_id` equals `postRowSql` of its `id`. Expect no difference. Keep the script for G1.
- [x] 7.3 Read-only, on the local database, run `EXPLAIN (ANALYZE, BUFFERS)` on `fetchBumpPeople`, `fetchTradeCandidates` (as localtest1, filter `all`) and `fetchPairs`, at `8b05487c` and after. Record both plans and times in As built. A worse plan is a finding for the owner.
- [x] 7.4 With the owner's one approval (Ground rules, Local data):
  1. Run the old and the new drift script read-only on the local database: 0 on checks 1 to 7.
  2. Save, read-only, localtest1's, localtest2's and localtest5's lists, rows and hides to the scratch folder.
  3. Run the dev server from this worktree on `.env.local`. Drive it with `browser-use` on the automation Chrome:
     - set `BU_CDP_URL=http://127.0.0.1:9333`; if `curl -s http://127.0.0.1:9333/json/version` fails, start it with `open -na "Google Chrome" --args --user-data-dir="$HOME/.chrome-automation" --remote-debugging-port=9333`, then `browser-use --reload`;
     - open and drive a tab of your own, by target id;
     - give each account its own isolated context (`Target.createBrowserContext` and `Target.createTarget`);
     - sign in only after the page has hydrated, or by `fetch` from the loaded page, so no credential reaches a URL, the history or the dev-server log. If one leaks, delete the log that holds it and tell the owner.

  Then, with the new drift script after each step (0, except check 2 in step (e)):
  - (a) Read the outputs task 0.1 saved, again, and compare. Every field equals the baseline except `postId`, which equals it too while each list is in one row. Browse and For you match the baseline screenshots.
  - (b) Hide one of localtest2's posts, then unhide it. The post leaves Browse and For you, and its matches stop counting, then both come back.
  - (c) As localtest2, Your posts lists each post, with its tags and bump.
  - (d) As localtest1, report one of localtest2's posts. The moderator console's report shows the post as posted, with its tags. Send a chat post card of it: the card shows the post.
  - (d2) Off-Trade Open to: as localtest1, take an Open to of an off-Trade want list in Edit list from Swaps or buying to Swaps only. For you's counts against localtest2 lose what only buying gave. Set it back.
  - (e) A shared list, by local SQL: give one of localtest2's have lists already in a pair a second row of its own, on Trade, with a different want list or none, and different Open to. Drift check 2 reads 1. Then:
    - Browse shows both posts, each with its own tags;
    - For you counts what either allows;
    - hiding one post leaves the other shown and counting.
  - (f) Want alerts, dry: run task 0.1's script before (e)'s row exists. Its alerts and unhides equal the baseline. Then run it for a new entry on the shared list from (e): one group per want list, offer list and collection, and an unhide only for a hidden row.
  - (g) As localtest5, who has no lists, open Browse and For you: no error.
  - (h) No console error on the pages visited, client or server.

  Then put back what the pass changed:
  - delete the second row from (e) and any list created;
  - restore the saved rows, lists and hides, and compare them with the saved files;
  - drift checks 1 to 7 at 0;
  - stop the dev server and close the browser contexts.

  Record each step's result in As built.

## 8. Rollout

- [x] 8.1 **G1**, read-only, with a go-ahead, after the push and before the deploy:
  - the old drift script: checks 1 to 7 at 0;
  - task 7.2's set-equality script on production: no difference.

  A non-zero check or any difference stops the rollout for the owner. Record both in As built.
- [x] 8.2 The owner brings up web and rebuilds and brings up the worker from the same commit. Record the times.
- [x] 8.3 **G2**, read-only, with a go-ahead: the new drift script, checks 1 to 7 at 0. The owner opens `/trade` once. Record the rollback floor (design, Migration Plan) in As built.

## 9. Agent docs

- [x] 9.1 With `writing-for-agents` loaded, check what groups 2 to 6 wrote against the code as built:
  - `packages/api/docs/trade.md`;
  - `apps/worker/AGENTS.md`;
  - `packages/db/AGENTS.md`, Trade posts, whose "until the readers take more" now reads: the readers take rows, and only `planPost`'s refusal and drift check 2 keep one row per list until `shared-lists`.

  State that `packages/api/AGENTS.md`, `apps/web/AGENTS.md` and the root `AGENTS.md` need no change, or fix them.

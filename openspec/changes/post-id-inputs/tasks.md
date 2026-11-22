## Ground rules

- **Git.** No task commits, pushes or uses `git stash`: the stash stack is shared by every worktree and holds 34 entries. A checkpoint is a WIP commit, made only with the owner's approval. The work happens in the `shared-lists-orca` worktree. An old build runs from a throwaway `git worktree add --detach` outside the repo, removed after use.
- **Production.** The root `.env` is production, and every local run uses `.env.local`.
  - A production read runs only with the owner's go-ahead for that run. It uses `PGOPTIONS='-c default_transaction_read_only=on'` (plus `-c statement_timeout=60000` for G1), and never prints a connection string or secret.
  - The owner deploys. This change has no migration. If one turns out to be needed, stop and ask: it would be two steps, as in `trade-post-state-contract`, run through Dokploy's migrate app. The main Postgres app database is `main`.
- **Local data.** The owner approves once, at task 0.1, for 0.1 and 5.3: the test rows on `localtest1@local.invalid`, `localtest2@local.invalid` and `localtest5@local.invalid`, and one hand-made second `trade_post` row. Task 5.3 puts back what it changed.
- **"Checks pass"** means:
  - for `@repo/api`: `bun run lint --filter=@repo/api`, `bun run typecheck --filter=@repo/api` and `bun run build --filter=web`;
  - for `web`: `bun run lint --filter=web`, `bun run typecheck --filter=web`, `bun test` of the touched web tests and `bun run build --filter=web`;
  - for the worker: `bun run lint --filter=worker`, `bun run typecheck --filter=worker` and `bun test apps/worker/src/import-boundary.test.ts`.
- **Tests** cover pure modules only, never the database.
- **`.tsx`.** Load `vercel-react-best-practices` before the first `.tsx` edit. A repo hook (`require-react-skill.ts`) holds the edit until it is loaded, per session and per subagent.
- **Stop and ask** if the diff touches `services/trade/feed/query.ts`, `services/trade/matches/candidates.ts`, `services/trade/feed/counts.ts`, or the worker's `job/want-alerts/pairs.ts` or `context.ts` (design decision 11). Also stop for an offer input, a message string, or a composer change.
- **Comments** state only a non-obvious why.
- **Scratch files** live in `/private/tmp/claude-501/post-id-inputs/`. A script that needs `@repo/*` is copied into `apps/worker/.post-id-inputs/` of the build it runs on, only to run, and removed after.
- **The drift script** runs from `apps/worker`:

  ```
  PGOPTIONS='-c default_transaction_read_only=on' bun run --env-file=../../.env --env-file=../../.env.local src/script/trade-post-drift.ts
  ```

  - Drop the second `--env-file` for production.
  - "The old drift script" is `git show 0129b5c4:apps/worker/src/script/trade-post-drift.ts`, saved in the scratch folder and copied in only to run.

## 0. Baseline

- [x] 0.1 Ask the owner's one approval (Ground rules). Then, before any code change, on the local database, save the outputs the pass compares against to `baseline/` in the scratch folder.
  - localtest1's `trade.people` (no filter, Any, Mutual, `person` = localtest2), `trade.hiddenPosts` and `offer.suggest` for localtest2;
  - localtest2's `trade.myPosts` and `trade.people` (`person` = localtest2);
  - screenshots of localtest1's Browse and For you.

  Sign in as 5.3 says. Delete the sessions this made, and record in As built.

## 1. Post id inputs and hides

- [x] 1.1 Add `postRefOf` and the input schemas (design decision 1):
  - `postRefOf` in `packages/api/src/schemas/trade.ts`: `postId` wins, else the legacy field;
  - `tradePostInputSchema` (`schemas/trade.ts:77`) takes `postId` and an optional `listId`, at least one;
  - `reportInputSchema` (`schemas/moderation.ts:79`) gains an optional `postId` beside `postListId`;
  - `postCardInputSchema` (`schemas/chat.ts:145-149`) gains an optional `postId`.

  In `schemas/trade.test.ts`, `lib/report-post.test.ts` and `schemas/chat.test.ts`, add cases:
  - each tab's old input (`{ listId }`, `postListId` alone, `listSlug` alone) parses to the same data;
  - `postRefOf` for a `postId`, both fields, and a legacy value alone.

  Checks pass for `@repo/api`.
- [x] 1.2 Rewrite `hidePost` and `unhidePost` (`services/trade/hidden.ts:97-119`) as decision 3 gives them, with the legacy branch of decision 1: a value naming a `trade_post` row is that row, else today's list rule. Then:
  - update the router (`routers/trade.ts:232-246`), including the doc comment, which says "whether a list exists";
  - add `postId: tradePost.id` to `fetchHiddenPosts` (`:126-172`), keeping `listId`;
  - in `packages/api/docs/trade.md`, Partner rules, hidden and idle posts, say that `hidePost` and `unhidePost` take the row, and how a legacy list id resolves for one release.

  Verify locally, read-only: `EXPLAIN` (no `ANALYZE`) of the new `INSERT` and `DELETE` in a read-only session plans and writes nothing. Checks pass for `@repo/api`.

## 2. Feed outputs

- [x] 2.1 Make the feed's `id` the post id (decision 2):
  - `services/trade/feed/posts.ts:182-183`: `id` and `postId` both become `post.anchor.postId`;
  - `feedPostSchema` (`schemas/trade.ts:222-227`): `id` describes the post id; `postId` is non-null and deprecated, equal to `id`; the sides' description says the first side is the anchor list;
  - `services/trade/feed/mine.ts:54-55`: `id` is the post id, and `postId` goes;
  - `sideItemsInputSchema`'s `listId` description (`schemas/trade.ts:142-144`) names a side's `list.id` only.

  Verify:
  - `bun run typecheck --filter=web` is clean;
  - the `/api/v1` document at `/api/v1/reference` names the new descriptions, read from the dev server.

  Checks pass for `@repo/api`.
- [x] 2.2 Make `swapPair.theirPostId` the pairing's row (`lib/trade-person.ts:105`, `best.theirPost`), and update its doc comment (`:89-92`) and `MatchCounts`' (`schemas/trade.ts:38-43`). Its two readers take the lead from `bestPairing`:
  - `fillMatches` (`lib/offer-prefill.ts:112`);
  - the picker's pair read (`services/offer/picker/index.ts:268-272`).

  In `packages/api/docs/trade.md`, Trade matching (`:10`), say that `swapPair.theirPostId` names the row, and that the tie still reads `PostLeads`. Update the expectations in `lib/trade-person.test.ts` and `lib/offer-prefill.test.ts`, and add a case where the row id and the lead list id differ, so a swap of the two fails a test. Verify with `bun test packages/api/src/lib/trade-person.test.ts packages/api/src/lib/offer-prefill.test.ts`. Checks pass for `@repo/api`.
- [x] 2.3 Bump the cache versions (decision 7):
  - `trade:person:11` → `12` (`services/trade/matches/index.ts:33`);
  - `trade:mutual-people:11` → `12` (`matches/mutual.ts:19`);
  - `trade:oneway-people:7` → `8` (`matches/one-way.ts:15`).

  In `packages/api/docs/trade.md`, Trade posts, rewrite the paragraph that begins "A post's id is its row": a post's `id` is its row in every output, and `postId` is a deprecated alias for a release. Checks pass for `@repo/api`.

## 3. Reports and post cards

- [x] 3.1 Post cards by row (decision 5):
  - add `postsByRowOf(rowIds, listWhere)` beside `namedPostsOf` (`services/trade/feed/post-cards.ts:28`);
  - `resolvePostCard` (`services/chat/card-resolve.ts:44-66`) checks and stores `postId` when the input has one;
  - `storedPostCardSchema` (`schemas/chat.ts:107-111`) gains an optional `postId`, and `postCardViewSchema` (`:292-325`) gains `postId` as `.nullable().default(null)` (decision 5);
  - in `schemas/chat.test.ts`, a stored card and a card view without `postId`, as the old build writes and sends them, parse;
  - `fetchPostCards` and `hydratePostCards` (`services/chat/cards.ts:157-176`) read a card with `postId` by its row, and one without by its list as today.

  Update `packages/api/docs/chat.md`, Chat cards: the stored shapes (`:23`) and `resolveCard`'s rule (`:25`). Checks pass for `@repo/api`.
- [x] 3.2 Reports by row (decision 4):
  - `reportedPost` (`services/moderation/report.ts:91-120`) takes the ref, and the legacy branch of decision 1;
  - `postSnapshot` (`lib/report-post.ts:46`) and `reportPostSchema` (`schemas/moderation.ts:166-185`) gain an optional `postId`;
  - `staffPosts` (`post-cards.ts:202`) and its caller (`services/moderation/reads.ts:213-259`) read a snapshot's row when it has `postId`.

  Add a `postSnapshot` case with `postId` to `lib/report-post.test.ts`, and update `packages/api/docs/chat.md` (`:27`). Checks pass for `@repo/api`.
- [x] 3.3 Rollback parse check. From a throwaway worktree of `0129b5c4` outside the repo (`git worktree add --detach /private/tmp/claude-501/post-id-inputs/old 0129b5c4`, then `bun install`), a scratch script parses three samples:
  - a new stored card through that build's `storedCardSchema`;
  - a new snapshot through its `reportPostSchema`;
  - a new card view through its `postCardViewSchema`.

  Each parses, with `postId` stripped. The reverse is 3.1's and 3.2's unit cases. Keep the worktree for 6.1, and record the result in As built.

## 4. Web

- [x] 4.1 Load `vercel-react-best-practices`. Then, as decision 6 gives them:
  - `anchorOf` returns the first side (`apps/web/src/features/trade/person-page.ts:32-34`);
  - `orderPosts` breaks ties by the anchor list id (`person-row.ts:28`).

  In `person-page.test.ts` and `person-row.test.ts`, add the cases decision 6 lists, and update fixtures that build posts by `id` there and in `share-preview.test.ts`. Checks pass for `web`.
- [x] 4.2 Hide and unhide by post id:
  - `HidePostItem` (`post-block.tsx:49-60`, `:270`);
  - `withoutPost`, `markHidden`, `showHidden`, `useHidePost`, `useHidePostWithUndo` and `useUnhidePost` (`actions.ts:129-228`), sending `{ postId, listId }`;
  - the Hidden posts list (`hidden-partners-dialog.tsx:155-210`): key, pending and Unhide by `postId`.

  Checks pass for `web`.
- [x] 4.3 Report and card:
  - the `post` prop of `useSafetyDialogs` and `SafetyMenu` (`features/moderation/safety-dialogs.tsx:29`, `:75`, `safety-menu.tsx:31`, `:64`) becomes `{ postId, listId, attachment }`, sending `postId` and `postListId`;
  - its callers pass the post's `id` and its anchor list's id (`post-block.tsx:377`, `:394-407`, `person-row-view.tsx:215-223`);
  - the row's contact card adds `postId: lead.id` (`person-row-view.tsx:92-99`).

  Verify:
  - `grep -rn "post\.id" apps/web/src` hits only post ids: keys, focus, `swapThroughRules` and hide;
  - `grep -rn "listId: post\.id\|postListId: post" apps/web/src` is empty.

  Checks pass for `web`.

## 5. Drift and local proof

- [x] 5.1 Add drift check 8 (design decision 10) to `apps/worker/src/script/trade-post-drift.ts`: the check, its header sentence, and the check list in `apps/worker/AGENTS.md`, Trade post drift. Checks pass for the worker.
- [x] 5.2 From the root:
  - `bun run check` and `bun run build --filter=web` exit 0;
  - `bunx oxfmt --check` is clean;
  - `git diff --stat ecdbe49f` names none of the files in the ground rules' stop list.

  Record the test counts in As built.
- [x] 5.3 With the owner's one approval:
  1. With 0.1's approval, run the old and the new drift script read-only on the local database: 0 on every check.
  2. Save, read-only, the lists, rows, hides, reports, messages and sessions of the three accounts to the scratch folder.
  3. Run the dev server from this worktree on `.env.local` (0.1 does the same before the code changes). Drive it with the `browser-use` CLI on the automation Chrome (`BU_CDP_URL=http://127.0.0.1:9333`; if `curl -s http://127.0.0.1:9333/json/version` fails, start it as `~/.claude/CLAUDE.md` says):
     - open a tab of your own and drive it by target id;
     - give each account its own isolated context (`Target.createBrowserContext` and `Target.createTarget`);
     - sign in only after the page has hydrated, or by `fetch` from the loaded page, so no credential reaches a URL, the history or the dev-server log. If one leaks anyway, delete the log that holds it and tell the owner to rotate it.

  Then, with the new drift script at 0 after each step (check 2 reads 1 while (b)'s row exists):
  - (a) As localtest1, Browse and For you: each post's `id` in `trade.people` is a row id, its first side is its anchor, and every other field, the order of localtest2's posts included, equals 0.1's baseline. Browse and For you match 0.1's screenshots.
  - (b) Add a second row for one of localtest2's lists by local SQL, as `trade-post-reads-by-row` 7.4 (e) did. Browse, For you, localtest2's person page and Your posts show both posts with no "two children with the same key" error. Hide one of them as localtest1: only that row is hidden, and the other post stays. Unhide it from Hidden on Trade.
  - (c) Can swap: localtest1's row for localtest2 shows its swap count, `offer.suggest` for localtest2 equals 0.1's baseline, and Make offer from the counted post opens with that prefill.
  - (d) Report this post… on (b)'s second post: the stored snapshot's `postId` is that row. The console reads (through the services, as before) show that post.
  - (e) Message on localtest2's row, then send the card: the stored card carries `postId`, and the thread shows that post. A card sent from (b)'s second post shows that post, not the first.
  - (f) As localtest2, Edit post on the post behind (e)'s first card, swapping its have list. Pick a post none of whose lists is in (b)'s row, since the planner throws on a list in two rows of one write: the card shows the edited post (Open Question 3, if the owner said yes).
  - (g) Old-tab inputs, by `fetch` from a loaded page:
    - `trade.hidePost` with `{ listId: <a list id> }`, then with `{ listId: <a row id> }`;
    - `trade.unhidePost` the same way;
    - `moderation.report` with `postListId` only;
    - a card with `listSlug` only.

    Each acts as 0.1's build did. Check the rows read-only.
  - (h) As localtest5: Browse and Your posts load with no error.
  - (i) No server error. On the client, no error beyond the warnings the pass before logged.

  Then put back what the pass changed:
  - delete (b)'s row, and the hides, reports, messages and sessions the pass made;
  - restore the saved lists and rows;
  - both drift scripts read 0.

  Record each step in As built.

## 6. Rollout

- [ ] 6.1 **G1**, production, read-only, with a go-ahead, after the push and before the web comes up:
  - The old drift script: every check at 0.
  - The counts:
    - `SELECT (SELECT max(id) FROM lists) < (SELECT min(id) FROM trade_post)` is true;
    - the lists id sequence leaves ample room below 1,000,000, where row ids start: `SELECT last_value FROM lists_id_seq`, recorded in As built with the room left. A legacy input reads a value as a row id first, so the ranges must stay apart for the release;
    - decision 10's condition counts 0 rows;
    - no `post_id` appears twice in the real `posts`: a scratch script renders `postsCte` from the new build and runs `SELECT post_id FROM posts GROUP BY 1 HAVING count(*) > 1`;
    - the baseline: rows and lists on Trade.
  - **Timing of the reads that resolve a post id**, old build (3.3's worktree, `0129b5c4`) against new. No hot read's SQL changes (design decision 11), so G1 times only these, each against the old build's equivalent where one exists:
    - the post-card read, by list on the old build (`namedPostsOf`, through `fetchPostCards`) and by row on the new (`postsByRowOf`, the statement `fetchPostCards`, `staffPosts` and `reportedPost`'s row path share), for the newest 20 post cards in `message.card`;
    - the `SELECT` under `hidePost`'s `INSERT`: the old build by list, and the new build on both of its branches: `postId` with the anchor list (what this build's tabs send) and the legacy `listId` alone (the `CASE WHEN EXISTS` branch old tabs hit);
    - plan only: `unhidePost`'s `DELETE`, on the new build by post and on the legacy `CASE` branch, on the old by list; `resolvePostCard`'s read, on the new build with its `EXISTS`, on the old without.

    Use the three heaviest For you users by entries on Trade as viewers, each hiding the largest post of another of the three. The queries are in `G1-RUN.md`, section 1.
  - **How to run it.** `/private/tmp/claude-501/post-id-inputs/G1-RUN.md` gives the exact commands, and the scripts are in `/private/tmp/claude-501/post-id-inputs/g1/`: `explain-lib.ts`, `cards-sql.ts`, `cards-explain.ts`, `hide-explain.ts`. They were run on the local database on both builds (task 5.3's As built). If `/private/tmp` was cleared, rewrite them:
    - `explain-lib.ts` refuses unless the session is read-only, runs `EXPLAIN (ANALYZE, BUFFERS)` under `SET LOCAL statement_timeout = 60s` (a plain `EXPLAIN` for the plan-only statements, and as the fallback past the timeout), and prints planning and execution time, CTE scans with estimated against actual rows and loops, and rescanned nodes with no index;
    - no script's import chain reaches `services/redis` or `env.ts`: `post-cards.ts`, `hidden.ts` and `card-resolve.ts` do, so the scripts rebuild their statements (`cards-sql.ts`; the old build's `hidePost`), checked byte for byte against the real reads locally.

    Run each read once to warm up, then three times on each build.
  - **Stop for the owner** if:
    - a drift check is non-zero;
    - a count fails, or the lists sequence is within 100,000 of 1,000,000;
    - a new read's warm median is over 1.5 times the old build's;
    - a rescanned CTE is estimated at 1 row.

  Record everything in As built, then remove the old worktree (`git worktree remove --force`).
- [ ] 6.2 The owner brings up web from the pushed commit. No migrate, and no worker rebuild. Record the time.
- [ ] 6.3 **G2**, read-only, with a go-ahead:
  - the new drift script: every check at 0, check 8 included;
  - the owner opens Browse, For you and Your posts;
  - Sentry shows no new issue for an hour.

  Record the rollback floor in As built: web `0129b5c4` with no data step, and nothing below `8b05487c`.

## 7. Agent docs

- [ ] 7.1 With `writing-for-agents` loaded, check what groups 1 to 5 wrote against the code as built:
  - `packages/api/docs/trade.md` and `packages/api/docs/chat.md`;
  - `apps/worker/AGENTS.md`, Trade post drift;
  - `packages/db/AGENTS.md`, Trade posts: add that a legacy post input reads a value as a row id first, which relies on row ids staying above list ids until the next chain change removes it;
  - `apps/web/docs/trade.md`, Person and post pages: a post's `id` is its row, and its anchor is the first side.

  State that `packages/api/AGENTS.md`, `apps/web/AGENTS.md` and the root `AGENTS.md` need no change, or fix them. List for `offer-reads-post-id` the removals decision 1 defers.

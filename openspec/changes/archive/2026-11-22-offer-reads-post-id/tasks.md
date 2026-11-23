## Ground rules

**Git.**
- No task commits, pushes or uses `git stash`: the stash stack is shared by every worktree and holds 34 entries.
- A checkpoint is a WIP commit, made only with the owner's approval.
- The work happens in the `shared-lists-orca` worktree.
- An old build runs from a throwaway `git worktree add --detach` outside the repo, removed after use.

**Production.** The root `.env` is production; every local run uses `.env.local`.
- A production read runs only with the owner's go-ahead for that run. It uses `PGOPTIONS='-c default_transaction_read_only=on'`, plus `-c statement_timeout=60000` for G1. It never prints a connection string or secret.
- A production write (task 7.4 only) runs only with the owner's explicit approval of that exact statement.
- The owner deploys. This change has no migration. If one turns out to be needed, stop and ask: it would run through Dokploy's migrate app, against the main Postgres app database `main`.

**Local data.** The owner approves once, at task 0.1, for 0.1 and 6.3:
- test rows on `localtest1@local.invalid`, `localtest2@local.invalid` and `localtest5@local.invalid`;
- one hand-made second `trade_post` row.

Task 6.3 puts back what it changed.

**"Checks pass" means:**
- for `@repo/api`: `bun run lint --filter=@repo/api`, `bun run typecheck --filter=@repo/api` and `bun run build --filter=web`;
- for `web`: `bun run lint --filter=web`, `bun run typecheck --filter=web`, `bun test` of the touched web tests, and `bun run build --filter=web`;
- for the worker: `bun run lint --filter=worker`, `bun run typecheck --filter=worker` and `bun test apps/worker/src/import-boundary.test.ts`.

**Tests** cover pure modules only, never the database.

**`.tsx`.** Load `vercel-react-best-practices` before the first `.tsx` edit. A repo hook (`require-react-skill.ts`) holds the edit until it is loaded, per session and per subagent.

**Stop and ask** if:
- the diff touches `services/trade/feed/query.ts`, `services/trade/matches/candidates.ts`, `services/trade/feed/counts.ts`, or the worker's `job/want-alerts/pairs.ts` or `context.ts` (design decision 10);
- the diff touches `services/list/shared.ts` (decision 2);
- a message string changes (decision 9).

**Comments** state only a non-obvious why.

**Scratch files** live in `/private/tmp/claude-501/offer-reads-post-id/`. A script that needs `@repo/*` is copied into `apps/worker/.offer-reads-post-id/` of the build it runs on, only to run, and removed after.

**The drift script** runs from `apps/worker`:

```
PGOPTIONS='-c default_transaction_read_only=on' bun run --env-file=../../.env --env-file=../../.env.local src/script/trade-post-drift.ts
```

- Drop the second `--env-file` for production.
- "The old drift script" is `git show 0b0a4430:apps/worker/src/script/trade-post-drift.ts`. Save it in the scratch folder and copy it in only to run.

## 0. Baseline

- [x] 0.1 Ask the owner's one approval (Ground rules). Then, before any code change, run the dev server from this worktree on `.env.local` and save these, read as 6.3 signs in, to `baseline/` in the scratch folder:
  - localtest1's `offer.candidates` whole theirs list for localtest2 (`side: "theirs"`, no offset);
  - `offer.suggest` for localtest2 as `{ partnerId }`, with `mutual`, and with `post`/`lead` on localtest2's first post;
  - the thread read of their conversation, if it holds offers;
  - `offer.views` of its offers.

  Delete the sessions this made, and record it in As built.

## 1. Offer inputs and rules by post id

- [x] 1.1 Schemas (design decision 3):
  - `createOfferInputSchema` (`schemas/offer.ts:171-195`) gains an optional `postId`;
  - `suggestInputSchema` (`:210-219`) gains an optional `postId`;
  - `CandidatesPage` (`picker/shared.ts:60-64`) gains `posts?: { postId, lead, want, buy }[]`, beside `lists` and `wantLists`, which stay as they are;
  - `Suggestion` (`picker/index.ts:320-330`) gains `postId: number | null`.

  In the schema tests, check that each old-tab input (`post` alone, `wantList` alone, `{ partnerId, post, lead }`) parses to the same data. Checks pass for `@repo/api`.
- [x] 1.2 `createOffer` (decision 3):
  - add `resolvePostRow` to `services/offer/core.ts`, run in the first `Promise.all` (`index.ts:130-144`), with the slug resolvers kept for input without `postId`;
  - add the pure `namedRowOf` beside `givesRuleOf`, with unit cases;
  - resolve `post_id` in the INSERT (`index.ts:362-365`) as decision 3 gives it.

  Verify locally, read-only: `EXPLAIN` (no `ANALYZE`) of the INSERT's subquery in a read-only session plans and writes nothing. Checks pass for `@repo/api`.
- [x] 1.3 Only offers with what I want by row (decision 4):
  - `GivesCheck` and `givesRuleOf` (`lib/offer-recipient-rules.ts:240-262`) carry `row`;
  - `postWantedAmong` (`picker/shared.ts:173-183`) reads it.

  Add the unit cases decision 4 lists. Verify with `bun test packages/api/src/lib/offer-recipient-rules.test.ts`. Checks pass for `@repo/api`.
- [x] 1.4 `partnerListChoices` (`picker/theirs.ts:207-248`) adds `posts[]` from the rows, as decision 3 gives it, with no extra round trip. Compare against 0.1's baseline on the local database: `lists` and `wantLists` are unchanged, and `posts` names each choice of today in today's order. Checks pass for `@repo/api`.
- [x] 1.5 `suggestOffer`:
  - `postListsOf` by row (`picker/index.ts:380-405`);
  - `postId` wins over `post`;
  - fill the output's `postId` as decision 3 lists.

  Compare against 0.1's baseline: equal, with `postId` added. Update `packages/api/docs/offers.md`, Offer get sources and Suggested offers: `post_id` is what the line reads, `postId` is the input, and which slug fields are legacy and which stay lists. Checks pass for `@repo/api`.

## 2. "Offer on" reads the post

- [x] 2.1 `fetchOffers` (`services/offer/view.ts:86`, `:114`) joins the row as decision 1 gives it.
  - Update `schema.ts:490-501`'s two comments. Change no column definition, and run no `db:generate`.
  - In `docs/offers.md`, rewrite the sentence "`post_list_id` is the offer's history and every reader stays on it; `post_id` … nothing reads it yet", and the five cases: what each now shows.

  Checks pass for `@repo/api`.

## 3. Web: the builder by post id

- [x] 3.1 Load `vercel-react-best-practices`. Then update the pure modules as decision 9 gives them:
  - `features/offers/builder/post-choice.ts`: the choices from `posts[]` (and without it, from `lists[]` and `buyPostsOf`), `postKeyOf`, `openPostOf`, `chosenPostOf`, `postProblem` and `offerOnOf`;
  - `features/offers/offer-link.ts`: `OfferStart`, the search, `offerLink`, `requestOf` and `listSlugsOf`, carrying `postId` beside the slug for this release;
  - `builder/types.ts`.

  Add the cases decision 9 lists to `post-choice.test.ts` and `offer-link.test.ts`. Checks pass for `web`.
- [x] 3.2 Update `builder/form.tsx` (`:117-142`, `:179-205`, `:386-399`, `:530-537`) and `offer-builder.tsx:133-136` to key choices with `postKeyOf` and to send `offerOn.input`. Checks pass for `web`.
- [x] 3.3 Update the callers:
  - `person-row-view.tsx:120-126`;
  - `post-block.tsx:176-181`, `:193-202`;
  - `thread-view.ts:43-50`.

  Verify that every `matches` with `post:` also carries `postId` (`grep -rn "post: anchor.list.slug\|post: card.post.list.slug" apps/web/src`). Leave `lists[]`'s other readers (`offer-picker-grids.tsx`, `serial-dialog.tsx`, `picker-selection.ts`) as they are. Update `apps/web/docs/offers.md`, Offer builder: Offer on is keyed by post, `openPostOf` takes post ids first, and the search carries `postId`. Checks pass for `web`.

## 4. Drift

- [x] 4.1 In `apps/worker/src/script/trade-post-drift.ts`, remove note 1 and update the header (`:24-26`), as decision 7 gives it. Update `apps/worker/AGENTS.md`, Trade post drift, to match. Checks pass for the worker.

## 5. Remove `post-id-inputs`' fallbacks

- [x] 5.1 API: every row of design.md's fallback inventory under `packages/api/src`. The stored card and the report snapshot keep reading both shapes, for good. Then:
  - update the tests: delete the `postRefOf` and `resolvePostRef` cases; check that `{ postId, listId }`, `{ postId, postListId }` and `{ kind: "post", listSlug, postId }` parse to `postId` alone; check that `{ listId }` alone fails `tradePostInputSchema`;
  - remove the feed's `postId` from `feedPostSchema` and `posts.ts:183`;
  - read `/api/v1/spec.json` from the dev server: `posts[].postId` is gone.

  Checks pass for `@repo/api`.
- [x] 5.2 Web: the rows of the fallback inventory under `apps/web/src`. Verify that `grep -rn "postListId\|listId: anchor.list.id\|listId: post\.listId" apps/web/src` is empty. Checks pass for `web`.
- [x] 5.3 Docs: the fallback inventory's last row. Remove the reliance on row ids above list ids from `packages/db/AGENTS.md` (Trade posts). Checks pass for `@repo/api`.

## 6. Local proof

- [x] 6.1 From the root:
  - `bun run check` and `bun run build --filter=web` exit 0;
  - `bunx oxfmt --check` is clean;
  - `git diff --stat cd0aec18` names no file in the stop list.

  Record the test counts in As built.
- [x] 6.2 Prepare G1 in `/private/tmp/claude-501/offer-reads-post-id/g1/`, with commands in `G1-RUN.md` beside it:
  - Copy `explain-lib.ts` from `/private/tmp/claude-501/post-id-inputs/g1/`. If it is gone, rewrite it as that change's task 6.1 describes: read-only refusal, 60 s `SET LOCAL statement_timeout`, a plain-`EXPLAIN` fallback, planning and execution time, CTE scans with estimated against actual rows and loops, and rescanned nodes with no index.
  - Write one script per read in decision 10's table. Each rebuilds the statement from the build it runs on, since `view.ts`, `theirs.ts` and `picker/index.ts` reach `services/redis` or `env.ts` through their imports. Check them locally against the real reads, text and values.
  - Make the old build a fresh worktree: `git worktree add --detach /private/tmp/claude-501/offer-reads-post-id/old 0b0a4430`, then `bun install`.

  Run every script on the local database on both builds.
- [x] 6.3 With 0.1's approval:
  1. Run the old and the new drift script read-only on the local database. Note 2 may count local offers; record both counts.
  2. Save, read-only, the lists, rows, offers, offer items, messages, conversations, hides, reports and sessions of the three accounts to the scratch folder.
  3. Drive the dev server with the `browser-use` CLI on the automation Chrome (`BU_CDP_URL=http://127.0.0.1:9333`; if `curl -s http://127.0.0.1:9333/json/version` fails, start it as `~/.claude/CLAUDE.md` says):
     - open a tab of your own and drive it by target id;
     - give each account its own isolated context (`Target.createBrowserContext` and `Target.createTarget`);
     - sign in only after the page has hydrated, or by `fetch` from the loaded page, so no credential reaches a URL, the history or the dev-server log; if one leaks anyway, delete the log that holds it and tell the owner to rotate it;
     - keep shell commands plain.

  Then, with the new drift script read after each step:
  - (a) As localtest1, Make offer on one of localtest2's posts and send it. The offer's `post_id` is that post's row, `post_list_id` its lead, and both cards read "Offer on {lead}".
  - (b) Add a second row for one of localtest2's have lists by local SQL, as `post-id-inputs` 5.3 (b) did. Offer on lists both posts, under the same name (`shared-lists` labels them), and the serial dialog still names the list once. Choose the second and send an offer giving one objekt on its want list. `post_id` is the second row, and with Only offers with what I want on for localtest2, a give only on the first row's want list is refused.
  - (c) As localtest2, Edit post on (a)'s post, swapping its have list. Both cards read the new lead (Open Question 1, if the owner said yes).
  - (d) Accept one offer as localtest2. The accepted card reads as before. The trade page and My trades read `fetchOffers` but draw no "Offer on" line, on either build (corrected after the 6.3 pass).
  - (e) Message a post card, then Make offer from the thread: the builder opens on that post.
  - (f) Old-tab inputs by `fetch` from a loaded page:
    - `offer.create` with `post` alone and with `wantList` alone;
    - `offer.suggest` with `post` alone;
    - `trade.hidePost` with `{ postId, listId }`, then `{ listId }` alone, which is refused.
  - (g) As localtest5 (staff), the console's report view and an attached trade load with no error.
  - (h) No server error. On the client, no error beyond the warnings 0.1 saw.

  Then put back what the pass changed, from the saved rows. The drift scripts read as in step 1. Record each step in As built.

## 7. Rollout

- [x] 7.1 **G1**, production, read-only, with a go-ahead, after the push and before the web comes up:
  - **The gate:** `0b0a4430` has been live 24 hours or more (from about 09:38 UTC on 2026-11-22).
  - **Drift:** the old drift script reads 0 on checks 1 to 8. Record both notes.
  - **The note-1 table:** each offer's id, status, its `post_list_id` list's name, and its row's lead name now (Open Question 1).
  - **Open Question 2's count:** `post_id IS NULL AND post_list_id IS NOT NULL`, split by open and closed.
  - **The timing in `G1-RUN.md`:** one warm-up, then three runs per build.

  **Stop for the owner** if:
  - the gate is not met;
  - a drift check is non-zero;
  - a new read's warm median is over 1.5 times the old build's;
  - a rescanned node is a CTE estimated at 1 row.

  Record everything in As built. Then remove the old worktree (`git worktree remove --force`).
- [x] 7.2 The owner brings up web from the pushed commit. No migrate, and no worker rebuild. Record the time.
- [x] 7.3 **G2**, read-only, with a go-ahead:
  - the new drift script reads 0 on every check, note 1 is gone, and note 2 is unchanged;
  - the owner opens a thread with offers, the offer page from a post, and Hidden on Trade;
  - Sentry shows no new issue for an hour.

  Record the rollback floor in As built: web `0b0a4430`, no data step; database floor `8b05487c`.
- [x] 7.4 **Backfill**, only if the owner chose it (Open Question 3):
  1. With a go-ahead, read-only: decision 5's classification of note 2's offers.
  2. Show the owner the exact statement with the ids filled in. Run it only with their approval for that statement, in one `psql` session without `default_transaction_read_only`. Record the returned rows.
  3. Read-only: note 2 reads 0, and each of those offers' `post_id` is the row its list leads.

## 8. Agent docs

- [x] 8.1 With `writing-for-agents` loaded, check what groups 1 to 5 wrote against the code as built:
  - `packages/api/docs/offers.md`, `trade.md` and `chat.md`;
  - `apps/web/docs/offers.md` and `trade.md`;
  - `apps/worker/AGENTS.md`, Trade post drift;
  - `packages/db/AGENTS.md`, Trade posts: `offer.post_id` names the post the line reads, `post_list_id` is its fallback, the NULL window is closed (or not, per 7.4), and nothing relies on row ids staying above list ids.

  State that `packages/api/AGENTS.md`, `apps/web/AGENTS.md` and the root `AGENTS.md` need no change, or fix them. List for the next change the slug fallbacks decision 3 leaves for one release.

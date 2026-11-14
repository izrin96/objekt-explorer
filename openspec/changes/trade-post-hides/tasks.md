These rules hold for every task:

- No task commits, pushes or uses `git stash`. A checkpoint is a WIP commit, made only with the owner's approval.
- No migration and no schema change. `packages/db/src/schema.ts` changes only in a doc comment.
- The root `.env` is production, and every local run uses `.env.local`.
  - A production read runs only with the owner's go-ahead for that run. It uses `PGOPTIONS='-c default_transaction_read_only=on'` and never prints a connection string or secret.
  - Each local test row (a hide, a post edit) needs the owner's approval for that row.
- "Build" means:
  - for `@repo/api` and `@repo/db`: `bun run build --filter=web`, which bundles them;
  - for the worker: `bun run typecheck --filter=worker` and `bun test apps/worker/src/import-boundary.test.ts`.
- No `.tsx` change is expected. If one is needed, load `vercel-react-best-practices` before the edit. Any new user-facing string needs `en`, `ko` and `ja`, and none is expected.
- Comments state only a non-obvious why.
- The drift script runs from `apps/worker`:

  ```
  PGOPTIONS='-c default_transaction_read_only=on' bun run --env-file=../../.env --env-file=../../.env.local src/script/trade-post-drift.ts
  ```

- A **local execution** runs a statement or service function once against the local database, read-only, from a scratch script inside `apps/worker`, which is deleted afterwards:

  ```
  PGOPTIONS='-c default_transaction_read_only=on' REDIS_URL=redis://127.0.0.1:1 bun run --env-file=../../.env --env-file=../../.env.local <script>
  ```

  - The unreachable `REDIS_URL` keeps cache writes away from the production Valkey.
  - A write statement fails there with "read-only transaction" only after Postgres has parsed and planned it, so the failure proves its SQL.

## 1. The rule

- [x] 1.1 Before any edit, take the baseline that 1.2 and 2.3 compare against: a local execution that writes, as JSON in the scratchpad, the output of `fetchBumpPeople` and `fetchPersonRows` (with `skipHiddenPosts` true and false), `fetchTradeCandidates` (both values of `skipHiddenPosts`) and `fetchHiddenPosts` for `localtest1`'s and `localtest2`'s user ids. Run it twice. Verify that the two files are byte-identical; if they are not, name the field that varies and leave it out. Nothing is built.
- [x] 1.2 In `packages/api/src/services/trade/lists.ts` (design decision 1):
  - add `coveredListsSql(viewer)`;
  - make `inHiddenPostSql(viewer, alias)` read it, and `hidesOfSql(viewer, alias)` the lookup form, `hp.list_id IN (${column(alias, "id")}, ${postPartnerSql(alias)})`;
  - keep `hiddenPostAtSql`; rewrite the doc comments (a hide names a list and covers the post that list is in now, through its row, on Trade or off; the two forms change together);
  - drop "hidden posts" from `postPairsSql`'s comment.

  In `packages/api/src/services/trade/feed/query.ts`: delete the local `hiddenPost`, and use `inHiddenPostSql(query.viewerId, "posts")` in `feedWhere` (`NOT …` when `skipHiddenPosts`) and as the `hidden` column of `fetchPersonRows`.

  Verify:
  - the 1.1 execution, run again, writes a file byte-identical to the baseline (no local hides: same people and posts, `hidden` false);
  - Browse, For you and a person page load on the local dev server;
  - lint, typecheck and build pass for `@repo/api`, and the worker build passes (`pairs.ts`, `record.ts`).
- [x] 1.3 In `packages/db/src/schema.ts`, rewrite the `hiddenTradePost` doc comment (design decision 8). Verify:
  - `bun run --filter=@repo/db db:generate` finds no diff and writes no file; if it writes one, delete it and report what it held;
  - lint and typecheck pass for `@repo/db`.
- [x] 1.4 In `apps/worker/src/script/trade-post-drift.ts` (design decision 6):
  - remove check 11 and `legacyHidesOf`;
  - in `EXPLAIN=1`, replace the hide plans with `previousHidesOf` (the `56b04e99` `hidesOfSql` text verbatim, aliases `previous_hp`, `previous_row`, `previous_lead`) against the imported `inHiddenPostSql`, over the lists on Trade;
  - add the listed posts grouped by owner with their newest bump, with the anchor-only filter against `inHiddenPostSql(…, "posts")`, for the heaviest hider and for a viewer id that matches no user;
  - update the header comment: the hide check is gone, and the hide fragments leave with the legacy SQL in `trade-post-contract`.

  Verify:
  - a local run prints eleven counts, all zero;
  - a local `EXPLAIN=1` run prints the posts and pair plans, the zero-hide feed plan and the skip line for the heaviest hider;
  - the script still refuses a connection that is not read-only;
  - the worker build passes.

- [x] 1.5 Staged hides (design decision 7): a scratch script in `apps/worker/.scratch-hides/`, run as a local execution, that stages `WITH hidden_trade_post (user_id, list_id, created_at) AS (VALUES …)` for one made-up viewer, a hide on every third have, sale and want list, ahead of statements built from the imported helpers. It prints a count, which must be zero, for each of:
  - a list where `inHiddenPostSql` and `EXISTS (SELECT 1 ${hidesOfSql(…)})` differ;
  - a list that is covered though neither it nor the other list of its row is staged, and a list that is not covered though one of them is;
  - a post in `WITH staged, ${postsCte}` whose hidden state differs from "a staged hide names its anchor or its anchor's row partner";
  - and it prints how many staged hides sit on a pair's want list, on a pair's lead, on a lone list and on a want list whose lead is off Trade, so that each case is seen to be covered (each above zero, or the script stages one more hide to reach it).

  Before trusting it, show that the staging works: the same statement without the `WITH` returns no hidden list. Verify that every difference count is zero. The script stays until 2.2 adds its delete checks, then goes in 3.1.

## 2. Hide, Unhide and the Hidden list

- [x] 2.1 `hidePost` in `packages/api/src/services/trade/hidden.ts`: add `AND NOT ${inHiddenPostSql(viewerId, "posts")}` to the insert's `WHERE` (design decision 2), and update its doc comment. Verify:
  - a local execution of the statement for `localtest1` and `localtest2`'s anchor 13142 fails only with the read-only error, which proves the SQL;
  - lint, typecheck and build pass for `@repo/api`.
- [x] 2.2 `unhidePost` in the same file: replace the drizzle delete with design decision 3's `DELETE … USING (VALUES (${listId}::int)) AS named(id) … IN (SELECT hp.list_id ${hidesOfSql(viewerId, "named")})`, and keep `bumpTradeVersions`. Leave `tradePostInputSchema` and the router unchanged. Verify:
  - a local execution of the statement fails only with the read-only error;
  - in the staged script of 1.5, the delete's `USING … WHERE` run as `SELECT gone.list_id` returns, for a named list whose row partner is staged, the partner's hide, and the same for the `unhidePosts` statement of `apps/worker/src/job/want-alerts/record.ts`;
  - `git diff packages/api/src/routers packages/api/src/schemas` is empty, so an open tab's `{ listId }` validates as before;
  - lint, typecheck and build pass for `@repo/api`.
- [x] 2.3 `fetchHiddenPosts` in the same file: resolve each hide to its row's lead and want, with `slug`, `names` and `profile` as design decision 4 gives them, and dedupe by lead id, keeping the newest hide. The output keys and types stay as they are. Verify:
  - the 1.1 execution, run again, is byte-identical to the baseline (`[]` for both accounts);
  - an entry's names, profile, slug and dedupe are checked against real rows in 4.3 (a) and (c);
  - `/account/hidden` loads locally with its empty state;
  - lint, typecheck and build pass for `@repo/api`.
- [x] 2.4 Update `packages/api/docs/trade.md` (design decision 8):
  - the hide paragraph under Partner rules, hidden and idle posts: a hide names a list, covers the post that list is in now through its row, and ends three ways, with Unhide clearing every hide on the post;
  - Trade posts: drop `inHiddenPostSql` from the callers of `postPairsSql`.

  Verify:
  - `grep -n "keyed by the post's lead list" packages/api/docs/trade.md packages/db/src/schema.ts` finds nothing;
  - `grep -rn "hidden_trade_post\|hidesOfSql\|inHiddenPostSql\|hiddenPostAtSql" packages/api/src apps/worker/src` lists only the reads in design.md's Context table;
  - lint passes for `@repo/api`.

## 3. Checks

- [x] 3.1 Run `bun run check` and `bun run build --filter=web` from the repo root. Delete `apps/worker/.scratch-hides/`. Verify that both pass, and that `git status --short -- apps packages` lists only files under `packages/api`, `packages/db/src/schema.ts`, `apps/worker/src/script/trade-post-drift.ts` and `apps/worker/AGENTS.md`.

## 4. Local proof

- [x] 4.1 Read-only, record the starting state locally:
  - `localtest2`'s lists 13142 and 13168: `discoverable`, `linked_list_id`, `match_have`, `match_sale`, `takes_swaps`, `bumped_at`, `updated_at`, and their `trade_post` rows. Posting writes a want list's Open to, so the flags are part of what cleanup restores;
  - whether both posts are listed (not idle) and shown on Browse to `localtest1`;
  - `localtest1`'s For you counts for `localtest2`.

  Keep this in the scratchpad. Verify that it is written down. Nothing is built.
- [x] 4.2 Stop and ask the owner to approve the local rows of 4.3 by name:
  - `localtest1`'s hides of `localtest2`'s posts (at most two at a time), each removed by Unhide in the pass;
  - `localtest2`'s `trade.savePost` and `trade.takeDownPost` writes through the composer:
    - pair 13142 with 13168 in one Swap post;
    - unpair them;
    - pair them again;
    - Take off Trade the pair (both halves go off, the row stays);
    - post 13142 alone as a Swap post, which keeps the pair with 13168 off Trade (`planPost`'s one-half Swap post);
    - restore: unpair, and post 13142 and 13168 back as they were in 4.1;
  - a bump if 4.1 found a post idle.

  Verify that the approval is recorded before any local row is written. If it is refused, record Hide post and Unhide as read-only verified up to the request boundary, and skip 4.3.
- [x] 4.3 With that approval, run a browser pass on the local dev server through the `browser-use` CLI, under `~/.claude/CLAUDE.md`'s rules:
  - own tab by target id;
  - an isolated context per account;
  - wait for hydration before submitting a sign-in form.

  Sign in as `localtest1@local.invalid` and `localtest2@local.invalid`, with `LOCAL_TEST1_PASSWORD` and `LOCAL_TEST2_PASSWORD` read from `.env.local` and never printed. Never sign up. Then:
  - (a) As `localtest1`, hide the Buy post 13142. As `localtest2`, pair it with 13168. As `localtest1`, the paired post is absent from Browse, For you's counts for `localtest2` drop it, its person-page ⋯ menu offers Unhide post, and `/account/hidden` names it with both lists, have list first.
  - (b) As `localtest2`, unpair. 13168's post shows on Browse and 13142's stays hidden.
  - (c) As `localtest1`, hide 13168's post too, then as `localtest2` pair the two again. `/account/hidden` lists the pair once. Its Unhide brings the post back on Browse, and leaves no `localtest1` hide.
  - (d) As `localtest1`, hide the pair. As `localtest2`, Take off Trade the pair, then post 13142 alone as a Swap post. As `localtest1`, 13142's post is hidden on Browse. Its person-page ⋯ menu offers Unhide post, and `/account/hidden` links to it.
  - (e) Unhide from that ⋯ menu, which sends 13142 while the hide names 13168. The post is back on Browse.
  - (f) Read-only local executions while hides exist, at the step named:
    - `fetchPairs` with `e.list_id IN (13142, 13168)`: `hidden` is set exactly while the post is hidden, at (a), (b) and (d);
    - `fetchTradeCandidates` for `localtest1` with `ownerIds: [localtest2]`: no list of the hidden post appears with `skipHiddenPosts` true, and they appear with it false, at (a) and (d);
    - `record.ts`' `unhidePosts` statement as a `SELECT gone.list_id` with the same `FROM … USING … WHERE`, for (`localtest1`, an entry list of 13142): it returns the hide on 13168, the half the entry is not on, at (d).

  Cleanup: unhide everything, unpair, and post 13142 and 13168 back as they were. Confirm read-only that `hidden_trade_post` has no `localtest1` row, and that 13142, 13168 and their rows match 4.1 apart from `updated_at` and `bumped_at`; tell the owner about those two. Verify that every step's expectation held with no console error, and that the cleanup check is recorded.

## 5. Production proof

- [x] 5.1 Stop and ask the owner for a go-ahead to read production, read-only. With it, run the comparison script of design decision 7:
  - it lives in `apps/worker/.scratch-hides/` (recreated for this run) and imports `postsCte`, `inHiddenPostSql` and `hidesOfSql`;
  - it runs without `.env.local`, with `PGOPTIONS='-c default_transaction_read_only=on'`.

  Record in design.md:
  - hidden before and after, newly hidden and no longer hidden, for posts and for lists on Trade;
  - the hide count, and any person with two hides on one post.

  Then delete the scratch directory. Verify that the go-ahead is recorded before the run, and that newly and no longer hidden are 0 for both. Any other number stops the rollout and goes to the owner.
- [x] 5.2 With a go-ahead, run the drift script and its `EXPLAIN=1` mode read-only against production, without `.env.local`, from this working tree. Record in design.md:
  - the eleven counts;
  - the before and after hide plans and times, against the 0.9 s figure;
  - the feed count for the zero-hide viewer and for the heaviest hider.

  Verify:
  - every count is zero;
  - the per-list rule is a hash anti join, with no subplan per (list, hide), far under the 0.9 s figure;
  - the feed form takes no more than 1.5 times the anchor-only one, for both viewers, over three runs each. If it does, stop and report the plans to the owner.
- [ ] 5.3 The owner approves and runs the commit, push and deploy of web and of the worker, rebuilt on the VPS (design, Migration Plan). With a further go-ahead afterwards, run the drift script read-only against production and report it. Verify that every count is zero.

## 6. Agent docs

- [x] 6.1 Use `writing-for-agents` to edit `apps/worker/AGENTS.md`, Trade post drift: five equivalence checks remain (no hide rule), and `EXPLAIN=1` also prints the hide rule and the feed filter before and after `trade-post-hides`, until `trade-post-contract`. Expected unchanged, with a reason:
  - `packages/api/AGENTS.md` (task 2.4 covers its domain doc);
  - `packages/db/AGENTS.md` (its Trade posts section names no hide check);
  - `apps/web/AGENTS.md` (no web change);
  - the root `AGENTS.md`.

  Verify that lint passes for the worker, and that the section names no check that the script no longer runs.

## Workflow follow-up

- Archive this change once the post-deploy drift run reads zero. Carry its "Inputs for later phases" into the post-addresses and `trade-post-contract` proposals.

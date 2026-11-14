These rules hold for every task:

- No task commits, pushes or uses `git stash`. If you need a checkpoint, make a WIP commit only with the owner's approval.
- There is no migration and no schema change. `packages/db/src/schema.ts` changes only in a doc comment.
- The root `.env` is production. Every local run uses `.env.local`.
  - A production read runs only with the owner's go-ahead for that run, with `PGOPTIONS='-c default_transaction_read_only=on'`, and never prints a connection string.
  - Writing a local test row (a hide, a list, an account) also needs the owner's approval for that row.
- "Build" means:
  - for `@repo/api` and `@repo/db`, `bun run build --filter=web`, which bundles them;
  - for the worker, `bun run typecheck --filter=worker` and `bun test apps/worker/src/import-boundary.test.ts`.
- No `.tsx` change is expected. If one turns out to be needed, load the `vercel-react-best-practices` skill before editing it.
- The drift script runs from `apps/worker` as `PGOPTIONS='-c default_transaction_read_only=on' bun run --env-file=../../.env --env-file=../../.env.local src/script/trade-post-drift.ts`.
- Comments state only a non-obvious why.
- A **local execution** runs a moved statement for real, once, against the local database, and writes nothing anywhere. It is a script in the scratchpad, never the repo, run from `apps/worker` as follows:

  ```
  PGOPTIONS='-c default_transaction_read_only=on' REDIS_URL=redis://127.0.0.1:1 bun run --env-file=../../.env --env-file=../../.env.local <script>
  ```

  - The unreachable `REDIS_URL` keeps every cache write away from the production Valkey; Redis reads fail open.
  - `.env.local` points `INDEXER_DATABASE_URL` at the production indexer, read-only. The local dev server and these scripts read it (`fetchHoldings`, list entries). That is the standing local setup, not a production read that needs a go-ahead.
  - Postgres resolves names at parse time, so a run that returns no row still proves the SQL.
  - Before running a function, read it and confirm that it only reads.

## 1. Helpers

- [x] 1.1 In `packages/api/src/services/trade/lists.ts`, add `postPairsSql(post, lead, want)` and `postPartnerSql(alias)`, exactly as design decision 1 gives them. Use `column` and `offersSwapsSql`, and the inner alias `partner_row`. Leave `leadsPairSql` in place for now, so every caller still builds. Verify lint, typecheck and build pass for `@repo/api`.

- [x] 1.2 Before any read moves, record a baseline on the local dev server with the local test accounts, through `browser-use` (the rules in 6.3 apply):
  - screenshots of Browse, For you, a person page, a post page, `/account/hidden`, a list page for each half of a pair, and the offer builder's List choice for a partner with a Swap pair;
  - the `/api/v1` `list.findPublic` JSON for one paired list;
  - the `user.currentUser` JSON of a local test account that owns a pair.

  Keep them in the scratchpad, not the repo. Verify that the files exist. Nothing is built.

## 2. Equivalence checks in the drift script

- [x] 2.1 In `apps/worker/src/script/trade-post-drift.ts`, add checks 7 to 11 of design decision 6:
  - check 7, partner by row against link;
  - checks 8 and 9, legacy `posts` against new, both ways, over all 11 columns;
  - check 10, the pair predicate;
  - check 11, the hide predicate, over the candidate lists of each hide (design decision 6), not every list.

  Import `postsCte` from `@repo/api/services/trade/feed/query`, and `postPairsSql`, `postPartnerSql` and `hidesOfSql` from `@repo/api/services/trade/lists`. Copy the legacy SQL verbatim from `services/trade/feed/query.ts:16-45` and `services/trade/lists.ts:39-50` as they stand at `54d9209a`, under the names `legacy_on_trade`, `legacy_posts`, `legacy_hp` and `legacy_lead`. Rewrite the header comment to say that reads now follow the rows, so drift changes what people see, and that checks 7 onwards compare the legacy reads with the new ones and are removed in `trade-post-contract`. Verify:
  - run locally, every count is zero;
  - checks 7 and 10 already compare the link with the new helpers over `trade_post`; checks 8, 9 and 11 compare the legacy statements with imports that are still the legacy code until group 3 moves them;
  - check 10 uses `EXCEPT ALL`;
  - the worker build passes.
- [x] 2.2 Add `EXPLAIN=1` to the same script (design decision 6). It prints `EXPLAIN (ANALYZE, BUFFERS)` for:
  - the legacy and the imported `WITH … posts, listed SELECT count(*) FROM posts WHERE ${listedPost}`;
  - the legacy and new pair joins of check 10;
  - the legacy and new hide predicate applied per list, for the person with the most hides (skipped, with a line saying so, when there are no hides).

  Verify that a local run prints four plans and the skip line and still refuses a connection that is not read-only, and the worker build passes.

## 3. Pairing statements

- [x] 3.1 Rebuild `postsCte` in `packages/api/src/services/trade/feed/query.ts` to design decision 2's SQL. `on_trade` drops `linked_list_id`. The joins go through `trade_post tp` and `th`, with `postPairsSql`. The doc comment says posts are read from `trade_post`. Verify:
  - the local drift run has zero on checks 8 and 9;
  - `EXPLAIN=1` shows the new `posts` with hash joins only and no nested loop of `on_trade` against itself;
  - lint, typecheck and build pass for `@repo/api`, and the worker build passes.
- [x] 3.2 In `fetchTradeCandidates` (`packages/api/src/services/trade/matches/candidates.ts`):
  - `partner_lists` drops `l.linked_list_id`;
  - `partner_post` joins `trade_post tp ON tp.lead_list_id = o.id` and then `partner_lists w ON ${postPairsSql("tp", "o", "w")}` (design decision 3, item 3);
  - the comment above `partner_post` stays true.

  Verify that the local drift run has zero on check 10, For you on the local dev server shows the same partners and counts as before the change for the local test account, and lint, typecheck and build pass for `@repo/api`.
- [x] 3.3 In `hidesOfSql` (`packages/api/src/services/trade/lists.ts`), move the lead branch to `trade_post hide_row JOIN lists hide_lead … WHERE ${postPairsSql("hide_row", "hide_lead", alias)}` (design decision 3, item 4). Keep the first branch, `hp.list_id = alias.id`. Delete `leadsPairSql`, and update the doc comments of `hidesOfSql` and `inHiddenPostSql`. Verify:
  - `grep -rn leadsPairSql packages apps` finds only the drift script's legacy text, `packages/api/docs/trade.md` and `packages/api/src/lib/trade-post-rows.ts`, which 3.4 fixes;
  - the local drift run has zero on check 11; the local database has no hides, so this is vacuous here, and only the production run in 6.4 proves it;
  - lint, typecheck and build pass for `@repo/api`, and the worker build passes (`job/want-alerts/pairs.ts` and `record.ts` use `hidesOfSql`).
- [x] 3.4 Update the docs that groups 1 to 3 made false:
  - `packages/api/docs/trade.md` (Trade posts): `postPairsSql` is the one pairing rule over `trade_post`, shared by `postsCte`, `partner_post` and `hidesOfSql`; `postPartnerSql` gives a list's partner; and design decision 8's points on writers and the link;
  - `packages/api/src/lib/trade-post-rows.ts:43`: the comment's `leadsPairSql` becomes the link as `syncPostRows` reads it.

  Verify that the doc names both helpers and the reads that stay on the link, that `grep -rn leadsPairSql packages apps` now finds only the drift script, and that lint passes for `@repo/api`.

## 4. Partner reads

- [x] 4.1 In `feedListColumns` (`packages/api/src/services/trade/feed/entries.ts`), set `linkedListId` to `postPartnerSql("lists")`. Verify:
  - on a local read, `typeof linkedListId` is `"number"` for a paired list (design, Assumptions);
  - on the local dev server, Browse and `trade.myPosts` show the same posts, pairs and tags as before;
  - lint, typecheck and build pass for `@repo/api`.
- [x] 4.2 In `inPostsOf` (`packages/api/src/services/trade/feed/post-cards.ts`), use `postPartnerSql("named")` over `alias(lists, "named")`, as design decision 3, item 7 gives it.

  Verify:
  - a local execution of `fetchPostCards` with the ids of both halves of a local pair maps both ids to the same post as before;
  - a chat post card in the browser pass, if one exists locally, draws the same post;
  - lint, typecheck and build pass for `@repo/api`.
- [x] 4.3 In `resolveTradeSides` (`packages/api/src/services/trade/matches/recount.ts`), set `linkedListId: postPartnerSql("lists")`. Verify that For you, with a list named in Compare with, matches as before locally, and lint, typecheck and build pass for `@repo/api`.
- [x] 4.4 In `fetchHiddenPosts.partnerName` (`packages/api/src/services/trade/hidden.ts`), replace `lists.linkedListId` with `postPartnerSql("lists")` and keep the other conditions. Verify that `/account/hidden` loads locally, and lint, typecheck and build pass for `@repo/api`.
- [x] 4.5 Move the offer picker's three reads:
  - `postWantedAmong` (`packages/api/src/services/offer/picker/shared.ts`) selects `postPartnerSql("lists")`;
  - `partnerListChoices` (`picker/theirs.ts`) joins `want_half` on `postPartnerSql("lists")`;
  - `postListsOf` (`picker/index.ts`) selects `postPartnerSql("named")`.

  Verify:
  - on the local offer builder for a partner with a Swap pair, the List choice shows the pair's want list, and Matches of one post opens the pair;
  - a local execution of `postWantedAmong` with that pair's have list id and one slug of its want list returns that slug, and with a Buy post's list id returns null; it runs only at offer send otherwise;
  - lint, typecheck and build pass for `@repo/api`.
- [x] 4.6 In `snapshotColumns` (`packages/api/src/services/moderation/report.ts`), set `linkedListId: postPartnerSql("lists")`.

  Verify:
  - a local execution runs the `snapshotColumns` select on its own, with `reportedPost`'s `WHERE`, for each half of a local pair, and returns the partner's id as `linkedListId` for both. Do not call `fileReport`: on a read-only connection it fails only at its first write, after the advisory lock, and a recent local report makes it refuse earlier at the rate limit;
  - lint, typecheck and build pass for `@repo/api`.
- [x] 4.7 In `loadContext`'s `swapPair` (`apps/worker/src/job/want-alerts/context.ts`), use `p.id = ${postPartnerSql("lists")}`, imported from `@repo/api/services/trade/lists`, and keep the comment's point about qualified columns.

  Verify:
  - a local execution of `loadContext` over a local pair's lists returns `swapPair` true for both halves of a Swap pair whose want list takes swaps, and false for a lone list; it otherwise runs only inside the want-alerts job;
  - the worker build passes.

## 5. `linkedList` from the row

- [x] 5.1 In `packages/db/src/relation.ts`, add `postLed` and `postWanted` to `lists`, with the aliases `trade_post_lead` and `trade_post_want` (design decision 4), and remove `lists.linkedList`. Check the SQL the relational query builder renders (`.toSQL()` on a `findFirst` with both relations and `orderBy: { id: "asc" }` in each nested config): each one-relation must take `limit 1` ordered by the row id. If the nested `orderBy` is not accepted, record that in design.md and leave it out. Verify that typecheck now fails only in `packages/api/src/services/list/read.ts`, and lint passes for `@repo/db`.
- [x] 5.2 In `packages/api/src/services/list/read.ts`, replace `linkedList: linkedListWith` in `listWith` and `fetchOwnedLists` with `postLed` and `postWanted`. Add `pairedListOf(row)`, use it in `toPublicList`, and in `fetchOwnedLists` before `needsTradeHandle`. In `fetchOwnedLists`' map, pull `postLed` and `postWanted` out beside `userAddress`, so that neither reaches the result (design decision 4). In `trade-post-drift.ts`, add check 12 (decision 6), which compares the relation with `lists.linked_list_id` for every list, with the partner rule inlined rather than importing `read.ts`. Verify:
  - the local drift run has zero on check 12;
  - a local list page for each half of a pair shows the partner's chip, "View have/want list" and its post tags, as before;
  - `list.findPublic` over `/api/v1` returns the same `linkedList` object, byte for byte, as before the change for one paired list;
  - the `user.currentUser` JSON equals the baseline of 1.2, key for key: no `postLed`, `postWanted` or `trade_post` id in it;
  - lint, typecheck and build pass for `@repo/api`, and the worker build passes.
- [x] 5.3 In `packages/db/src/schema.ts`, change the `tradePost` doc comment: read for every post outside a write path, and still derived from `lists.linked_list_id` by `planPostRows`. Verify that `bun run --filter=@repo/db db:generate` finds no diff and writes no file, and lint and typecheck pass for `@repo/db`.

## 6. Checks

- [x] 6.1 Grep `packages/api/src` and `apps/worker/src` for `linked_list_id`, `linkedListId` and `linkedList`. Every hit must be a pure module's input type, a write path listed in design decision 5, `findOwnedList`, the report snapshot schema, `createListInputSchema`, `checkLinkedList` in `services/list/create.ts`, `needsTradeHandle` and `publicListSchema.linkedList` in `schemas/list.ts`, `linkedListWith`, `toLinkedList` and `pairedListOf` in `services/list/read.ts`, or the drift script. Then run `bun run check` and `bun run build --filter=web` from the root. Verify that both pass.
- [x] 6.2 Run the drift script locally, without and with `EXPLAIN=1`. Verify:
  - all twelve counts are zero;
  - record the output and both `posts` plans and times in design.md (Assumptions).
- [x] 6.3 Run a browser pass on the local dev server with the local test accounts, through the `browser-use` CLI:
  - Browse, For you, a person page, a post page (`/trade/@{handle}/{slug}`), `/account/hidden`, a list page for each half of a pair, and the offer builder;
  - follow the browser-use rules in `~/.claude/CLAUDE.md`: an own tab by target id, and waiting for hydration before a sign-in form is submitted;
  - Hide post and Unhide are read-only verified up to the request boundary unless the owner approves a local hide row.

  Verify that every page renders with no console error, and that pairs, tags, Can swap and the partner chip match what the same pages showed before the change (screenshots before and after).
- [x] 6.4 Stop and report to the owner what this change contains and the output of 6.2 and 6.3. Ask for a go-ahead to run the drift script, with and without `EXPLAIN=1`, read-only against production, from this working tree, before anything ships. With it:
  - run both;
  - record the counts and plans in design.md;
  - all twelve checks must read zero, and the new `posts` plan must be no worse in shape than the legacy one.

  Verify that the go-ahead is recorded before anything touches production. If any check is above zero, stop and report it.
- [ ] 6.5 The owner approves and runs the commit, push and deploy of web and worker (design decision 7). With a further go-ahead afterwards, run the drift script read-only against production and report it. Verify that every count is zero.

## 7. Agent docs

- [x] 7.1 Use `writing-for-agents` for these edits:
  - `packages/db/AGENTS.md` (Trade posts): "written and not yet read" becomes "read for every post outside a write path"; writers still derive it from the link;
  - `apps/worker/AGENTS.md` (Trade post drift): checks 7 to 12 compare the legacy reads with the new ones until `trade-post-contract`; add `EXPLAIN=1`; drift now changes what people see.

  `packages/api/AGENTS.md` (task 3.4 covers its domain doc), `apps/web/AGENTS.md` and the root `AGENTS.md` are expected unchanged; state so. Verify that lint passes for `@repo/db` and the worker.

## Workflow follow-up

- Propose `trade-post-keys` from design.md's "Inputs for later phases" once this change is live and the production drift script reads zero.
- Archive this change after the deploy is verified.

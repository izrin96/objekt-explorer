These rules hold for every task:

- No task commits, pushes or uses `git stash`. A checkpoint is a WIP commit, made only with the owner's approval.
- No migration and no schema change. `packages/db/src/schema.ts` changes only in a doc comment, apart from task 5.1's experiment, which is reverted.
- The root `.env` is production, and every local run uses `.env.local`.
  - A production read runs only with the owner's go-ahead for that run. It uses `PGOPTIONS='-c default_transaction_read_only=on'` and never prints a connection string or secret.
  - Each local test row (a list, a post edit, a pair) needs the owner's approval for that row.
- "Build" means:
  - for `@repo/api` and `@repo/db`: `bun run build --filter=web`, which bundles them;
  - for the worker: `bun run typecheck --filter=worker` and `bun test apps/worker/src/import-boundary.test.ts`.
- No `.tsx` change is expected. If one is needed, load `vercel-react-best-practices` before the edit. No user-facing string changes.
- Comments state only a non-obvious why. A transaction's statements run in sequence, in its documented lock order.
- Groups 1 to 6 edit code and write no data. They are proven by tests, typecheck, greps and read-only executions. Every writer's SQL is executed in the write pass (group 7), which is where the drift script proves something.
- The drift script runs from `apps/worker`:

  ```
  PGOPTIONS='-c default_transaction_read_only=on' bun run --env-file=../../.env --env-file=../../.env.local src/script/trade-post-drift.ts
  ```

- A **local execution** runs a statement or a function over local data once, read-only, from a scratch script inside `apps/worker` (bun resolves `@repo/*` from the script's path), deleted afterwards:

  ```
  PGOPTIONS='-c default_transaction_read_only=on' REDIS_URL=redis://127.0.0.1:1 bun run --env-file=../../.env --env-file=../../.env.local <script>
  ```

  - The unreachable `REDIS_URL` keeps cache writes away from the production Valkey.
  - A write statement, or a `SELECT … FOR UPDATE`, fails there with "read-only transaction" only after Postgres has parsed and planned it, so the failure proves its SQL.

## 1. The pure rule and the differential test

- [x] 1.1 In `packages/api/src/lib/trade-post-rows.ts`, add `partnersOf(rows)` and `applyPairing(partners, change)` with the `PairChange` type, exactly as design decision 1 gives them. In `trade-post-rows.test.ts`, add decision 7's unit cases for both:
  - `partnersOf`: a pair, a Buy post, a lone lead, and a list in two rows, where the lowest row wins and the later row's lead gets no partner;
  - `applyPairing`:
    - pair two lists that each have a partner: both old partners end with none;
    - pair the same pair again: no change;
    - unpair a list; unpair a list with no partner;
    - "pair N with L" for a new N and a paired L.

  Verify that `bun test packages/api/src/lib/trade-post-rows.test.ts` passes, and lint, typecheck and build pass for `@repo/api`.
- [x] 1.2 In the same module, add `TradeListState`, `PostWrite`, `PostWritePlan` and `planPostWrite(before, write)` (design decision 2): the foreign keys applied to the rows, `was` and `base` partners, `applyPairing`, the overlaid lists sorted by id into `planPostRows`, then `relinked`, and `mirror` (a pair or unpair asked for, or any row operation). Change `RowList.linkedListId`'s comment to "the list's partner after the write", and the comment above `wantOf` to say the partners come from `planPostWrite`. `planPostRows` itself does not change. Add the `planPostWrite` cases of decision 7:
  - `relinked` and `mirror` for each pairing case of 1.1;
  - a removed lead: no operation for its row, which the cascade took; its partner on Trade gets a row, so `mirror` is true, and `relinked` holds the partner;
  - a removed want list: no operation, `mirror` false, the lead in `relinked`;
  - a list in two rows, where the only change is the planner emptying the later row: `mirror` true;
  - `written` overriding a list's `discoverable`, and adding a new list.

  Verify that the test file passes, and lint, typecheck and build pass for `@repo/api`.
- [x] 1.3 Rewrite the transitions of `packages/api/src/lib/trade-post-rows.model.test.ts` into the differential test of design decision 7:
  - two worlds:
    - legacy: today's SQL of `savePost`, `writeList` and the foreign keys, transcribed as pure functions in the test, then `planPostRows` over the link;
    - rows: `planPostWrite`, then the mirror by `postPartnerSql`'s rule, transcribed in the test, whenever `mirror` is true;
  - writes built as callers build them: `planPost` on random `PostChoice`s, `postsOf` / `postHolding` for Take off Trade, `pairRefusal` for creates and copies with a link, deletes of either half, account deletion;
  - after every step:
    - equal `planPost` results in both worlds;
    - equal lists (link, `discoverable`, Open to, `takes_swaps`);
    - equal rows with ids, and equal touched lists;
    - the existing invariants (rows' posts equal `groupPosts` over the link, no list in two rows, owners), with every link equal to its `partnersOf` partner;
  - 1,000 seeded sequences of 40 steps, and a count per transition kind (post, Take off Trade, pair, unpair, swap the want list, delete a lead, delete a want list, create on Trade, create linked, copy, account deletion), each at least 100.

  Keep the healing test as it is. Delete the old `step` and `unlink` helpers. Verify:
  - `bun test packages/api/src/lib/trade-post-rows.model.test.ts` passes at the fixed seed, with every transition count at 100 or more;
  - the test fails when `applyPairing` is broken on purpose (pair without dropping an old partner), and when a legacy transcription is broken (the stale clear left out); try each, then revert;
  - lint, typecheck and build pass for `@repo/api`.

## 2. `lockPosts` and `writePosts`

- [x] 2.1 In `packages/api/src/services/list/shared.ts`, add `tradeState`, `LockedPosts`, `lockPosts(tx, userId)` and `writePosts(tx, userId, locked, write)` with the mirror statement, exactly as design decision 3 gives them:
  - `lockPosts` calls `lockTradeLists`, then runs the fresh read, `lists` by `user_id` left-joined to the rows they lead, as a statement of its own. It fills `current` from that read, and each locked list's `linkedListId` from `partnersOf(current.rows)`.
  - `writePosts` plans from `locked.current`.

  Leave `lockTradeLists` and `syncPostRows` as they are, so every writer still builds. Verify:
  - a local execution, for every person with a have, sale or want list, runs `lockPosts`' fresh read and `partnersOf`, and compares each list's partner with `lists.linked_list_id`: zero differences;
  - a local execution of the mirror's `FROM` subquery, as `SELECT … WHERE lists.linked_list_id IS DISTINCT FROM mirror.partner_id`, returns no row for any person;
  - the mirror `UPDATE`, run for one local person, fails only with the read-only error;
  - lint, typecheck and build pass for `@repo/api`.

## 3. Writers, one at a time

Each writer's SQL runs in the write pass (7.3); these tasks prove the code builds and leaves no old link write behind.

- [x] 3.1 `trade.takeDownPost` (`packages/api/src/services/trade/post.ts`): `lockPosts`, `postsOf(locked.lists)`, the off `UPDATE` with `.returning(tradeState)`, then `writePosts(tx, userId, locked, { written })` (design decision 4). Verify that lint, typecheck and build pass for `@repo/api`.
- [x] 3.2 `trade.savePost` (same file): `lockPosts`, `planPost(locked.lists, choice)`, the on and off `UPDATE`s with `.returning(tradeState)`, then `writePosts(…, { pair: plan.link, unpair: plan.unlink, written })`. Delete the unlink, stale-clear and two link statements. Touch `touched` plus `relinked`. Verify:
  - `grep -n "linkedListId" packages/api/src/services/trade/post.ts` finds nothing;
  - lint, typecheck and build pass for `@repo/api`.
- [x] 3.3 `writeList` (`packages/api/src/services/list/create.ts`):
  - `lockPosts` for a have, sale or want list, and `pairRefusal` on the locked target;
  - the insert without `linkedListId` and with `.returning(tradeState)`;
  - the partner's `tradeColumns(true)` with `.returning(tradeState)`;
  - then `writePosts(…, { pair: linkedListId === null ? null : [inserted.id, linkedListId], written })`;
  - `changed` becomes `[...new Set([inserted.id, ...relinked])]`.

  Delete the reverse clear and the target's link write. This covers `list.create` and `list.copy` (`copy.ts` does not change). Verify:
  - `grep -n "linkedListId" packages/api/src/services/list/create.ts` finds only `checkLinkedList`'s parameter and `prepareList`'s request field;
  - lint, typecheck and build pass for `@repo/api`.
- [x] 3.4 `deleteList` (`packages/api/src/services/list/edit.ts`):
  - a have, sale or want list takes `lockPosts`, deletes, then `writePosts(…, { removed: [list.id] })`, and touches `relinked`, else bumps the trade version;
  - a general list runs its delete alone, with no partner read.

  Delete the `linked_list_id` partner `SELECT`. Verify that lint, typecheck and build pass for `@repo/api`.
- [x] 3.5 In `services/list/shared.ts`, delete `syncPostRows`, and drop `linkedListId` from `lockTradeLists`' `SELECT`, typed `LockedList` (design decision 3). Update its doc comment: every writer of a pairing, of `discoverable` or of a row takes it through `lockPosts`, and `anonymizeUser` takes it alone. `anonymizeUser` does not change. Verify:
  - `grep -rn "syncPostRows" packages apps` finds only the docs task 5.2 rewrites;
  - lint, typecheck and build pass for `@repo/api`.

## 4. Reads inside write paths

- [x] 4.1 `findOwnedList` (`packages/api/src/services/list/read.ts`): add `postLed` and `postWanted`, destructure both out, and return the row with `linkedListId` from them (design decision 5).

  Before the edit, take a baseline: a local execution of `findOwnedList` for 13140 (paired), 13175 (its want list) and 13141 (unpaired), written as JSON to the scratchpad. Verify:
  - after the edit, the same execution gives the same keys and the same values for all three, with no `postLed` or `postWanted` key;
  - `.toSQL()` of the query renders one statement with `order by … id asc limit 1` in each relation;
  - lint, typecheck and build pass for `@repo/api`, and `bun run typecheck --filter=web` passes (`StoredList` is unchanged).
- [x] 4.2 `openToColumns` (`packages/api/src/services/list/edit.ts`): `keep` for Buying only becomes `(${lists.discoverable} OR ${postPartnerSql("lists")} IS NOT NULL)`, and the doc comment says the pair is read from the row. Verify:
  - `.toSQL()` of `editList`'s `UPDATE` with Buying only flags renders the subqueries over `lists.id` of the target;
  - a local execution of that `UPDATE` for 13175 fails only with the read-only error;
  - lint, typecheck and build pass for `@repo/api`.
- [x] 4.3 `editList` (same file): when `openTo.action === "write"` and `pairRefusesOpenTo(openTo.flags)`, run the `UPDATE` in a transaction after `lockTradeLists(tx, userId)`; every other edit runs as today (design decision 5). A one-line comment gives the why: the `CASE` reads the pair from `trade_post`, which an `UPDATE` that waited for a writer reads from before the wait. Verify:
  - `touchList` still runs after the commit;
  - lint, typecheck and build pass for `@repo/api`.

## 5. Proof by grep and compiler, and the domain docs

- [x] 5.1 Prove that nothing else reads the link (design decision 6). Both steps are needed.

  First, grep `packages/api/src`, `packages/db/src`, `apps/worker/src` and `apps/web/src` (less `src/paraglide`) for `linked_list_id`, `linkedListId` and `linkedList`. Every hit must be in one of these files, for the reason given:
  - **`packages/api/src/lib/`:** `trade-post-rows.ts`, `trade-feed.ts`, `trade-rank.ts` and `report-post.ts`, and their tests: pure input types and comments.
  - **`packages/api/src/schemas/`:**
    - `trade-post.ts`;
    - `list.ts` (`TradeListRef`, `needsTradeHandle`'s `linkedList`, `publicListSchema.linkedList`, `createListInputSchema.linkedListId`);
    - `open-to.ts` (`openToEdit`'s input);
    - `moderation.ts` (the stored snapshot field);
    - their tests.
  - **`packages/api/src/services/list/`:**
    - `shared.ts`: the mirror statement only;
    - `create.ts`: `checkLinkedList`'s parameter and local, and `prepareList`'s request field;
    - `read.ts`: `findOwnedList`'s computed field, `linkedListWith`, `toLinkedList`, `pairedListOf` and `PublicList.linkedList`.
  - **Other `packages/api/src/services/` files:**
    - `moderation/report.ts`, `trade/feed/entries.ts` and `trade/matches/recount.ts`: keys that `postPartnerSql` fills;
    - `trade/lists.ts`: `postPartnerSql`'s comment.
  - **`packages/db/src/schema.ts`:** the column, its index and doc comments.
  - **`apps/worker/src/script/trade-post-drift.ts`.**
  - **`apps/web/src/features/list/`:** `copy-draft.ts`, `list-draft.ts`, `list-form.tsx`, `list-header.tsx`, `list-link.ts`, `list-post-tags.ts`, `list-rows.tsx`, `partner-switch.ts` and their tests. They read `PublicList.linkedList` or `list.find`'s `linkedListId`, both now from the row, or build `list.create`'s input.
  - **`apps/web/src/features/trade/`:** `compare-rule.ts`, `compare-with.ts` and `plan-list.ts`, and the tests `browse-search.test.ts`, `composer-choice.test.ts`, `composer/link.test.ts`, `compare-rule.test.ts` and `plan-list.test.ts`. Same reason.

  `services/trade/post.ts` and `services/list/edit.ts` must have no hit.

  Then, in the working tree only, before 5.3:
  1. remove `linkedListId` and `lists_linked_list_id_idx` from `lists` in `packages/db/src/schema.ts`;
  2. run `bun run typecheck` and record every error;
  3. put both back by hand.

  Verify:
  - every grep hit is allowed;
  - the typecheck errors are only in the drift script's relations check (`columns: { linkedListId: true }` and the comparison that reads it);
  - after restoring, `git diff packages/db/src/schema.ts` is empty;
  - lint and typecheck pass for `@repo/db`.

  A hit outside the list, or another typecheck error in non-test source, is a read the change missed: fix it in group 4 and rerun. An error in a test fixture or type literal that only names the field is a fixture edit. Record the hits and errors in design.md (As built).
- [x] 5.2 Update `packages/api/docs/trade.md` and `packages/api/docs/lists.md` as design decision 9 gives them, including `trade.md`'s Can swap line about `partner_post` and `linked_list_id`. Verify:
  - `grep -n "syncPostRows\|must keep writing the link\|when it links" packages/api/docs` finds nothing;
  - `grep -n "linked_list_id" packages/api/docs/*.md` finds only sentences that name it as the mirror;
  - both docs name `lockPosts`, `writePosts` and the mirror;
  - lint passes for `@repo/api`.
- [x] 5.3 Rewrite the `tradePost` doc comment in `packages/db/src/schema.ts` (design decision 9). Verify:
  - `bun run --filter=@repo/db db:generate` finds no diff and writes no file; if it writes one, delete it and report what it held;
  - lint and typecheck pass for `@repo/db`.
- [x] 5.4 Rewrite the header comment of `apps/worker/src/script/trade-post-drift.ts`:
  - writers write the rows and mirror `lists.linked_list_id` from them;
  - the checks that read the link now check the mirror, so they catch a wrong mirror, not a wrong row;
  - they go with the column in `trade-post-contract`.

  No check changes. Verify that the edited script still runs locally and prints eleven counts, and the worker build passes.

## 6. Checks

- [x] 6.1 Run `bun run check` and `bun run build --filter=web` from the repo root, and the worker build. Verify:
  - all three pass;
  - `git status --short -- apps packages` lists only these:
    - `packages/api/src/lib/trade-post-rows*.ts`;
    - `services/list/{shared,create,edit,read}.ts` and `services/trade/post.ts`;
    - `packages/api/docs/{trade,lists}.md`;
    - `packages/db/src/schema.ts`;
    - `apps/worker/src/script/trade-post-drift.ts`;
  - no scratch script is left in `apps/worker`.

## 7. Local write pass

In this group, W is 13142, H1 13168, H2 13169, S 13170 and H3 13173 (`localtest2`). A row is written `id: lead→want`.

- [x] 7.1 Read-only, record the starting state in the scratchpad:
  - the local drift script's output (all eleven counts zero);
  - for every list of both local test accounts:
    - `discoverable`, `linked_list_id`, `match_have`, `match_sale`, `takes_swaps`, `bumped_at`, `updated_at`;
    - the row it leads, and the row it is the want list of.

  Expected, as design.md's Context:
  - W `1000421: W→–`, H1 `1000303: H1→–`, H2 `1000304: H2→–`, S `1000305: S→–`, H3 `1000307: H3→–`, all on Trade with no link;
  - `localtest1`'s 13140 and 13175 off Trade, linked to each other, in `1000302: 13140→13175`.

  Verify that it is written down. Nothing is built.
- [x] 7.2 Stop and ask the owner to approve, by name, the local rows of 7.3:
  - as `localtest2`:
    - three lists created over `/rpc`: want lists N ("lt2 writes N") and N2 ("lt2 writes N2"), and H4 ("lt2 writes H4"), a copy of N2 as an unbound have list;
    - one list copied in the web: C ("lt2 writes copy"), from N2;
    - Open to Buying only saved on C;
    - one `list.edit` over `/rpc` that must be refused and write nothing;
    - `trade.savePost` and `trade.takeDownPost` writes on W, H1, H2 and N2;
    - the deletes of H4, N2, N and C;
  - as `localtest1`: posting the pair 13140 and 13175 and taking it off Trade again;
  - the `trade_post` rows and links all of these write.

  Verify that the approval is recorded before any local row is written. If it is refused, record every writer as covered by the differential test and read-only verified up to the request boundary, and skip 7.3.
- [x] 7.3 With that approval, run the pass on the local dev server through the `browser-use` CLI, under `~/.claude/CLAUDE.md`'s rules:
  - an own tab by target id;
  - an isolated context per account;
  - waiting for hydration before submitting a sign-in form.

  Sign in as `localtest1@local.invalid` and `localtest2@local.invalid`, with `LOCAL_TEST1_PASSWORD` and `LOCAL_TEST2_PASSWORD` read from `.env.local` and never printed. Never sign up. A `/rpc` call is made from the signed-in page, with the body the matching web form sends plus the fields named. The web never sends a link.

  Things to know about the composer:
  - it greys out a list that is in another post ("In your Swap post");
  - it has no Unpair button: "No list" for the want list unpairs and leaves it off Trade;
  - it splits a pair through "Unpair and use it";
  - every save that involves W ticks "I'd also pay", so W's `match_sale` stays true.

  **After every write step:**
  - run the local drift script, which must read zero;
  - run a read-only query that prints, for every have, sale and want list of the account: `discoverable`, `linked_list_id`, the row it leads and the row it is the want list of.

  The output must match the step's expected values. A list the step does not name is as it was after the previous step. Every link must name the other list of its row, or be null when the list has no partner in a row.

  As `localtest2`:
  - (a) **Create linked.** `list.create` over `/rpc`: want list N, `linkedListId: H2`. Expected:
    - N and H2 link to each other;
    - `1000304: H2→N`;
    - N is off Trade, with no row of its own.
  - (b) **Create linked to a paired list** (the stale-clear path). `list.create` over `/rpc`: want list N2, `linkedListId: H2`. Expected:
    - N2 and H2 link to each other;
    - N's link is null, and N's `updated_at` moved;
    - `1000304: H2→N2`;
    - N and N2 are off Trade, with no rows of their own.
  - (c) **Copy linked.** `list.copy` over `/rpc` from N2: `listType: "have"`, `isProfileBind: false`, `profileAddress: null`, `linkedListId: N`, named H4. Expected:
    - H4 and N link to each other;
    - a new row `H4→N`;
    - H4 is off Trade;
    - H2 and N2 are unchanged.
  - (c′) **Refused edit.** `list.edit` over `/rpc` for N, with `openTo: "buying"`. Expected: refused with `list_pair_buying_only`; N's `match_have` and `match_sale` unchanged; nothing written, so no drift run.
  - (d) **Delete the have half of a pair.** Delete H4 from its list page. Expected:
    - H4 and its row are gone;
    - N's link is null and its `updated_at` moved;
    - N has no row.
  - (e) **Take off Trade** H1's post. Expected: H1 off Trade; `1000303: H1→–` kept; no link changes.
  - (f) **Pair.** Edit W's post as a Swap post, with have H1 and want W. Expected:
    - H1 and W are on Trade and link to each other;
    - `1000303: H1→W`;
    - `1000421` is gone.
  - (g) **Swap the want list.** Edit the pair to want N2, through "Unpair and use it". Expected:
    - H1 and N2 are on Trade and link to each other;
    - `1000303: H1→N2`;
    - H2's link is null, with `1000304: H2→–`, still on Trade;
    - W is off Trade, unlinked, in no row.
  - (h) **Copy in the web.** Copy N2 as want list C. Expected: C off Trade, unlinked, in no row; nothing else changes.
  - (i) **Buying only on an off-Trade want list** (the locked branch of `list.edit`). In C's edit form, set Open to to Buying only and save. Expected: C's `match_have` false and `match_sale` true; no link and no row.
  - (j) **Unpair.** Edit the pair, with want "No list". Expected:
    - H1 on Trade alone, with `1000303: H1→–`;
    - N2 off Trade, unlinked, in no row.
  - (k) **Post again.** Post W alone as a Swap post. Expected: W on Trade, unlinked, in a new row `W→–`, with `match_have` and `match_sale` true.
  - (l) **Pair from a lone post.** Edit H2's post to add want N2. Expected:
    - H2 and N2 are on Trade and link to each other;
    - `1000304: H2→N2`.
  - (m) **Delete the want half of a pair.** Delete N2. Expected:
    - `1000304: H2→–`;
    - H2's link is null and its `updated_at` moved;
    - H2 is on Trade alone.
  - (n) **Delete lone lists.** Delete N, then C. Expected: no other list or row changes.

  As `localtest1`:
  - (o) **Post an off-Trade pair.** Post the pair 13140 and 13175 from 13140's Post it, as a Swap post with "I'd also pay" ticked. Expected: both on Trade, still linked, still in `1000302: 13140→13175`.
  - (p) **Take it off Trade.** Expected: both off Trade, still linked, `1000302` kept.

  Then compare with 7.1, read-only:
  - every list of both accounts has the `discoverable`, link, Open to and `takes_swaps` it had at the start;
  - the rows are the same, except that W leads a new row id;
  - N, N2, H4 and C are gone;
  - tell the owner which `updated_at` and `bumped_at` moved, and W's new row id.

  Verify that every step's expectation held with no console error from the app, and record each step's query output and the final comparison in design.md (As built).

## 8. Production

- [x] 8.1 Stop and ask the owner for a go-ahead to run the drift script read-only against production, from this working tree, without `.env.local`. With it, run it and record the counts in design.md.

  This is the gate in design.md's Risks. After the deploy the rows overwrite the link, so this is the last moment the link can still correct the rows.

  Verify that the go-ahead is recorded before the run, and that all eleven counts are zero. Any other count stops the rollout and goes to the owner.
- [x] 8.2 The owner approves and runs the commit, the push and the deploy of the web image; the worker may stay as it is (design decision 8). With a further go-ahead afterwards, run the drift script read-only against production and record it in design.md. Verify that all eleven counts are zero.

## 9. Agent docs

- [x] 9.1 Use `writing-for-agents` for these edits (design decision 9):
  - `packages/db/AGENTS.md`, Trade posts: writers write the rows through `writePosts`; `lists.linked_list_id` is a mirror written from them and read only by the drift script until `trade-post-contract`;
  - `apps/worker/AGENTS.md`, Trade post drift: the checks that compare with `lists.linked_list_id` now check the mirror, so they no longer catch a wrong row.

  `packages/api/AGENTS.md` (task 5.2 covers its domain docs), `apps/web/AGENTS.md` and the root `AGENTS.md` are expected unchanged; state so. Verify that lint passes for `@repo/db` and the worker, and that neither doc says writers derive the rows from the link.

## Workflow follow-up

- Archive this change once the post-deploy drift run reads zero.
- Propose `trade-post-contract` from design.md's "Inputs for later phases", item 1.

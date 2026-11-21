## Ground rules

- **Git.** No task commits, pushes or uses `git stash`; the stash stack is shared by every worktree. A checkpoint is a WIP commit, made only with the owner's approval. The work happens in the `shared-lists-orca` worktree.
- **Production.** The root `.env` is production, and every local run uses `.env.local`.
  - A production read runs only with the owner's go-ahead for that run. It uses `PGOPTIONS='-c default_transaction_read_only=on'` and never prints a connection string or secret.
  - The owner deploys. There is no migration.
- **Local data.** Each local test row (a list, a post, a hide, a bump) on `localtest1@local.invalid` and `localtest2@local.invalid` needs the owner's approval, given once at task 8.1. Group 8 restores what it changed.
- **"Checks pass"** means lint, typecheck and build for the touched package:
  - for `@repo/api` and `@repo/db`: `bun run lint --filter=<pkg>`, `bun run typecheck --filter=<pkg>` and `bun run build --filter=web`, which bundles them;
  - for the worker: `bun run lint --filter=worker`, `bun run typecheck --filter=worker` and `bun test apps/worker/src/import-boundary.test.ts`.
- **Tests** cover pure modules only, never the database.
- **No `.tsx`, message, `/rpc` input or cache-key change is expected.** If one turns out to be needed, stop and ask.
- **Comments** state only a non-obvious why.
- **Scratch scripts** live outside the repo, in `/private/tmp/claude-501/planner-shared/`, because worker lint reads `apps/worker/.<dir>`.
  - Bun resolves `@repo/*` from a script's own path, so a script is copied into `apps/worker/.planner-shared/` only to run, and removed after.
  - Each script refuses to start unless the hosts of `DATABASE_URL` and `REDIS_URL` are `localhost` or `127.0.0.1`, except the production runs of group 9, which instead refuse unless `show transaction_read_only` is `on`.
  - Run them from `apps/worker` with `bun run --env-file=../../.env --env-file=../../.env.local <path>`.
- **The drift script** runs from `apps/worker`:

  ```
  PGOPTIONS='-c default_transaction_read_only=on' bun run --env-file=../../.env --env-file=../../.env.local src/script/trade-post-drift.ts
  ```

  Drop the second `--env-file` for production. "The old drift script" is `git show 70c82fb3:apps/worker/src/script/trade-post-drift.ts`, saved under the scratch folder and copied in only to run.

## 1. Freeze the reference

- [x] 1.1 In `packages/api/src/lib/trade-post-rows.model.test.ts`, before any planner edit:
  - copy today's `planPostRows`, `relead` and `movesOf` from `lib/trade-post-rows.ts`, verbatim, as `frozenPlanPostRows`, `frozenRelead` and `frozenMovesOf`, under one comment: the planner as it was before `trade-post-planner-shared`, kept as the differential's reference;
  - make `legacySync` (`:296-298`) call `frozenPlanPostRows`;
  - after every write of the rows world in `differential` (`:717-736`), assert that `frozenPlanPostRows` over that person's rows and lists, partners by `partnerByRows`, returns no deletes, updates or inserts (the rollback floor, design decision 10).

  Verify that `bun test packages/api/src/lib/trade-post-rows.model.test.ts` passes, and that `git diff` shows no change to `lib/trade-post-rows.ts`. Checks pass for `@repo/api`.

## 2. The composer names the edited post

- [x] 2.1 `packages/api/src/schemas/trade-post.ts`, `planPost` (`:246-339`): its `ok` result gains:
  - `replaced: number | null`, the anchor list id of the post `replaces` names (`old.anchor.id`), or null;
  - `lead: number`, the list that leads the post's row after the save (design decision 3).

  No refusal and no other field changes. In `schemas/trade-post.test.ts`, add a case per kind:
  - Swap with both lists;
  - Swap with only the have list;
  - Swap with only the want list of a kept pair (`lead` is the partner);
  - Swap with only the want list after an edit dropped the have list (`lead` is the want list);
  - Sell with and without a want list;
  - Buy;
  - and `replaced` with and without `replaces`.

  Verify with `bun test packages/api/src/schemas/trade-post.test.ts`. Checks pass for `@repo/api`.

## 3. The planner

The new entry is built as `planPostChange` beside `planPostWrite`, which stays as it is until group 4, so the services compile after every task (design decision 1).

- [x] 3.1 `packages/api/src/lib/trade-post-rows.ts`, types, beside the existing ones:
  - add `SideIntent` as design decision 4 gives it;
  - add `PostChange`: `PairChange` plus
    - `post?: { row: PostId; lead?: number } | null`;
    - `newPost?: boolean`;
    - `sides?: readonly SideIntent[]`;
    - `created?: TradeListState | null`;
    - `removed?: readonly number[]`;
  - `planPostChange`'s `before` is `{ lists, rows, bumpAt: string }`;
  - its result is `PostWritePlan` with `ops.lists: { id: number; discoverable: boolean; bumpedAt: string | null }[]` added (a new `PostChangeOps` type if `PostWriteOps` can't widen without touching `writePosts`).

  Add `componentOf(rows, write)` per design decision 2, returning the components as lists of row ids, and the throw `a list in two rows of one write`. In `trade-post-rows.test.ts`, add `componentOf` cases for:
  - each writer of decision 2's table;
  - a list in `post.row` and in another row (only `post.row`);
  - a removed list in two rows (two components);
  - the throw.

  Checks pass for `@repo/api`.
- [x] 3.2 `planPostRows` gains an optional `post` argument and decision 3's four steps, and nothing else in it changes; `planPostWrite` passes none, so its behaviour is unchanged. `relead` and `movesOf` keep their text. In `trade-post-rows.test.ts`, add one case per row of decision 3's table, each asserting the deletes, updates, inserts and `moves` exactly. Verify with `bun test packages/api/src/lib/trade-post-rows.test.ts`.
  - With `post: { row }` and no `lead` (Take off Trade), the keep-row rule of decision 3 must not fire, so the row stays as it is. Add a unit test for that.
- [x] 3.3 Add `rowStateOf`, decision 4's rules 1 to 3, for `planPostChange` to use for every row of a component after the write and for every insert. `postStateOf` stays until 4.5. Add unit cases:
  - an intent turning a side on from off (`bumpAt`);
  - an intent turning a want side on from off with no Open to, over a row whose stored Open to lags the list's (the list's own wins);
  - an intent on a side already on (bump kept);
  - an intent off;
  - Open to and `takes_swaps` from an intent;
  - a list moving from a Buy post's lead to a pair's want side (side and Open to carried);
  - a sale lead moving rows (`takes_swaps` carried);
  - a created list with no intent (off, the list's own values);
  - a row with no want list, and a have-led row with no open list.
- [x] 3.4 Write `planPostChange` per design decisions 1, 2, 5 and 6:
  - plan each component with today's rules over its rows and lists, where "on" is decision 2's;
  - concatenate the ops; compute `relinked` and `moves` per component (`movesOf` over the component's rows and ops);
  - give the states by `rowStateOf`;
  - return `ops.lists`: each list of every component, and the created list, whose summary differs from the stored one; never a removed list, never an unchanged one;
  - `newPost` plans the named lists with no rows.

  Unit cases:
  - decision 6's five paths;
  - decision 7's table, one case per row;
  - a summary for a list on in one row and off in another (`discoverable` true, latest bump);
  - `deleteList` of a list in two rows, one re-led and one deleted.

  Verify with `bun test packages/api/src/lib/trade-post-rows.test.ts`. Checks pass for `@repo/api`.
- [x] 3.5 `trade-post-rows.model.test.ts`, the rows world (`byRows`, `locked`, `writePosts` in the test), moves to `planPostChange`:
  - every write passes `bumpAt: clock` and its intents as decision 4's writer table gives them;
  - `savePost`'s write passes `post: { row, lead }` from `planPost`'s `replaced` and `lead`;
  - the rows world's lists take `discoverable` and `bumpedAt` from `ops.lists`. `tradeWrites` (`:266`) writes only Open to and `takes_swaps` for the rows world, and keeps writing both flags and Trade state for `legacy`. `byRows`' `down` branch (`:466-468`) and `create` branch (`:478-482`) stop setting `discoverable` and calling `turnOn` on the rows world's lists; they pass the intents instead;

  Then:
  - the differential (`:717-736`) must pass with **no exception**: lists, rows without ids, outcomes and touched lists equal `legacy`'s;
  - zero-pad the model clock in `packages/api/src/lib/trade-post-rows.model.test.ts` (around `:724`, where the clock is built as `${seed}:${i}`) so the string order matches the time order, for example `${String(seed).padStart(4,"0")}:${String(i).padStart(4,"0")}`. Then assert that the shared-run maximum equals the true maximum;
  - `checkStates` (`:690-707`) still asserts E in full. If it fails only on an off-Trade side, relax it to the on-Trade half, and record the failing seed and step in design.md's As built;
  - `checkMoves` (`:141-186`) and the rollback-floor assertion of 1.1 still run on every write;
  - add the edited-row check of decision 10, and the counted transition `editLead`, with a floor of 100, or what every run reliably reaches (at least 1) if 1,000 runs fall short. Record the count;
  - delete the healing test (`:777-821`) and `corrupt`.

  Every existing floor still holds (`:761-772`). Verify with `bun run test --filter=@repo/api`.
- [x] 3.6 Add decision 10's shared run as a second `test` in `trade-post-rows.model.test.ts`, so it reuses the model's world helpers. It has:
  - the `share`, `dropRow` and `downRow` writes;
  - the six assertions after every write;
  - the counts.

  Run it once with `COUNTS=1` and set each floor at or below the measured count, at least 1. Record the counts in As built. Verify that it passes in under 60 s locally.
- [x] 3.7 Mutation checks (decision 10), each made once in `trade-post-rows.ts` and restored:
  - `componentOf` seeding every row of a named list;
  - `rowStateOf` rule 2 reading the list instead of the old side;
  - `planPostRows` ignoring `post`;
  - the summary reading only the first side;
  - rule 1 taking a turned-on side's Open to from the old row.

  Each must fail a test; record which in As built. Verify that `git diff` after the restore shows only the intended code. Checks pass for `@repo/api`.

## 4. Writers

- [x] 4.1 `packages/api/src/services/list/shared.ts`, plumbing only:
  - `lockPosts`' fresh read (`:101-119`) also selects `turnOnBumpedAt(userId)` once, as `::text`, and `current` carries it as `bumpAt`;
  - add `writeLists(tx, lists)` beside `writeStates`: one `UPDATE lists SET discoverable = s.discoverable, bumped_at = s.bumped_at FROM unnest(…) AS s(id, discoverable, bumped_at) WHERE lists.id = s.id`, only when the array is not empty.

  `writePosts` is unchanged. Checks pass for `@repo/api`.
- [x] 4.2 Switch the writers to `planPostChange`, in one task, since `writePosts`' parameter and its four callers change together:
  - **`writePosts`** (`shared.ts:215-246`) takes a `PostChange` (with `created` as a `WrittenList`), calls `planPostChange` with `locked.current` (with `bumpAt`), and runs `writeLists(ops.lists)` after the inserts. Its doc comment says each row's state comes from the write, and that `lists.discoverable` and `bumped_at` follow from the rows.
  - **`savePost`** (`services/trade/post.ts:26-80`):
    - the `on` loop writes only a want list's flags (`set(flags)`, no `tradeColumns`), skipping lists with no flags;
    - the `saleSwaps` write stays, and the `off` write goes;
    - `writePosts` gets `pair`, `unpair`, `post` (`replaced` resolved with `postRowOf(locked.current.rows, replaced)`, with `lead`; null when either is null) and `sides` per design decision 4;
    - `touched` keeps the same ids as today.
  - **`takeDownPost`** (`post.ts:83-99`): no list write. `writePosts` gets `post: { row }` (the post's row by `postRowOf` of its anchor) and `sides` turning each member off. The returned ids are unchanged.
  - **`writeList`** (`services/list/create.ts:152-224`): the insert stays. The partner's `tradeColumns(true)` `UPDATE` (`:205-216`) goes, replaced by a side intent turning the partner on under the same condition. `writePosts` gets `created: inserted`, the created list's intent when it is created on Trade, and `pair` as today.
  - **`deleteList`** (`services/list/edit.ts:137-156`): only the parameter's type, `{ removed }` as today.

  Checks pass for `@repo/api`, and `bun run test --filter=@repo/api` passes.
- [x] 4.3 Delete what nothing calls now: `planPostWrite`, `PostWrite`, `postStateOf` and `PostWriteOps` (unless `PostChangeOps` reused it) in `lib/trade-post-rows.ts`, their unit tests (or move each case onto `planPostChange` where it still applies), and `tradeColumns` (`services/list/shared.ts:40-50`). `tradeState` stays for `writeList`'s insert. Grep `packages/api/src` and `apps/worker/src` for `planPostWrite`, `postStateOf` and `tradeColumns(`: no hit outside the model test (its frozen copy holds only `planPostRows`, `relead` and `movesOf`) and the unrelated local in `services/offer/trades.ts`. Checks pass for `@repo/api`, and `bun run test --filter=@repo/api` passes.
- [x] 4.4 Docs:
  - `packages/db/src/schema.ts`, `tradePost`'s doc comment (`:260-267`): each row holds its own Trade state, written from the write, and `lists.discoverable` and `bumped_at` follow from the rows. Comment only, so `bun run --filter=@repo/db db:generate` must report no schema change.
  - `packages/api/docs/trade.md`, Trade posts: replace "planPostRows, which plans the person's whole row set, so any write also repairs stale rows" and "While a list is in at most one row, writers keep them equal to the lists" with decisions 1, 2, 4 and 5. Add Edit post keeping its row (decision 3), and that the planner holds a list in several rows while `planPost` still refuses one (decision 6).

  Also replace "leaves the row's copy until the person's next post write repairs it" (a write now leaves rows it does not name), and name the entry `planPostChange` wherever the doc says `planPostWrite`. Verify that `grep -n "whole row set\|repairs stale\|repairs it\|postStateOf\|tradeColumns\|planPostWrite" packages/api/docs/trade.md` finds nothing. Checks pass for `@repo/db`.

## 5. Want alerts

- [x] 5.1 Make the changes of design decision 8:
  - `apps/worker/src/job/want-alerts/pairs.ts`: `fetchPairs` selects `partner_sale` and `partner_wants_swaps` from `c` and returns them on `Pair`;
  - `apps/worker/src/lib/want-alert-match.ts`: `AlertPair` gains `partnerSale` and `partnerWantsSwaps`, and `judge` reads the partner's `sale` (forward) and `wantsSwaps` (reverse) from the group's first pair;
  - `context.ts` stays as it is.

  In `want-alert-match.test.ts`, add cases where the pair's partner flags differ from the list's: forward Sell only partner under Can swap, and reverse partner want list Buying only. Update existing fixtures to carry flags equal to their lists. Verify with `bun run test --filter=worker`. Checks pass for the worker.

## 6. Drift

- [x] 6.1 `apps/worker/src/script/trade-post-drift.ts`:
  - checks 5 and 6 become design decision 9's checks;
  - check 2 and its label stay;
  - the header says that checks 5 and 6 hold whatever rows a list is in (apart from 6c, which holds for a list in one row), and that check 2 holds until `shared-lists`;
  - note 1's comment adds Edit post.

  Checks pass for the worker.
- [x] 6.2 `apps/worker/AGENTS.md`:
  - Trade post drift: the two rewritten checks and check 2's reason;
  - Want alerts: the partner's `sale` and `wantsSwaps` come from the pair (its post's row), and the recipient's from `lists`.

  Checks pass for the worker.

## 7. Checks

- [x] 7.1 From the root, run `bun run check`, `bun run build --filter=web` and `bunx oxfmt --check`; all pass. Grep `packages/api/src` and `apps/worker/src` for `planPostWrite`, `postStateOf`, `written:` and `tradeColumns(`: no hit outside the model test (its frozen copy holds only `planPostRows`, `relead` and `movesOf`) and `offer/trades.ts`.

## 8. Local proof

- [x] 8.1 Ask the owner to approve, by name, the local rows of this group on `localtest1` and `localtest2`. Then, read-only, record the two accounts':
  - lists (Trade state, Open to, `takes_swaps`, `bumped_at`, `updated_at`);
  - `trade_post` rows with all seven state columns;
  - hides;
  - offers' `post_id`.

  Save the record as JSON under the scratch folder, as `record.json`.
- [x] 8.2 Copy the old drift script and the new one into `apps/worker/.planner-shared/`, and run both read-only against the local database. Both read zero on checks 1 to 7. Remove the copies.
- [x] 8.3 The staged comparison. Write `paths.ts` in the scratch folder. As localtest2, through the service functions (`savePost`, `takeDownPost`, `prepareList` with `createList`, `writeCopy`, `deleteList`, `bumpPerson`, `editList`), it runs these steps, with localtest1 hiding the post first (`hidePost`) where the step names a post:
  - (a) a Swap post of a have list and a want list;
  - (b) Edit post swapping its have list;
  - (c) Edit post dropping its have list into a Buy post;
  - (d) Sell with Also open to swaps, then Sell only;
  - (e) a Buy post of a list paired off Trade, with unpair;
  - (f) Take off Trade, then post again;
  - (g) the D3 and D2 merges, both posts hidden, as `hides-by-row` task 7.3 made them;
  - (h) a takeover;
  - (i) `list.create` on Trade linked to a paired target, and `list.copy`;
  - (j) `deleteList` of a paired lead with the want list on, then off, Trade;
  - (k) Bump;
  - (l) Open to saved off Trade through `list.edit`, then a post write on another post;
  - (m) Open to saved off Trade through `list.edit` on a want list paired with an off-Trade have list, then `list.create` of a have list on Trade linked to that want list, which turns it on.
  - (n) `list.create` of a list on Trade linked to an off-Trade partner, twice: once while the person's last bump is under 24 hours old, and once while it is over (the person's bumps set back past 24 hours in a local transaction before that run, on both builds alike, a change 8.1's approval names). Both lists' `bumped_at` must equal the old build's to the microsecond, compared as raw values, not as step labels: the under case takes the last bump, the over case `now()`. This proves decision 4's single `bumpAt` read equals what `tradeColumns(true)` wrote.

  After each step it writes the two accounts' lists, rows, hides and offers' `post_id`, with:
  - row ids replaced by labels in order of first appearance;
  - timestamps written during the run replaced by the step that wrote them.

  It also asserts that each step wrote at most one distinct bump time, the one it read as `bumpAt`, so a format or precision slip is not hidden by the labels. Run it:
  - on `70c82fb3`, in a detached scratch worktree outside the repo (`git worktree add --detach /private/tmp/claude-501/planner-shared/old 70c82fb3`, then `scripts/setup-worktree.sh` there), as `before.json`;
  - restore `record.json` with one local SQL transaction;
  - run it on the new code, as `after.json`.

  Compare. The only differences allowed:
  - steps (b) and (c): the edited post's row keeps its label and holds the new lead, the displaced lead is in a newly labelled off row, and localtest1's hide stays on the edited row;
  - from step (l) on: any off-Trade side whose Open to lagged its list keeps the row's `match_have` and `match_sale`, where the old build copied the list's into every such row on the person's first write. Step (m)'s turned-on side must be identical: the list's own Open to.

  Both carry forward: from (b) on, later steps may show the same label swap and localtest1's hide on the edited row, and nothing else. Any other difference stops the group. Record the result in As built, then remove the scratch worktree (`git worktree remove`).
- [x] 8.4 During 8.3's run on the new code, run the old and new drift scripts after every step. Both read zero on checks 1 to 7. Note 1's count after (b) and (c) is information.
- [x] 8.5 Copy a script into `apps/worker/.planner-shared/` that runs `fetchPairs` over all entries and `loadContext` on them, on the new code. Check that every pair's `partnerSale` and `partnerWantsSwaps` equal the `sale` and `wantsSwaps` that `loadContext` gives that partner list. Record the pair count. Remove the copy.
- [x] 8.6 The browser pass, local, as localtest1 viewing localtest2, on the dev server on `.env.local`. Use the `browser-use` CLI (`browser-use <<'PY' … PY`) on the automation Chrome:
  - **Setup:** `BU_CDP_URL=http://127.0.0.1:9333`, profile `~/.chrome-automation`. Start it per `~/.claude/CLAUDE.md` if `curl -s http://127.0.0.1:9333/json/version` fails.
  - **Tabs:** open and drive a tab of your own by target id. For each account, use an isolated context (`Target.createBrowserContext` and `Target.createTarget`).
  - **Sign-in:** wait until the page has hydrated before submitting a sign-in. If a credential reaches a URL or log, delete that log and tell the owner.
  - **Briefs:** put these rules in any brief given to a subagent.

  The steps:
  - (a) localtest1 hides localtest2's Swap post on Browse.
  - (b) localtest2 opens Edit post in the composer, swaps the have list and saves. For localtest1, the post stays off Browse and For you, and `/account/hidden` lists it once by its new lists. localtest2's My posts shows the edited post. `trade.myPosts`' `postId` for it is the one recorded before the edit.
  - (c) localtest2 edits it into a Buy post of its want list. It stays hidden, with the same `postId`.
  - (d) localtest2 posts the swapped-out have list on its own. localtest1 sees it on Browse with Hide post.
  - (e) Take off Trade, then Post it: the post comes back hidden for localtest1.
  - (f) No console error from the app.

  Run the new drift script after each step: zero. Record each step in As built.
- [x] 8.7 Restore `record.json` (lists, rows, hides, offers' `post_id`) in one local SQL transaction. Check:
  - the re-read is byte-identical to the record;
  - drift reads zero;
  - `apps/worker/.planner-shared/` is gone;
  - `git status --short` shows only this change's files.

  The scratch folder stays until the owner has seen the results.

## 9. Rollout (the owner)

- [x] 9.1 The owner commits and pushes, and CI passes and moves `:latest`. Nothing is deployed yet.
- [x] 9.2 With a go-ahead, right before web comes up, read-only on production:
  - the old drift script, checks 1 to 7 at zero;
  - the new drift script, checks 1 to 7 at zero;
  - the baseline counts: `trade_post` rows, lists with `discoverable`, and note 1's offers;
  - `SHOW TimeZone`, expected `UTC`: the session time zone sets the offset in the bump text the planner copies (`lockPosts`' `bumpAt` and the bump columns).

  Any other number stops the rollout. Record them in As built.
- [x] 9.3 The owner brings up web, and rebuilds and brings up the worker from the same commit on the VPS, in either order (design decision 11). Record the time each serves.
  - **Rollback:** web and worker `70c82fb3`, at any time.
- [x] 9.4 With a go-ahead, read-only on production:
  - the new drift script, checks 1 to 7 at zero;
  - the counts of 9.2, with any difference explained by writes since.

  Record them, and the rollback floor, in As built. Delete the scratch folder once the owner has seen the results.

## 10. Agent docs

- [x] 10.1 Using `writing-for-agents`:
  - `packages/db/AGENTS.md`, Trade posts:
    - replace "which `writePosts` … keeps equal to its lists while a list is in at most one row" with "written per row from the write, with `lists.discoverable` and `bumped_at` derived from the rows", and "the pure `planPostWrite`" with `planPostChange`;
    - replace "Edit post swapping or dropping a post's have or sale list is not a lead change: the post gets a new row" with Edit post keeping its row;
    - say that the planner holds a list in several rows and that `planPost` and check 2 keep production at one.
  - Check `apps/worker/AGENTS.md` (6.2) and `packages/api/docs/trade.md` (4.4) against the code as built.
  - `packages/api/AGENTS.md`, `apps/web/AGENTS.md` and the root `AGENTS.md`: check them against the diff. State in As built that none of their conventions, traps or workflows changed, or update the one that did.

  Verify that `bun run lint --filter=@repo/db` and `bunx oxfmt --check` pass.

## Workflow follow-up

- Archive with `/opsx:archive` once group 9 is recorded.
- Then propose `trade-post-state-contract`, carrying this design's Inputs for later phases.

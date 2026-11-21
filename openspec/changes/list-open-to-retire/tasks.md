## Ground rules

- **Git.** No task commits, pushes or uses `git stash`: the stash stack is shared by every worktree and holds 34 entries. A checkpoint is a WIP commit, made only with the owner's approval. The work happens in the `shared-lists-orca` worktree. A throwaway checkout of another build goes outside the repo through `git worktree add --detach`, and is removed with `git worktree remove` after.
- **Production.** The root `.env` is production, and every local run uses `.env.local`. The main Postgres app database is `main`.
  - A production read runs only with the owner's go-ahead for that run. It uses `PGOPTIONS='-c default_transaction_read_only=on'` and never prints a connection string or secret.
  - The owner deploys, approves each migration, and runs migrate through Dokploy (the migrate app), never `docker compose run`.
- **Local data.** The owner approves three things once, at task 6.2: applying the migrations to the local database, test rows on `localtest1@local.invalid`, `localtest2@local.invalid` and `localtest5@local.invalid`, and the local sessions the pass needs. Task 6.2 puts back what it changed.
- **"Checks pass"** means:
  - for `@repo/api` and `@repo/db`: `bun run lint --filter=<pkg>`, `bun run typecheck --filter=<pkg>` and `bun run build --filter=web`;
  - for the worker: `bun run lint --filter=worker`, `bun run typecheck --filter=worker` and `bun test apps/worker/src/import-boundary.test.ts`;
  - for the web: `bun run lint --filter=web`, `bun run typecheck --filter=web` and `bun run build --filter=web`.
- **Tests** cover pure modules only, never the database.
- **React.** Before the first `.tsx` edit, load `vercel-react-best-practices`: the repo hook `require-react-skill.ts` holds the edit until it is loaded, in every session and subagent. Group 5 removes UI and adds none, so the Look in `apps/web/AGENTS.md` needs nothing new.
- **Comments** state only a non-obvious why.
- **Scratch files** live in `/private/tmp/claude-501/open-to-retire/`. A script that needs `@repo/*` is copied into `apps/worker/.open-to-retire/` only to run, and removed after.
- **The drift script** does not change in this change. It runs from `apps/worker`:

  ```
  PGOPTIONS='-c default_transaction_read_only=on' bun run --env-file=../../.env --env-file=../../.env.local src/script/trade-post-drift.ts
  ```

  Drop the second `--env-file` for production.

## 1. One rule, from the rows

- [x] 1.1 In `packages/api/src/lib/trade-post-state.ts`, as design decision 1 gives it:
  - `SideList` becomes `{ id, listType }`;
  - `sideStateOf` reads a want list's Open to and a sale list's `takes_swaps` from the row, on Trade or off, and the defaults for any other list;
  - add `listStateOf(rows, list)`: the union of its on sides, else of all its sides in a row, else the default.

  Add unit cases for both: a want list on and off in its row, a sale lead, a have list, a list in two rows, and a list in none. Verify with `bun test packages/api/src/lib`. Checks pass for `@repo/api`.
- [x] 1.2 In `packages/api/src/lib/trade-sql.ts`:
  - `onTradeRowsSql`'s and `sideStateSql`'s `ELSE` arms become the default constants;
  - `listTradeStateSql` becomes one subquery per field in three tiers (design decision 1).

  In `trade-sql.test.ts`, pin the three texts and lock `sideStateSql` to `sideStateOf` and `listTradeStateSql` to `listStateOf` with tables, as the module's other twins are locked. Checks pass for `@repo/api`.

## 2. Writers stop writing the list

- [x] 2.1 In `packages/api/src/lib/trade-post-rows.ts`:
  - drop the three fields from `TradeListState` (`:266-274`);
  - `rowStateOf` takes the intent, else the old row, else the default (`:436-460`);
  - update its doc comment.

  Update `trade-post-rows.test.ts`, with one case for a turn-on with no intent and no row (the default) and one with an old row (the row). Update `trade-post-rows.model.test.ts` as design decision 10 lists. Verify with `bun test packages/api/src/lib/trade-post-rows.test.ts packages/api/src/lib/trade-post-rows.model.test.ts`: every count still meets its floor. Checks pass for `@repo/api`.
- [x] 2.2 In `packages/api/src/services/list/shared.ts`:
  - `lockTradeLists` and `tradeState` stop reading the three columns;
  - `lockPosts` gives each locked `PlanList` its values from `listStateOf` over the rows it reads.

  In `services/trade/post.ts`, delete `savePost`'s two list writes (`:41-52`), keeping the sides it passes. In `packages/api/docs/trade.md`, Trade posts, rewrite these sentences to the new rule:
  - "Open to and `takes_swaps` come from the intent, else from the list…";
  - "`savePost` still writes a picked want list's own Open to…";
  - "`list.edit` writes Open to and `takes_swaps` only off Trade…";
  - the post-reader rule's "off Trade, or for any other list, the list's own";
  - the list-reader rule's "else its own", and "the list's own Open to for list objects, `list.edit`, `writeList`, `savePost`'s list write and the planner's fallback".

  Checks pass for `@repo/api`.
- [x] 2.3 Inputs and the list writers (design decisions 2 and 3):
  - `schemas/list.ts`: `createListInputSchema` loses `matchSale`, `matchHave` and `takesSwaps`; `editListInputSchema` loses `openTo` and `saleOpenTo`;
  - `services/list/create.ts`: `checkLinkedList` reads the partner through `listTradeStateSql`, `writeList`'s re-check passes the default as the new list's own, and the insert sets none of the three;
  - `services/list/edit.ts`: delete `openToColumns`, `takesSwapsColumn`, both refusals and the `guardsPair` lock, so every save is one `UPDATE`;
  - `schemas/open-to.ts`: delete `resolveOpenTo`, `openToEdit`, `saleOpenToEdit` and their types, and `saleOpenToOf` once group 5 no longer imports it.

  Add a case in `schemas/list.test.ts`: an old tab's create body, with the three keys, and its edit body, with `openTo`, parse to data without them. Update `open-to.test.ts` and `list-pair.test.ts`. In `docs/trade.md`, rewrite the "Which lists swap, and Open to" bullets that name `resolveOpenTo`, `openToEdit` and `saleOpenToEdit`. Checks pass for `@repo/api`.

## 3. Readers

- [x] 3.1 Drop the list's own columns from:
  - `feedListColumns` (`services/trade/feed/entries.ts:28-30`);
  - `resolveTradeSides`' list read (`services/trade/matches/recount.ts:47-49`), and `viewerPostOf`'s input type (`lib/trade-rank.ts:59`);
  - the report's `snapshotColumns` (`services/moderation/report.ts:74-76`), filling `SnapshotList` from `sideStateOf`, and the defaults for a list in no row.

  `postSnapshot`'s shape stays. Update `trade-rank.test.ts` and `trade-posts.test.ts` where they build `SideList`. Checks pass for `@repo/api`.
- [x] 3.2 Candidates (`services/trade/matches/candidates.ts:73-98`), as design decision 7 gives it:
  - `my_side_flags` reads every side of the viewer's rows, with `coalesce(bool_or(x) FILTER (WHERE side.on_trade), bool_or(x))`;
  - `my_want` and `my_have` take `coalesce(f.x, <default>)`, still by `LEFT JOIN` onto `lists`.

  Keep the comment on why the join is `LEFT`. Update the Can swap paragraph of `docs/trade.md` if it names the coalesce. Checks pass for `@repo/api`.
- [x] 3.3 Want alerts (`apps/worker/src/job/want-alerts/pairs.ts:62-104`):
  - `list_flags` is built from every side of every `trade_post` row, in decision 7's two tiers;
  - `wf` and `olf` take `coalesce(flags, <default>)`;
  - rewrite the comments on `list_flags`.

  `context.ts` keeps its calls. In `apps/worker/AGENTS.md`, Want alerts, say where `list_flags` reads from and why. Checks pass for the worker.
- [x] 3.4 Verify:
  - `grep -rnE "lists\.(matchHave|matchSale|takesSwaps)|l\.(match_have|match_sale|takes_swaps)|ol\.takes_swaps|wl\.match_" packages/api/src apps/worker/src` hits nothing outside tests;
  - every remaining `match_have`, `match_sale` or `takes_swaps` is a `trade_post` column or a CTE's column.

  Record the grep in As built. Checks pass for `@repo/api` and the worker.
- [x] 3.5 List objects (design decision 4, Open Question 1).
  - **If the owner answers yes:** `fetchOwnedLists`, `readList`, `linkedListWith` and `findOwnedList` (`services/list/read.ts`) read every row each list leads or is the want list of, with its state columns, on the joins they already make (`pairWith`), and fill `matchSale`, `matchHave` and `takesSwaps` with `listStateOf`. `toPublicList` passes them on, and `list.find` returns them beside the row. In `schemas/list.ts`, `baseListSchema`'s three fields get a doc comment: what the list's posts are open to.
  - **If no:** remove them from `baseListSchema` and the reads (`list.find` included), and add `postOpenTo` (`{ matchHave, matchSale, takesSwaps }`), filled the same way.

  Either way no per-list SQL subquery is added; if one is, say so in As built, and task 7.1 times `user.currentUser`'s read. Checks pass for `@repo/api`.

## 4. Schema and step 1's migration

- [x] 4.1 In `packages/db/src/schema.ts`:
  - remove `lists.matchSale`, `matchHave` and `takesSwaps` (`:102-107`) and the checks `lists_open_to_something` and `lists_takes_swaps_sale_only` (`:128-129`);
  - update `tradePost`'s comment (`:253-260`): the row is the only copy of Open to.

  Run `bun run --filter=@repo/db db:generate --name retire_list_open_to`, then replace its `migration.sql` with:
  - the `lock_timeout` header;
  - a comment in place of the generated column and constraint drops: they stay until step 2, since the build live while this runs still writes them, and their defaults satisfy both checks;
  - design decision 5's `LOCK TABLE` and its three `UPDATE`s, unless the owner answered no to Open Question 2.

  In `packages/db/AGENTS.md`, Trade posts, record:
  - that the rows are the only copy of Open to;
  - step 1's migration and its copy;
  - that the columns and checks stay until step 2;
  - that from step 1's deploy a rollback needs decision 8's reconcile.

  Verify:
  - one new folder under `packages/db/migrations`, and a second `db:generate` finds no change;
  - `bun run typecheck` from the root is clean, which catches typed readers only (task 3.4's grep catches raw SQL).

  Checks pass for `@repo/db`.

## 5. Web

- [x] 5.1 Load `vercel-react-best-practices` first. Then, as design decision 9 gives it:
  - `features/list/list-form.tsx` loses `showOpenTo` and both fields (`:16-18`, `:37`, `:49`, `:158-168`);
  - `list-form-fields.tsx` loses `OpenToRadios`, `OpenToField` and `SaleOpenToField` (`:102-223`) and their imports;
  - `list-draft.ts` loses the draft's three fields, and `toEditInput` loses `storedOpenTo` and `storedSaleOpenTo`;
  - `create-list-dialog.tsx` drops `alsoSwap: input.takesSwaps === true` (`:123`) and `showOpenTo` (`:147`);
  - `edit-list-dialog.tsx` drops the stored values (`:37`, `:128-141`, `:153`, `:169`);
  - `copy-list-dialog.tsx` (`:127`) and `copy-draft.ts` (`:16-21`, `:33-44`) carry no Open to;
  - delete `list-open-to.ts`, its test, and `ListOpenToBadge` (`list-type-badge.tsx:68-101`) with its uses (`list-header.tsx:46`, `:95`; `list-rows.tsx:41`, `:144`);
  - delete `OPEN_TO_LABEL` and `SALE_OPEN_TO_LABEL` (`list-type-labels.ts:21-30`) if nothing else imports them.

  Update `list-draft.test.ts` and `copy-draft.test.ts`. Checks pass for the web.
- [x] 5.2 The web's readers of list objects' Open to (design decision 4):
  - **if Open Question 1 is yes:** `list-post-tags.ts` and `plan-list.ts` stay as they are; confirm their tests still pass;
  - **if no:** they read `postOpenTo` (with `?? defaults` for an open tab's cached list), and their tests change with them.

  Checks pass for the web.
- [x] 5.3 Remove the ten message keys design decision 9 lists from `apps/web/messages/en.json`, `ko.json` and `ja.json`. Verify:
  - `grep -rn "list_open_to_\|list_sale_open_to_" apps/web/src` (outside `paraglide/`) is empty;
  - `match-help.tsx` and `trade-line.tsx` still compile.

  In `apps/web/docs/trade.md`, Post composer, delete the clause saying Edit list's pencil "also hides a want or sale list's Open to…". Checks pass for the web.

## 6. Local proof

- [x] 6.1 From the root:
  - `bun run check` and `bun run build --filter=web` exit 0;
  - `bunx oxfmt --check` is clean;
  - task 3.4's grep, and `grep -rnE "matchHave|matchSale|takesSwaps|openTo|saleOpenTo" apps/web/src --include='*.ts*'` (outside `paraglide/` and tests), hit only post state (`trade-post` schemas, `plan-list.ts`, `list-post-tags.ts`, the composer).

  Record both greps in As built.
- [x] 6.2 With the owner's one approval:
  1. Run the drift script read-only on the local database: 0 on checks 1 to 7. Run task 7.1's constants count locally too, and record it.
  2. Save, read-only, to the scratch folder: the three accounts' lists (with the three columns), rows, hides and sessions. Then save localtest1's `trade.people` (no filter, Any, Mutual), `trade.mutualCount` and `trade.tabCounts`, and a dry want-alerts run (`fetchPairs`, `loadContext`, `selectAlerts` over a fixed range of entry ids), all from `0129b5c4` in a throwaway worktree, before step 3, so the baseline is the old build on the same data.
  3. Run decision 5's counts (task 7.1's statements) locally, then apply step 1's migration (`bun run --filter=@repo/db db:migrate`; the guard refuses a non-local `DATABASE_URL`). The counts read 0 after.
  4. Run the dev server from this worktree on `.env.local`, on a free port with `SITE_URL` set for that process. Drive it with the `browser-use` CLI (`browser-use <<'PY' … PY`), never `agent-browser`:
     - the automation Chrome only, on port 9333 through `BU_CDP_URL=http://127.0.0.1:9333`. If `curl -s http://127.0.0.1:9333/json/version` fails, start it with `open -na "Google Chrome" --args --user-data-dir="$HOME/.chrome-automation" --remote-debugging-port=9333`, then `browser-use --reload`;
     - a tab of your own, driven by target id;
     - each account in its own isolated context (`Target.createBrowserContext` + `Target.createTarget`);
     - sign in only after the page has hydrated, or by `fetch` from the loaded page, so no credential reaches a URL, the history or the dev-server log. `localtest5` has no password: sign in with a local session row. If a credential leaks anyway, delete the log that holds it and tell the owner to rotate it.

  Then, with drift at 0 after each step that writes:
  - (a) **Create.** As localtest2, the create form for a want list and a bound sale list shows no Open to or Sale choice. Each saves, and `GET /api/v1/lists/{slug}` gives Swaps or buying and Sell only (if Open Question 1 is yes). Neither header nor row shows an Open to badge.
  - (b) **Edit and Copy.** Edit list on an off-Trade want list shows no choice and saves. Copy as new list of a want list in a Buy post shows no choice, and the copy reads Swaps or buying.
  - (c) **Composer.** New post with a never-posted want list starts with "also pay" ticked, and with a sale list, "Also open to swaps" unticked. Then:
    - Edit post on a Buy post starts on Buy, and on a Sell or swap post with it ticked;
    - take a Swaps only post off Trade: For you as its owner still counts it as Swaps only;
    - Post it starts from that post.
  - (d) **For you.** As localtest1, `trade.people`, `mutualCount` and `tabCounts` equal step 2's saved outputs. A difference must trace to a list in no row with a non-default value (decision 6): count those locally and name them.
  - (e) **Want alerts.** The dry run equals step 2's, on the same rule.
  - (f) **Report and staff.** As localtest1, report a post of localtest2's: the snapshot carries the post's tags and Open to. The moderator console's reads show the post, read through the services as task 6.2 of `trade-post-reads-by-row` did.
  - (g) **Public reads.** `GET /api/v1/lists/{slug}` and `GET /api/v1/profiles/{address}/lists` carry the fields by Open Question 1's answer, and `/api/v1/spec.json` agrees. A Buy-posted want list reads `matchHave` false.
  - (h) **Old tab.** From a signed-in page, `fetch` `list.edit` with `openTo: "buying"` on an off-Trade want list. It answers 200, the other fields save, and the row's Open to is unchanged. `list.create` with `matchSale: false` saves a list that reads Swaps or buying.
  - (i) **Errors.** No console error or server error on the pages visited, apart from known harmless notices (Centrifugo 403s off its allowed port, the ResizeObserver notice).

  Then put back what the pass changed:
  - delete the lists, reports and sessions it created;
  - restore the saved lists and rows column for column;
  - read them again and compare with the saved files;
  - stop the dev server and close the contexts.

  The local database keeps step 1's migration. Record each step's result in As built.

## 7. Step 1 rollout

- [ ] 7.1 **G1**, read-only, with a go-ahead, after the push and before step 1's migrate:
  - **Drift:** checks 1 to 7 at 0.
  - **The constants (design decision 1):** information for the owner; no reader takes them.

    ```sql
    SELECT count(*) FILTER (WHERE list_type <> 'want' AND NOT (match_have AND match_sale)) AS non_want_not_both,
           count(*) FILTER (WHERE list_type <> 'sale' AND takes_swaps) AS non_sale_swaps
    FROM lists;
    ```

  - **Decision 5's counts:** each `UPDATE`'s `WHERE` as a `SELECT count(*)`. Also count the rows its guards skip: an off want side whose list is not `match_have`, and an off paired sale lead whose list is not `takes_swaps` while the row is.
  - **Decision 6's counts:** want lists in no row whose Open to is not Swaps or buying, and bound sale lists in no row with `takes_swaps`, each with the number of owners. "In no row" is `NOT EXISTS` a `trade_post` row with the list as lead or want list.
  - **List pages that change at deploy:** a list object's `matchSale`, `matchHave` and `takesSwaps` come from the list today and from its rows after (design decision 4). Count, split on Trade and off, the want sides whose row's Open to differs from the list's own and the sale leads whose row's `takes_swaps` differs from the list's own:

    ```sql
    SELECT l.list_type, s.on_trade, count(*) AS changes
    FROM trade_post tp
    CROSS JOIN LATERAL (VALUES (tp.lead_list_id, tp.lead_on_trade), (tp.want_list_id, tp.want_on_trade))
      AS s(list_id, on_trade)
    JOIN lists l ON l.id = s.list_id
    WHERE (l.list_type = 'want' AND (tp.match_have, tp.match_sale) IS DISTINCT FROM (l.match_have, l.match_sale))
       OR (l.list_type = 'sale' AND tp.takes_swaps IS DISTINCT FROM l.takes_swaps)
    GROUP BY 1, 2 ORDER BY 1, 2;
    ```

    - **On Trade: 0 expected.** `savePost` writes the row and the list together, so a side on Trade never differs. Any on-Trade count stops the rollout for the owner.
    - **Off Trade:** before migrate it is decision 5's three `UPDATE` counts plus the rows their guards skip. What changes at deploy is what the copy leaves: it must equal the guard counts above, and the same query run at G2 (task 7.3) must give that number for off Trade and 0 on Trade.
  - **Timing (design decision 7).** Every read below runs on the new build (this worktree) and the old one (`0129b5c4`, from `git worktree add --detach /private/tmp/claude-501/open-to-retire/old 0129b5c4` with `bun install`, removed after), three runs each, the first cold, under `PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=60000'`:

    | Read | For | Script |
    | --- | --- | --- |
    | `fetchTradeCandidates` | the three heaviest For you users (query below) | `cand-explain.ts` |
    | `fetchPairs` | the last 1,000 entries | `pairs-explain.ts` |
    | `fetchBumpPeople` | each of the three users as `VIEWER` | `feed-explain.ts` |
    | `fetchOwnedLists` (`user.currentUser`, `list.profileLists`) | the account with the most lists, by `userId`, and the profile with the most lists, by `profileAddress` | `lists-explain.ts` |
    | `loadContext` (`listTradeStateSql` per list) | the pairs `fetchPairs` found | `context-explain.ts` |

    - Find the three heaviest For you users by entries on Trade:

      ```sql
      SELECT l.user_id, count(*) AS entries FROM list_entries e JOIN lists l ON l.id = e.list_id
      WHERE l.discoverable AND l.list_type IN ('have', 'sale', 'want')
      GROUP BY l.user_id ORDER BY entries DESC LIMIT 3;
      ```

      and the account and the profile with the most lists:

      ```sql
      SELECT user_id, count(*) FROM lists GROUP BY 1 ORDER BY 2 DESC LIMIT 1;
      SELECT profile_address, count(*) FROM lists WHERE profile_address IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 1;
      ```

    - Copy `/private/tmp/claude-501/reads-by-row/cand-explain.ts` into the scratch folder. From `explain.ts` beside it, write `pairs-explain.ts`, `feed-explain.ts`, `lists-explain.ts` and `context-explain.ts`, each with `cand-explain.ts`' guards: it refuses unless `transaction_read_only` is on, runs under `SET LOCAL statement_timeout` of 60 s, and falls back to a plain `EXPLAIN` past it. None may import a module whose chain reaches `services/redis` or `env.ts` against the root `.env`: build the read's statement from its query module, or `toSQL()` it, and explain that. If `/private/tmp/claude-501/reads-by-row/` is gone, rewrite them from `trade-post-reads-by-row`'s As built ("For production").
    - Record planning and execution time, buffers, and the estimated and actual rows, with loops, of `my_side_flags`, `my_want`, `partner_lists`, `list_flags` and the list reads' laterals.
    - **Watch for:** a CTE whose estimate falls to 1 row and that is scanned more than once; `my_side_flags` and `list_flags` aggregated once (`loops=1`) and never the inner side of a nested loop; the list reads' `json_agg` laterals at one loop per list, not per list times rows.
  - **The rollout stops** for the owner when:
    - any drift check is above 0;
    - a new read's warm median runs more than 1.5 times the old build's for the same user;
    - a new plan scans a CTE more than once with an estimate of 1 row where the old plan's was larger.

  Decision 5's and 6's counts are for the owner (Open Questions 2 and 3). Record all of it in As built.
- [ ] 7.2 The owner runs migrate through Dokploy (`retire_list_open_to`), then brings up web and rebuilds and brings up the worker from the same commit. Note when migrate started and when web came up (UTC).
- [ ] 7.3 **G2**, read-only, with a go-ahead, right after 7.2:
  - drift: checks 1 to 7 at 0;
  - task 7.1's list-page query: 0 on Trade, and off Trade the guard counts G1 recorded;
  - decision 5's window: the copy's three `WHERE` clauses as a `SELECT` of list ids and `updated_at`. Each hit goes to the owner, who may approve the same statements narrowed to those ids;
  - one look at `/trade`, For you and a list page as the owner;
  - Sentry: no new issue in the 30 minutes after the deploy.

  Record the rollback floor in As built: the previous images (≥ `8b05487c`), then decision 8's reconcile after its read-only count.

## 8. Step 2: drop the columns

- [ ] 8.1 Once step 1 has served for a day with G2 clean:
  1. Run `bun run --filter=@repo/db db:generate --custom --name drop_list_open_to`.
  2. Write its SQL as design decision 8, step 2 gives it, with a comment on why it is safe now.
  3. Apply it locally (6.2's approval covers it). Check that `pg_constraint` holds neither check, and `information_schema.columns` none of the three columns.
  4. Load the list page, Browse, For you and the composer as localtest2, with no error, and run the drift script: 0.
  5. In `packages/db/AGENTS.md`, Trade posts, record the drop, and that no web or worker build older than step 1's commit can run.

  Checks pass for `@repo/db`.
- [ ] 8.2 The owner commits and pushes 8.1, then confirms that the web and worker images both run step 1's commit or later.
- [ ] 8.3 **G3**, read-only, with a go-ahead: drift at 0, and the three columns still present in `main`. Then the owner runs migrate alone through Dokploy. **G4:**
  - drift at 0;
  - the columns and checks are gone;
  - no new Sentry issue in 30 minutes.

  Record the new rollback floor in As built.

## 9. Agent docs

- [ ] 9.1 With `writing-for-agents` loaded, check what groups 2 to 5 and 8 wrote against the code as built:
  - `packages/api/docs/trade.md`: Which lists swap, and Open to; Can swap; Trade posts;
  - `packages/db/AGENTS.md`, Trade posts;
  - `apps/worker/AGENTS.md`, Want alerts;
  - `apps/web/docs/trade.md`, Post composer.

  State that `packages/api/docs/lists.md`, `packages/api/AGENTS.md`, `apps/web/AGENTS.md` and the root `AGENTS.md` need no change, or fix them.

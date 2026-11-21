## Context

See proposal.md for why. This is change 6 of the shared-lists chain:

`trade-post-state` → `trade-post-hides-by-row` → `trade-post-planner-shared` → `trade-post-state-contract` → `trade-post-reads-by-row` → **this change** → `post-id-inputs` → `offer-reads-post-id` → `shared-lists`.

Its scope is the "yes" branch of `trade-post-reads-by-row`'s Open Question 1, which the owner chose on 2026-11-21. Paths are under `packages/api/src/` unless they say otherwise. Line numbers are from `42498eab`. Its code is production's `0129b5c4`: the two later commits are docs and a migration that has already run.

**Where Open to lives today.**
- Each `trade_post` row holds the post's `match_have` and `match_sale` (its want side) and `takes_swaps` (a sale lead).
- `lists` holds a second copy. `trade.savePost` writes both (`services/trade/post.ts:41-52`).
- Off Trade, `list.edit` writes the list only (`services/list/edit.ts:22-47`), so an off side's row can lag (`docs/trade.md`, Trade posts).
- So today a post reader takes an off side from the list (`sideStateOf`, `lib/trade-post-state.ts:26-36`). A list reader takes its on sides' union, else the list (`listTradeStateSql`, `lib/trade-sql.ts:129-143`). A side turned on with no Open to in its intent takes the list's (`rowStateOf`, `lib/trade-post-rows.ts:436-460`).

## Inventory

A whole-repo grep for `match_have|match_sale|takes_swaps|matchHave|matchSale|takesSwaps|openTo|saleOpenTo|OpenTo|lists_open_to_something|lists_takes_swaps_sale_only` over `packages`, `apps` and `scripts`, outside `migrations/` and the generated `paraglide/`. `scripts/` holds only `setup-worktree.sh`. Below are the sites that read or write the `lists` copy, or whose meaning changes. Reads of `trade_post` columns that stay as they are are left out (`services/trade/lists.ts:81-83`, `shared.ts:99-101`, `:153-165`, `feed/query.ts:26-31`).

| Site | Now | After | Decision |
| --- | --- | --- | --- |
| `packages/db/src/schema.ts:102-107`, `:128-129` | the three columns and two checks | out of `schema.ts` at step 1; dropped at step 2 | 8 |
| `lib/trade-post-state.ts:18`, `:26-36` `SideList`, `sideStateOf` | an off side reads the list | a want or sale list reads its row; any other list reads the defaults | 1 |
| `lib/trade-sql.ts:53-56` `onTradeRowsSql` | `l.match_*` and `l.takes_swaps` for other list types | the default constants | 1, 7 |
| `lib/trade-sql.ts:81-114` `sideStateSql` | as `sideStateOf` | as `sideStateOf` | 1 |
| `lib/trade-sql.ts:116-143` `listTradeStateSql` | on sides' union, else the list | on sides' union, else all its rows', else the default | 1 |
| `lib/trade-post-rows.ts:266-274`, `:436-460` `TradeListState`, `rowStateOf` | the intent, else the list on a turn-on, else the old row, else the list | the intent, else the old row, else the default | 2 |
| `services/list/shared.ts:60-62` `lockTradeLists`; `:132-134` `tradeState` | read the list | `PlanList`'s values from the locked rows (`listStateOf`); `tradeState` drops them | 2, 3 |
| `services/trade/post.ts:41-52` `savePost` | writes the list | gone | 2 |
| `services/list/create.ts:39-67`, `:131` `checkLinkedList`; `:163-168` `writeList`'s check | the partner's and the input's | the partner's from its rows; the new list's own is the default | 3 |
| `create.ts:194-195` the insert | sets the three | sets none (the database defaults) | 2 |
| `services/list/edit.ts:9-12`, `:22-47`, `:65-72`, `:115-133` | Open to off Trade, its refusals and its lock | gone | 2 |
| `schemas/list.ts:191-196`, `:231-234` | input keys | removed, so stripped | 2 |
| `schemas/open-to.ts:35-98` `resolveOpenTo`, `openToEdit`, `saleOpenToEdit`, `saleOpenToOf` | create and edit rules | gone, unless still used | 2 |
| `schemas/list.ts:77-80`; `services/list/read.ts:57-59`, `:136-138`, `:202-204` | list objects carry the list's own | from the rows (Open Question 1) | 4 |
| `services/list/read.ts:310-323` `findOwnedList` (`list.find`) | the whole row | keeps the three, filled from the rows | 4 |
| `services/trade/feed/entries.ts:28-30` `feedListColumns`; `:44-46` | the list's own; `listTradeStateSql` | dropped; the new `listTradeStateSql` | 1 |
| `services/trade/feed/viewer.ts:75-82`; `matches/recount.ts:105-107` | `listTradeStateSql` | the same call, new rule | 1 |
| `services/trade/matches/recount.ts:47-49` `resolveTradeSides` | the list's own, for `viewerPostOf`'s off side | dropped (`sideStateOf` needs no list values) | 1 |
| `lib/trade-rank.ts:59-70` `viewerPostOf` | `sideStateOf(row, lead)` | the same call, new rule | 1 |
| `services/trade/matches/candidates.ts:73-98` `my_side_flags`, `my_want`, `my_have` | on sides' union, `coalesce` with the list | all of the viewer's rows in two tiers, `coalesce` with the default | 7 |
| `services/moderation/report.ts:74-76`, `:104-111` `snapshotColumns` | the list's own for a list in no row | dropped; `sideStateOf` and the defaults; the snapshot keeps its shape | 1 |
| `services/trade/feed/post-cards.ts:227`; `lib/report-post.ts:7-12` | `sideStateOf` and the snapshot's shape | unchanged | 1 |
| `apps/worker/src/job/want-alerts/pairs.ts:62-68`, `:82-104` `list_flags` | `on_trade`'s union, `coalesce` with the list | built from `trade_post` in two tiers, `coalesce` with the default | 7 |
| `apps/worker/src/job/want-alerts/context.ts:13-15`, `:27-28`, `:42-43` | `listTradeStateSql`, `sideStateSql` | the same calls, new rule | 1 |
| `apps/web/src/features/list/list-form.tsx:16-18`, `:37`, `:49`, `:158-168`; `list-form-fields.tsx:102-223` | Open to and Sale fields | gone | 9 |
| `apps/web/src/features/list/list-draft.ts:18`, `:34`, `:46-47`, `:54`, `:68-69`, `:105-109`, `:113-150`, `:242-249` | the draft's Open to; `openTo`, `saleOpenTo` | gone | 9 |
| `create-list-dialog.tsx:123`, `:147`; `edit-list-dialog.tsx:37`, `:128-141`, `:153`, `:169`; `copy-list-dialog.tsx:127`; `copy-draft.ts:16-21`, `:33-44` | send or carry Open to | gone | 9 |
| `list-open-to.ts` and its test; `list-type-badge.tsx:68-101` `ListOpenToBadge`, used at `list-header.tsx:46`, `:95` and `list-rows.tsx:41`, `:144`; `list-type-labels.ts:21-30` | the off-Trade badge | deleted | 9 |
| `apps/web/src/features/list/list-post-tags.ts:24-27`; `features/trade/plan-list.ts:14-16` | list objects' three fields | unchanged under Open Question 1's recommendation | 4 |

**Checked with no hits, and unchanged:**
- the drift script's checks (5 reads `discoverable`, 6 reads rows; `apps/worker/src/script/trade-post-drift.ts:86-93`);
- want alerts' newly-discoverable set (`apps/worker/src/job/want-alerts/index.ts:48-51`);
- the Discord format (`services/list/entry-view.ts`, `routers/list-utils.ts`) and the CSV export (`lib/list-csv.ts`, `services/list/export.ts`);
- the Marketplace, offers and the picker, which read `discoverable`.

**Tests that change:**
- `lib/trade-sql.test.ts`, `trade-post-rows.test.ts`, `trade-post-rows.model.test.ts`, `trade-posts.test.ts`, `trade-rank.test.ts`, `list-pair.test.ts`;
- `schemas/open-to.test.ts`, `list.test.ts`;
- `apps/web/src/features/list/list-draft.test.ts`, `copy-draft.test.ts`, `list-open-to.test.ts` (deleted).

## Goals / Non-Goals

**Goals:**
- Nothing reads or writes `lists.match_have`, `match_sale` or `takes_swaps`, and then they and their two checks are dropped.
- Every post reader and list reader takes Open to from the rows by one rule (decision 1).
- For every list in a row, every match, count, alert, tag and composer start equals today's. Step 1's copy (decision 5) makes the rows hold today's values.

**Non-Goals:**
- Lifting `planPost`'s refusal; post-id inputs; per-post list pages.
- An Open to for a list in no post (decision 6).
- Any change to `lists.discoverable`.

## Decisions

### 1. One rule, from the rows

**The defaults** are Swaps or buying for a want side (`match_have` and `match_sale` true) and Sell only for a sale lead (`takes_swaps` false). They are `trade_post`'s column defaults and the web's `EMPTY_DRAFT`. Every non-want list holds `true, true` today, and every non-sale list holds `takes_swaps` false (`resolveOpenTo`, `openToEdit` and `lists_takes_swaps_sale_only`). So those constants should equal what readers took from the list. No reader takes a non-want list's Open to or a non-sale list's `takes_swaps` anyway: candidates' `matched` passes have and sale lists' flags only into `they_want`, which keeps want lists (`candidates.ts:145-181`), and `TAG_WHERE`, `showsRatio` and `pickByOpenTo` read want lists. `match_sale` came and went once (`20261008120518_want_match_sale`, `20261010152345_drop_want_match_sale`), so G1 and the local pass count non-want lists that hold anything else. A non-zero count is information, not a stop.

**A post reader reads its row.** A list in row R reads its Trade state and bump from R. A want list reads its Open to from R, and a sale list its `takes_swaps`, whether the side is on or off. Any other list reads the defaults.
- The pure rule is `sideStateOf(row, list)`, and `SideList` becomes `{ id, listType }`.
- Its SQL twins are `sideStateSql` and `onTradeRowsSql`, whose `ELSE` arms become the constants.
- `trade-sql.test.ts` pins both texts and keeps the table that locks them to `sideStateOf`.
- **Why the off side may read the row now:** `list.edit` no longer writes Open to, `savePost` writes only rows, and step 1's copy puts each list's value into its off rows. The row is then the newest copy.

**A list reader takes three tiers.** These are the union of its sides on Trade, else the union of every side it has in a row, else the default. The type rule stays: a want list's Open to, a sale list's `takes_swaps`, the defaults for every other list.
- **`listTradeStateSql(alias, field)`** becomes one correlated subquery over the list's rows:

  ```sql
  CASE WHEN l.list_type = 'want' THEN coalesce((
    SELECT coalesce(bool_or(st.match_have) FILTER (WHERE <the list's side is on>), bool_or(st.match_have))
    FROM trade_post st WHERE st.lead_list_id = l.id OR st.want_list_id = l.id), true)
  ELSE true END
  ```

  The bump keeps its on-sides read.
- Its pure twin is `listStateOf(rows, list)`, new in `lib/trade-post-state.ts`. `lockPosts` uses it to give `planPost`'s `PlanList` its values (decision 3).
- `trade-sql.test.ts` pins the text and locks it to `listStateOf` with a table: a list on Trade, one off in a row, one in two rows, one in none.
- **Why every row's union off Trade:** with one row per list, it is the list's row, the post it was last in. For a shared list it is the union the on tier already takes.

### 2. Writers stop writing the list

- **`savePost`** drops its two list writes (`post.ts:41-52`). The composer always sends the want flags and the sale's `takes_swaps` (`composerWrites`, `schemas/trade-post.ts:81-120`), so every picked side gets an explicit value.
- **`rowStateOf`** takes the intent, else the row the list was the open list or sale lead of, else the default. The branch that takes the list on a turn-on from off goes, and `TradeListState` loses the three fields. Who turns a side on with no Open to:
  - `writeList` for a list created on Trade (`create.ts:204`). A new list has no row, so it takes the default.
  - the partner `writeList` turns on. It takes its old row, else the default.
  - New list in the composer creates the list off Trade, and Post sends the composer's choice.
- **The inputs.** `createListInputSchema` (so `list.copy`) loses `matchSale`, `matchHave` and `takesSwaps`, and `editListInputSchema` loses `openTo` and `saleOpenTo`.
  - **What an open tab sends after the deploy:** Create and Copy send the three keys, and Edit list sends `openTo` or `saleOpenTo` when its control changed.
  - `z.object` strips unknown keys, so each still validates and saves every other field.
  - Create and Copy save the defaults. Edit list leaves Open to as it is, because the post or the defaults own it now.
- **`list.edit`** loses `openToColumns`, `takesSwapsColumn`, both refusals (`edit.ts:65-72`) and the `guardsPair` lock (`:121-133`), its only reason to lock. Every save is one plain `UPDATE`.
- **`writeList`'s insert** sets none of the three. The database defaults satisfy both checks while they exist.
- `schemas/open-to.ts` loses `resolveOpenTo`, `openToEdit`, `saleOpenToEdit` and their types. `saleOpenToOf` goes too once the web no longer imports it. `openToOf`, `flagsOf`, `pickByOpenTo`, `pairRefusesOpenTo` and `offersSwaps` stay.

### 3. Pair refusals read the rows

`pairRefusal` (`lib/list-pair.ts`) keeps its codes and its signature. What it is given changes:
- **`checkLinkedList`**, before the transaction, reads the partner's three values through `listTradeStateSql`, not `lists`.
- **`writeList`'s re-check under the lock** reads the locked list, whose values come from `listStateOf` over `lockPosts`' rows.
- **The new list's own Open to** is the default. So a want list's create never draws `list_pair_buying_only`, and a sale list's own `takes_swaps` is false, as `writeList` passes it today.
- **`list_sale_links_sell_only`** now refuses a want list linking to a sale list that is in no Sell or swap post, including one never posted. The web never sends `linkedListId` on create (`toCreateInput` starts it null and no create form sets it), so only old tabs and API callers meet this.
- `list.edit`'s two refusals go with its Open to. The composer's refusals (`planPost`) don't change.

### 4. List objects (Open Question 1)

**Evidence that the web reads the three fields:**
- `listPostTags` (`apps/web/src/features/list/list-post-tags.ts:24-27`) draws the On Trade tags every visitor sees in the list header (`list-header.tsx:80`) and on list rows (`list-rows.tsx:236`).
- `toPlanList` (`apps/web/src/features/trade/plan-list.ts:14-16`) feeds:
  - the composer's start (`startForPost`, `editStart`, `startForList`, `schemas/trade-post.ts:399-465`, and `/trade/new`'s `resolveStart`);
  - Edit list's Trade line (`tradeLineOf`).
- They read `user.currentUser`'s lists (`fetchOwnedLists`), `list.findPublic` and the linked list (`linkedListWith`).
- An open tab's Edit list and Copy build their draft from `list.find` (`toDraft`, `list-draft.ts:242-243`, with no fallback) and validate it with `listDraftSchema`, which requires both flags as booleans (`list-draft.ts:68-69`; `edit-list-dialog.tsx:150`, `copy-list-dialog.tsx:105`). Without the fields on `list.find`, an open tab could not save Edit list or Copy at all.
- An open tab reads a missing field as `?? true` and `?? false`, which breaks two things:
  - it groups a Sell or swap pair as two posts;
  - its Edit post on a Buy post opens as a Swap that would also pay, which Post then saves.

**Recommended: keep the fields, filled from the rows.**
- `matchSale`, `matchHave` and `takesSwaps` on a list object and its `linkedList` become `listTradeStateSql`'s values. That is what the list's posts are open to: the union on Trade, else every post's, else the default.
- **How they are read.** `user.currentUser` loads on every page, so no per-list subquery is added. `fetchOwnedLists`, `readList` and `findOwnedList` already join each list's rows (`pairWith`'s `postLed` and `postWanted`, `read.ts:82-85`, `:313-314`). They read those rows with their state columns, every row rather than the lowest, and fold them with `listStateOf` in TS. `linkedListWith` does the same for the partner. With one row per list, that is one more column set on joins the reads make today. If the implementation adds a per-list SQL subquery instead, G1 times `user.currentUser`'s read for the account with the most lists (task 7.1).
- **`list.find` keeps them too**, filled the same way, for the open tabs above. The new web no longer reads them there, since the draft loses Open to.
- **What the web gets:**
  - The tags and Edit post read the post, as the owner asked ("Edit post starts from the post").
  - Post it on a list whose post is off Trade starts from that post, as the Trade line's "posting it again brings back the same post" says.
  - A list in no post starts from the defaults ("a new post starts from today's defaults").
- `api-openapi` gains a requirement saying what the fields mean. No output, public or `/rpc`, loses a field.

**The owner's branch, if chosen:** the three leave list objects on every route in the proposal's table, and the web needs a post-derived field in their place. Tasks 3.5 and 5.2 change:
- list objects gain `postOpenTo` (`{ matchHave, matchSale, takesSwaps }`), read and folded the same way, with the same three tiers, so Post it on an off-Trade post still starts from that post;
- `list-post-tags.ts` and `plan-list.ts` read it;
- the deploy accepts that tabs opened before it misread posts until they reload.

### 5. Step 1 copies the list's own into its off rows (Open Question 2)

Today an off side's row can lag the list. After this change the row is what every reader takes, so without a copy an off-Trade Open to the owner set in Edit list would revert to the row's older value.

**Step 1's migration copies the lists into their off sides**, after the usual header, as `trade_post_state_reconcile` did:

```sql
SELECT set_config('lock_timeout', '3s', true);
LOCK TABLE "lists" IN EXCLUSIVE MODE;
-- a want side off Trade takes its list's Open to; a pair's want side keeps swaps
UPDATE trade_post tp SET match_have = l.match_have, match_sale = l.match_sale
FROM lists l
WHERE l.id = tp.want_list_id AND NOT tp.want_on_trade AND l.match_have
  AND (tp.match_have, tp.match_sale) IS DISTINCT FROM (l.match_have, l.match_sale);
UPDATE trade_post tp SET match_have = l.match_have, match_sale = l.match_sale
FROM lists l
WHERE l.id = tp.lead_list_id AND l.list_type = 'want' AND NOT tp.lead_on_trade
  AND (tp.match_have, tp.match_sale) IS DISTINCT FROM (l.match_have, l.match_sale);
-- a sale lead off Trade takes its list's takes_swaps; a paired sale lead keeps swaps
UPDATE trade_post tp SET takes_swaps = l.takes_swaps
FROM lists l
WHERE l.id = tp.lead_list_id AND l.list_type = 'sale' AND NOT tp.lead_on_trade
  AND (l.takes_swaps OR tp.want_list_id IS NULL)
  AND tp.takes_swaps IS DISTINCT FROM l.takes_swaps;
```

- **Exact for the old build.** It writes both copies in `savePost`, and `list.edit` writes only the list off Trade. So for an off side, the list holds the newer value. The old build reads an off side from the list and an on side from the row, so the copy changes nothing it reads.
- **Checks hold.** A list's flags satisfy `lists_open_to_something`, so the row satisfies `trade_post_open_to_something`. `takes_swaps` is written only under a sale lead (drift check 6).
- **The pair guards** skip a paired want list whose own value is Buying only, and a paired sale lead whose own value is Sell only. The row keeps its value there. These are pairs saved before a pair had to take swaps. G1 counts them.
- **Locks.** `EXCLUSIVE` on `lists` queues every writer at `lockTradeLists`, and the old build's unlocked `list.edit` at its `UPDATE lists`, before either touches `trade_post`. The migration takes `lists` first, so it can't deadlock. If the lock times out, it is rerun.
- **The window** between migrate and web coming up: an old-build Edit list that changes an off-Trade Open to writes only the list. G2 lists every off side whose row differs from its list. The new build writes no list, so a hit right after the deploy is either such an edit or a new-build post taken down since. The owner reviews them, and may approve the same statements narrowed to those list ids.
- **Ruled out: copying at step 2.** By then the new build has written rows and not lists for a day, so a copy would overwrite newer values.

### 6. A list in no row takes the defaults (Open Question 3)

These lists have no row, so no copy is possible:
- a want list never posted, or unpaired while off Trade (rule 2 of `planPostRows`, `trade-post-rows.ts:116-120`);
- a have or sale list never posted and unpaired.

They read the defaults from step 1's deploy. A want list set to Swaps only or Buying only in Create or Edit list then matches as Swaps or buying in its owner's For you, Compare with and want alerts. A bound sale list set to Sell or swap matches as Sell only.

Keeping their values would need a row for every such list, which is planner work (`shared-lists`). G1 counts them, as `trade-post-state-contract` counted its decision 2.

### 7. Hot reads

The incident of 2026-11-21 (`trade-post-reads-by-row`, As built) sets the rule. Flags join real tables by `LEFT JOIN`, never a CTE join that hides row counts, and no CTE that is rescanned may fall to a one-row estimate.

| Read | Now | After |
| --- | --- | --- |
| `postsCte`'s `on_trade` (`onTradeRowsSql`), under every feed read, `computePostCounts`, candidates and `fetchPairs` | the list's columns for other list types | constants; same joins, same rows |
| candidates' `my_side_flags` (`candidates.ts:76-84`) | the viewer's on sides, grouped by list | every side of the viewer's rows (still by `trade_post_user_id_idx`), with `coalesce(bool_or(x) FILTER (WHERE side.on_trade), bool_or(x))` |
| candidates' `my_want`, `my_have` (`:85-98`) | `coalesce(f.x, l.x)` | `coalesce(f.x, <default>)`, still by `LEFT JOIN` onto `lists` |
| want alerts' `list_flags` (`pairs.ts:62-68`) | `on_trade`, grouped by list | every side of every `trade_post` row, two tiers as above, grouped by list |
| want alerts' `wf`, `olf` (`:84-104`) | `coalesce(flags, list)` | `coalesce(flags, <default>)`, still by `LEFT JOIN` |
| `listTradeStateSql` readers: `fetchViewer`, `recountPartners`, strips, `loadContext` | two subqueries per list at most | one subquery per field per list (decision 1) |
| list objects (`fetchOwnedLists` behind `user.currentUser` and `list.profileLists`, `readList`, `findOwnedList`) | the list's columns | the rows they already join, folded in TS (decision 4) |

- **`list_flags` must change source.** A recipient's list off Trade is in no `on_trade` row, so the off tier needs `trade_post` itself: about 1,600 rows and 3,200 sides. Locally, a `trade_post` source was 2 ms slower than `on_trade` (`trade-post-reads-by-row` As built, After review). The want side's type rule needs no list join there: `wl` is a want list and `ol` reads only `takes_swaps`, which a non-sale lead's row holds false.
- **The `(post_id, id) IN (listed_posts)` semi-join in `cand`** is not changed here. Its risk is recorded in `trade-post-reads-by-row`.
- **G1 times the three reads whose plans change**: `fetchTradeCandidates`, `fetchPairs`, and the feed's `fetchBumpPeople`, which reads `postsCte` (task 7.1).
- **No cache key changes.** The ranking caches hold counts of the same shape. A count that changes because of decision 6 lasts at most their 5-minute TTL.

### 8. Two steps

The house pattern is `retire_contract_columns`, then `drop_contract_columns` (`packages/db/AGENTS.md`, Trade posts).

**Step 1, `retire_list_open_to`, ships with the code.**
- `schema.ts` loses the three columns and the two checks, and the comment on `tradePost` (`:253-260`) says the row is the only copy.
- `db:generate` writes `DROP COLUMN`s and `DROP CONSTRAINT`s. Replace them with a comment: both stay, since the build live while the migration runs still writes them, and their defaults satisfy both checks for the new build's inserts.
- Add decision 5's copy.
- No index reads these columns, so no index changes.

**Step 2, `drop_list_open_to`**, is generated with `--custom` and touches `lists` only:

```sql
SELECT set_config('lock_timeout', '1s', true);
LOCK TABLE "lists" IN ACCESS EXCLUSIVE MODE;
ALTER TABLE "lists" DROP CONSTRAINT IF EXISTS "lists_open_to_something";
ALTER TABLE "lists" DROP CONSTRAINT IF EXISTS "lists_takes_swaps_sale_only";
ALTER TABLE "lists" DROP COLUMN IF EXISTS "match_have", DROP COLUMN IF EXISTS "match_sale", DROP COLUMN IF EXISTS "takes_swaps";
```

- Postgres drops a table constraint along with a column it involves. The explicit drops come first anyway, so the file states what it removes. Task 8.1 checks `pg_constraint` after applying it locally.
- **The file must not exist at step 1's push.** Migrate runs every unrecorded folder, so it would run while `0129b5c4` still reads the columns.
- **Precondition:** web and the worker both run step 1's commit or later. `0129b5c4` names the columns (`lockTradeLists`, `tradeState`, `readList`, `pairs.ts`), so it fails without them.
- If the lock times out, it is rerun at a quiet time.

**Rollback floors.**

| After | Web and the worker may go back to | Cost |
| --- | --- | --- |
| step 1's migrate | any build allowed today (≥ `8b05487c`) | none: decision 5's copy changes nothing the old build reads |
| step 1's deploy | ≥ `8b05487c`, for example `0129b5c4` | The new build wrote rows, not lists. The old build reads an off side and the composer's start from the list, and turns a side on from the list. So bring up the old images, then run the reconcile below at once, after a read-only count. It needs the owner's approval for that case. |
| step 2 | step 1's commit only | Going lower needs a migration that re-adds the three columns with their defaults and checks, then the reconcile |

**The reconcile** gives each list in a row its rows' value by decision 1's tiers:

```sql
UPDATE lists l SET match_have = s.match_have, match_sale = s.match_sale
FROM (SELECT side.list_id,
        coalesce(bool_or(tp.match_have) FILTER (WHERE side.on_trade), bool_or(tp.match_have)) AS match_have,
        coalesce(bool_or(tp.match_sale) FILTER (WHERE side.on_trade), bool_or(tp.match_sale)) AS match_sale
      FROM trade_post tp
      CROSS JOIN LATERAL (VALUES (tp.lead_list_id, tp.lead_on_trade), (tp.want_list_id, tp.want_on_trade))
        AS side(list_id, on_trade)
      WHERE side.list_id IS NOT NULL GROUP BY side.list_id) s
WHERE l.id = s.list_id AND l.list_type = 'want'
  AND (l.match_have, l.match_sale) IS DISTINCT FROM (s.match_have, s.match_sale);
UPDATE lists l SET takes_swaps = s.takes_swaps
FROM (SELECT tp.lead_list_id AS list_id,
        coalesce(bool_or(tp.takes_swaps) FILTER (WHERE tp.lead_on_trade), bool_or(tp.takes_swaps)) AS takes_swaps
      FROM trade_post tp GROUP BY tp.lead_list_id) s
WHERE l.id = s.list_id AND l.list_type = 'sale' AND l.takes_swaps IS DISTINCT FROM s.takes_swaps;
```

- **Its checks hold.** Each row has `match_have` or `match_sale` true, so either union does. `takes_swaps` is written only on sale lists.
- **The read-only count first** is the same two subqueries counted, with the predicates kept.
- **Without it**, the old build loses no data, but it reads a stale Open to for an off-Trade list posted under step 1. That shows in its owner's matches and alerts, its list tags and composer start, and in a side its `writeList` turns on.

### 9. Web and messages

- **Forms.** `ListForm` loses `showOpenTo` and both fields. `list-form-fields.tsx` loses `OpenToRadios`, `OpenToField` and `SaleOpenToField`.
- **Drafts.** `ListDraft` loses its three fields. `toCreateInput` stops sending them, `toEditInput` loses `storedOpenTo` and `storedSaleOpenTo`, and `toCopyDraft` carries no Open to.
- **Dialogs.**
  - Create, Edit and Copy stop passing the prop.
  - Edit list stops computing the stored values.
  - Create's composer start for a new sale list drops `alsoSwap: input.takesSwaps` (`create-list-dialog.tsx:123`). The composer starts unticked, the default.
- **The badge.** `ListOpenToBadge`, `list-open-to.ts` and its test go, with the two call sites. `OPEN_TO_LABEL` and `SALE_OPEN_TO_LABEL` go if nothing else uses them; their messages stay, since `match-help.tsx` and `trade-line.tsx` use them.
- **Messages removed from `en`, `ko` and `ja`:** `list_open_to_badge_label`, `list_open_to_label`, `list_open_to_desc`, `list_open_to_swaps_desc`, `list_open_to_both_desc`, `list_open_to_buying_desc`, `list_open_to_pair_hint`, `list_sale_open_to_sell_desc`, `list_sale_open_to_both_desc` and `list_sale_open_to_pair_hint`. No message is added or reworded, so the ko and ja register rules aren't touched. The Discord format and the CSV export read no Open to and stay English.
- `apps/web/docs/trade.md`, Post composer: the sentence saying Edit list's pencil "also hides a want or sale list's Open to" goes, since no form has one.
- **No new UI.** The Look in `apps/web/AGENTS.md` is untouched: this only removes controls.

### 10. Proof, kept light

- **Pure tests:**
  - `sideStateOf` and `listStateOf` (`trade-posts.test.ts` or a new `trade-post-state.test.ts`);
  - the pinned texts of `onTradeRowsSql`, `sideStateSql` and `listTradeStateSql`, locked to the TS twins (`trade-sql.test.ts`);
  - `rowStateOf`'s new fallbacks: a turn-on with no intent and no row takes the default, and one with an old row takes the row (`trade-post-rows.test.ts`);
  - `pairRefusal` with a partner in no row (`list-pair.test.ts`);
  - `list-draft.test.ts` and `copy-draft.test.ts`.
- **The model test** (`trade-post-rows.model.test.ts`):
  - its create writes stop drawing an Open to (`:280`), and any list-level Open to edit write goes;
  - the rows world's lists lose the three fields;
  - equation E's Open to half (`checkStates`, `:870-872`) holds against the legacy world's list for sides whose value came from a composer intent or a row. A list that left the rows and came back reads the default, as `trade-post-state-contract` decision 8 allowed for bumps.
  - Its counts must still meet their floors.
- **SQL is proven by running it:**
  - drift before and after each step;
  - decision 5's copy applied locally, with its counts;
  - G1's plans on production.
- **One local browser pass** (task 6.2).
- No frozen reference, differential or mutation testing.

## Risks / Trade-offs

- **[A hot read gets slower]** → G1 times candidates, `fetchPairs` and the feed, old against new, for the three heaviest For you users. A meaningfully slower read, or a rescanned CTE estimated at one row, stops the rollout.
- **[An off-Trade Open to reverts]** → decision 5's copy, counted at G1, with the window checked at G2.
- **[A list in no row changes what it matches]** → decision 6, counted at G1 for the owner.
- **[An open tab misreads a list]** → Open Question 1's recommendation keeps the fields. Stripped inputs keep old tabs validating.
- **[Rollback after step 1 reads stale lists]** → the reconcile in decision 8, with the owner's approval for that case.
- **[Step 2 runs while an old image serves]** → its precondition: the owner confirms both images before G3.

## Migration Plan

1. Groups 1 to 5, then the local proof (group 6).
2. The owner commits and pushes. CI passes.
3. **G1**, read-only, with a go-ahead, before step 1's migrate (task 7.1):
   - drift;
   - the constant check;
   - decision 5's and 6's counts;
   - the timing.
4. The owner runs migrate through Dokploy (the migrate app), then brings up web and the worker from the same commit. The owner notes when migrate started and when web came up.
5. **G2**, read-only, with a go-ahead (task 7.3): drift, decision 5's window list, a look at `/trade` and a list page.
6. **Step 2** after step 1 has served for a day: write the migration, apply it locally, the owner commits, G3, migrate alone, G4 (group 8).
7. **Rollback:** decision 8's table.

## Open Questions

Answered by the owner on 2026-11-22: all three recommendations stand. List objects keep `matchSale`, `matchHave` and `takesSwaps`, filled from the rows, so this change removes no API field. This replaces the owner's earlier plan to drop them.

1. **List objects keep `matchSale`, `matchHave` and `takesSwaps`, filled from the rows?** (decision 4)
   - **Recommend yes.** The web's post tags, composer start and Trade line read them, and old tabs keep working. No public output loses a field.
   - **No** keeps the owner's break: tasks 3.5 and 5.2 add `postOpenTo` and move the two web readers onto it, the `api-openapi` delta says list objects carry no `matchSale`, `matchHave` or `takesSwaps`, and tabs opened before the deploy misread posts until they reload.
2. **Step 1's migration copies each list's own Open to into its off-Trade rows?** (decision 5)
   - **Recommend yes.** Without it, an off-Trade Open to set in Edit list after the list's last post reverts to that post's.
   - **No** removes the copy from task 4.1 and its count from G1. Such lists then read their last post's value.
3. **A list in no row takes the defaults?** (decision 6)
   - **Recommend accepting it**, after G1's count. Keeping their values would need rows for lists in no post, which is `shared-lists`' planner work.
   - If the count is large, the owner may ask for that first. This change then waits.

## As built

Groups 1 to 5 and task 6.1, on `42498eab` (uncommitted). Task 6.2 onwards waits for the owner.

**Decisions 1 and 7, one rule.**
- `lib/trade-post-state.ts`: `SideList` is `{ id, listType }`; `sideStateOf` reads a want list's Open to and a sale list's `takes_swaps` from the row, on Trade or off, and the defaults for any other list. New: `PostOpenTo`, `DEFAULT_OPEN_TO` (true, true, false) and `listStateOf(rows, list)`.
- `lib/trade-sql.ts`: `onTradeRowsSql`'s and `sideStateSql`'s `ELSE` arms are the constants (and `sideStateSql` lost its "side on Trade" condition); `listTradeStateSql` is one correlated subquery per field, `coalesce(bool_or(x) FILTER (WHERE side on), bool_or(x))` over `st.lead_list_id = l.id OR st.want_list_id = l.id`, then `coalesce(…, default)`.
- **Added beyond the inventory:** `listSideFlagsSql(where)`, the same two tiers as one set grouped by list (`side.id IS NOT NULL` keeps rows with no want list out of a NULL group). Candidates' `my_side_flags` and want alerts' `list_flags` both use it, so their texts cannot drift; `trade-sql.test.ts` pins it.
- `lib/trade-posts.ts`: `PostFields` gained `PostOpenTo`, since `postFromRow`'s lists no longer carry Open to and the copies take it from `sideStateOf`.

**Decision 2, writers.** `rowStateOf` takes the intent, else the row the list was the open list or sale lead of, else `DEFAULT_OPEN_TO`; `TradeListState` lost the three fields. `savePost` writes no list (it still touches the picked, sale and dropped lists). `list.edit` is one plain `UPDATE`, with no Open to, refusals or `lockTradeLists`. `writeList`'s insert sets none of the three. `schemas/open-to.ts` lost `resolveOpenTo`, `openToEdit`, `saleOpenToEdit`, their types, and `SaleOpenTo` with `saleOpenToOf` once group 5 left no importer.

**Decision 3.** `checkLinkedList` is one statement: `lists` by id and owner with `listTradeStateSql` for the partner's three values (three correlated subqueries on one row). `writeList`'s re-check reads the locked list, which `lockPosts` fills with `listStateOf` over the rows it already reads (every row of the person: each row's lead is one of the person's lists).

**Decision 4 (Open Question 1, yes).**
- `lists.postLed` and `postWanted` (`packages/db/src/relation.ts`) are now `r.many` relations, lowest row first. The pair stays the lowest row's (`postLed[0]?.wantList ?? postWanted[0]?.leadList`), as `postPartnerSql` gives it.
- `fetchOwnedLists`, `readList`/`readListForViewer` and `findOwnedList` read every row with its state columns on the laterals they already made, and fold them with `listStateOf` in TS (`openToOfRows` in `services/list/read.ts`).
- **New laterals, not subqueries in a hot CTE:** the list's own row laterals are `json_agg` of every row rather than a `LIMIT 1`. `readList` and the profile path of `fetchOwnedLists` (`list.profileLists`, `/api/v1/profiles/{address}/lists`) also read the partner's own `postLed` and `postWanted` (`linkedListWith`), two more laterals per partner, since a partner can be a list that read does not hold. **After review:** `fetchOwnedLists` by account (`user.currentUser`, every page) reads no partner rows: the partner is one of the same owner's lists, already in the result, so its Open to comes from the rows read for it (`ownPairWith`, `openToById`). Its output for localtest1, localtest2 and localtest5, by account and by each of their profiles, was byte-identical before and after that change (`owned-before.json`, `owned-after.json` in the scratch folder). With one row per list each lateral reads one row. Task 7.1 times `fetchOwnedLists` both ways.
- `toLinkedList`, `fetchOwnedLists` and `findOwnedList` strip the rows, so no output gains a field.

**Readers.**
- `feedListColumns` and `FeedListRow` lost the three; `staffPosts` and the report give a list in no row `DEFAULT_OPEN_TO`. `snapshotColumns` lost them; `postSnapshot`'s shape is unchanged.
- `resolveTradeSides` reads no list Open to; `viewerPostOf` takes `MyList[]`.
- Candidates: `my_side_flags` is `listSideFlagsSql(tp.user_id = viewer)`; `my_want` and `my_have` take `coalesce(f.x, true)` and `coalesce(f.takes_swaps, false)`, still by `LEFT JOIN` onto `lists`.
- Want alerts: `list_flags` is `listSideFlagsSql(true)` over every `trade_post` row; `wf` and `olf` take `coalesce(flags, default)`.

**Task 3.4's grep**, outside tests:

```
apps/worker/src/job/want-alerts/pairs.ts:54:        l.match_sale, l.match_have, l.takes_swaps, l.user_id
apps/worker/src/job/want-alerts/pairs.ts:100:        SELECT ol.list_type, coalesce(olfl.takes_swaps, false) AS takes_swaps
```

Both are CTE columns: `l` is `on_trade` in `cand`, and line 100's hit is `fl.takes_swaps` inside `olfl`, the `list_flags` alias. Every other `match_have`, `match_sale` or `takes_swaps` in `packages/api/src` and `apps/worker/src` is a `trade_post` column or a CTE's column. The helpers that build names through `column(alias, …)` were checked by call site: `offersSwapsSql` (`postPairsSql` over `on_trade`, candidates' `p`, the feed's `t`), `offerMatchesWantSql` (`p`/`w`, `c`/`wf`, `olf`/`c`), `byOpenToSql` (`t`), and `boundOfferListSql` and `matchableListSql`, which read only `list_type` and `is_profile_bind`.

**Model test (decision 10).** The rows world's lists hold no Open to; the legacy world's lists (`LegacyList`) still do and are the reference. `defaulted` records each list the rows world left with no row; it reads the defaults, in the legacy world's refusals and `planPost` as well (`asRead`), until a post sets its Open to again. Create writes draw no Open to. Equation E's Open to half reads the legacy list through `asRead`. Counts with `COUNTS=1`: post 5342, takeDown 1481, pair 633, unpair 399, swapWant 144, deleteLead 211, deleteWant 256, createOnTrade 2910, createLinked 850, createLinkedToPaired 218, account 336, bump 668; releads 1501, editLead 893, D2 263, D3 53, takeover 2; shared: share 2748, dropRow 383, downRow 1788, deleteShared 468, mergeShared 22. Every floor holds.

**Step 1's migration** is `packages/db/migrations/20261121204439_retire_list_open_to`: the generated snapshot, with `migration.sql` replaced by the `lock_timeout` header, a comment in place of the generated `DROP CONSTRAINT`s and `DROP COLUMN`s, `LOCK TABLE "lists" IN EXCLUSIVE MODE` and decision 5's three `UPDATE`s. A second `db:generate` found no change. No `drop_list_open_to` exists.

**Local plan, candidates only** (read-only, `.env.local`, localtest1, `cand-explain.ts` from `trade-post-reads-by-row`): planning 58 ms, execution 32 ms; `my_side_flags` estimated 2 rows, actual 7, each of its two scans one loop, both `LEFT JOIN`ed. Local statistics are small and stale (`on_trade` estimated 30, actual 439, unchanged by this change), so this is no timing evidence; `fetchPairs` and the feed were not run locally. G1 (task 7.1) times all three on production.

**Task 6.1.** `bun run check` and `bun run build --filter=web` exit 0; `bunx oxfmt --check` exit 0 after formatting `trade-post-rows.ts`. The web grep (`matchHave|matchSale|takesSwaps|openTo|saleOpenTo` in `apps/web/src`, outside `paraglide/` and tests) hits only post state: `features/list/list-post-tags.ts` (6) and `features/trade/plan-list.ts` (3).

**After review (2026-11-22).** Task 7.1 gained the list-page count (on Trade must be 0) and an unconditional timing table, `fetchOwnedLists` by account and by profile included; task 7.3 reruns the list-page count. `fetchOwnedLists` by account reads no partner rows (decision 4 above). 6.1 was rerun after both: `bun run check`, `bun run build --filter=web` and `bunx oxfmt --check` exit 0, and both greps are unchanged.

**Task 6.2** (local database, owner's approval; scratch files in `/private/tmp/claude-501/open-to-retire/`):

1. **Before:** drift 0 on checks 1 to 7 and both notes, over 411 rows. Constants: `non_want_not_both` 0, `non_sale_swaps` 0. Decision 5's three counts 0, 0, 0, and its guard skips 0, 0. Decision 6: 181 want lists in no row that are not Swaps or buying, across 133 owners; 0 bound sale lists. List pages that change at deploy: none, on Trade or off.
2. **Saved** (`saved/`): the three accounts' lists (15, with the three columns), rows (10), hides by them and on their rows (0 each) and sessions (100). **Baseline from `0129b5c4`** (throwaway worktree on port 3211, removed after): localtest1's `trade.people` (all, any, mutual), `trade.mutualCount`, `trade.tabCounts`, `trade.myPosts`; localtest2's `trade.myPosts` and `trade.people`; dry want alerts over entries `(1836936, 1837936]`: 189 pairs, 20 alerts, 0 unhides, 27 not mutual, 20 unowned (`baseline/`).
3. **Migrate:** `20261121204439_retire_list_open_to` applied with `db:migrate`. Every count was identical after (all 0; decision 6 unchanged). The three columns and both checks are still in the database. Drift 0.
4. **Pass** on this worktree's dev server (port 3212), through `browser-use` on the automation Chrome. Each account had its own isolated context: localtest1 and localtest2 signed in by `fetch` after load. No password reached the dev-server logs (checked). Drift was 0 after every step that wrote.
   - (a) localtest2's create form for a want list and for a bound sale list shows no Open to or Sale choice. Both saved (13467, 13468). `GET /api/v1/lists/{slug}` gives `matchHave` true, `matchSale` true, `takesSwaps` false for both. Neither `/list` nor the list page shows Open to text.
   - (b) Edit list on 13467 (off Trade) shows no choice and saved its description. Copy as new list of Buy-posted 13142 shows no choice; the copy, 13469, reads Swaps or buying.
   - (c) **Want list 13467, never posted:** New post started with "also pay" ticked; posted as Swap with it unticked, it became row 1000520 (`match_have` true, `match_sale` false), and the list's own columns stayed true and true. Taken off Trade, it still reads Swaps only, both in its API object and in `my_side_flags`' rule for localtest2. Post it then started from that post, with "also pay" unticked.
   - (c) **Sale list 13468:** it started with "Also open to swaps" unticked. Posted with it ticked, it became row 1000521 with `takes_swaps` true, and the list's own `takes_swaps` stayed false. Edit post on it started on Sell, ticked.
   - (c) Edit post on Buy post 13142 started on Buy.
   - (d) localtest1's `trade.people` (all, any, mutual), `mutualCount`, `tabCounts` and `myPosts`, and localtest2's `myPosts` and `people`, were byte-identical to the baseline.
   - (e) The dry want-alerts run differs by one pair and one alert: entry 1837898 (`cream02-chaewon-104z`) on localtest1's have list 13171 now matches want list 10173 ("chaewon", owner misosana). 10173 is in no row, and its own Open to is Buying only, so it now reads the default, Swaps or buying: decision 6, one of the 181 lists counted in step 1. Nothing else differs.
   - (f) localtest1 reported localtest2's Buy post 13142: snapshot `{"tags": ["wtb"], "listId": 13142, "onTrade": true, …}`, shape unchanged. A second report hit `report_limit`, as expected. `staffPosts` read 13142 posted WTB, 13170 posted WTS, 13468 posted WTS and WTT, 13467 off Trade WTT (its row's Swaps only), and 13469 off Trade WTT and WTB (in no row, so the defaults).
   - (g) `GET /api/v1/profiles/{address}/lists` carries the three fields on each list and each `linkedList`, and they equal each list's own `GET /api/v1/lists/{slug}`. Buy-posted 13142 reads `matchHave` false. `/api/v1/spec.json` names the three fields, and no `openTo`.
   - (h) An old tab's `list.edit` with `openTo: "buying"` on off-Trade 13467 answered 200 and saved the description, and its row stayed Swaps only. An old tab's `list.create` with `matchSale: false` answered 200, and the list (13470) reads Swaps or buying.
   - (i) The dev-server log shows no server error and no 5xx; the only client errors are seven ResizeObserver notices.
5. **Put back:**
   - Deleted lists 13467 to 13470 (their rows 1000520 and 1000521 and the copy's 5 entries cascaded), report 18 and the 6 sessions the sign-ins made.
   - The lists, rows, hides (by them and on their rows) and sessions read again equal the saved files byte for byte. Only the id sequences moved.
   - Closed the 3 browser contexts and stopped the dev server.
   - Final drift: 0. The local database keeps step 1's migration.

## Context

See proposal.md for why. This is change 5 of the shared-lists chain:

`trade-post-state` → `trade-post-hides-by-row` → `trade-post-planner-shared` → `trade-post-state-contract` → **this change** → `post-id-inputs` → `offer-reads-post-id` → `shared-lists`.

Paths are under `packages/api/src/` unless they say otherwise. Line numbers are from `8b05487c`, which production runs. The owner's decisions of 2026-11-16 still bind: hides follow the row, a post's Trade state is per post, and Bump stays per person. The owner's decisions of 2026-11-21 allow breaking public outputs, but `/rpc` inputs still follow `packages/api/AGENTS.md` (open tabs).

Each `trade_post` row holds its sides' Trade state and bumps and the post's Open to (`match_have`, `match_sale`, `takes_swaps`). Production holds one row per list (drift check 2, `planPost`'s refusal), so every reader below is right today. The table says what each one does with a list in two rows, which `shared-lists` will allow.

**Reader inventory.** "Shared" is what the reader does once a list is in rows R1 and R2.

| Reader | Reads now | Shared, today | After | Decision |
| --- | --- | --- | --- | --- |
| `postsCte` (`services/trade/feed/query.ts:18-46`): every feed read, `counts.ts:25-33`, `hidden.ts:98-108`, candidates, want alerts | `on_trade` sides joined to the list's row by `tp.lead_list_id = a.id` (`:39`), with an anti-join on any row (`:41-44`) | one post per list side, cross-joined across rows | one post per row, with `post_id` | 2 |
| `listedCte` (`query.ts:51-57`) | list ids in a listed post | a list counts if any post is listed, whichever post is matched | row ids of listed posts | 2 |
| `matchesIndex` (`query.ts:66-80`), `computePostCounts` (`counts.ts:29-30`) | `JOIN on_trade t ON t.id = e.list_id` | joins the other post's side too | the post's own sides (`t.post_id = posts.post_id`) | 2 |
| Feed hides: `feedWhere` (`query.ts:112`), `fetchPersonRows` (`:200`), candidates (`candidates.ts:90`) through `inHiddenPostSql`/`coveredListsSql` (`services/trade/lists.ts:67-90`) | lists of hidden rows | hiding R1 hides L in R2 | `hiddenRowsSql`, a set of row ids | 2 |
| `feedListColumns` (`feed/entries.ts:19-39`) through `postStateSql` (`lib/trade-sql.ts:80-109`), `postRowSql` (`:41-44`), `postPartnerSql` (`services/trade/lists.ts:53-59`) | the lowest row's state and partner, else the list's own | R2's post shows R1's Open to, bump and partner | list columns only; state per reader | 1, 3 |
| `loadPosts` (`feed/posts.ts:101-102`, `:125-129`, `:156`) | `feedListColumns` by list id, `pairPosts` per feed row | as above | the row's state on copies of its lists | 3 |
| `fetchMyPosts` (`feed/mine.ts:25-30`, `:43`) | lists with a side on Trade, `pairPosts` over all of them | groups by one partner | `postsCte` rows of the viewer, hydrated as `loadPosts` | 3 |
| `findTradeList`, `listedTradeLists` (`feed/shared.ts:27-35`, `:45-60`), used by `sides.ts` and `near.ts` | `feedListColumns`, `pairPosts` for idleness | the lowest row's state | union of the list's sides on Trade; idleness from `postsCte` | 1, 3 |
| `fetchPostCards`, `staffPosts` (`feed/post-cards.ts:23-48`, `:155-190`) | `inPostsOf` (lowest partner) and `pairPosts`; staff reads `lists.discoverable` | the lowest row's partner, list-level on/off | the list's post row (`listPostSql`) and its state | 3 |
| `reportedPost` (`services/moderation/report.ts:69-99`) | the list's own Open to, `discoverable`, lowest partner | list-level | as staff posts | 3 |
| `fetchHiddenPosts` slug (`services/trade/hidden.ts:133-137`) | `lists.discoverable` of lead and want | list-level | the hidden row's `lead_on_trade`, `want_on_trade` | 3 |
| `hidePost` (`hidden.ts:98-108`) | a post anchored at the list, then `postRowSql` | may hide R1 when R2 is the post on Trade | the lowest `post_id` anchored at the list | 3 |
| Candidates `partner_lists`, `partner_post`, `post_of` (`services/trade/matches/candidates.ts:82-100`, `:148`) | `on_trade` sides keyed by list; post key = lead list id; `jsonb_object_agg(list_id, post_key)` | duplicate partner rows; one post key per list | sides per row, then one row per list with the union; post keys are rows | 4 |
| `swapScore`, `PostOf` (`lib/trade-person.ts:6`, `:45-80`), `fillMatches` (`lib/offer-prefill.ts:107-117`) | list → one post key | one key per list | list → row ids, outputs map back to the lead list | 4 |
| Viewer: `resolveTradeSides` (`matches/recount.ts:38-47`), `myEntries` (`:70-80`), `fetchViewer` (`feed/viewer.ts:72-90`), candidates `my_want`, `my_have` (`candidates.ts:66-80`), `viewerPostOf` (`lib/trade-rank.ts:55-64`) | the list's own Open to and `takes_swaps`; the lowest partner | the last-saved post's Open to; one post key | union of its sides on Trade, else its own; post keys from rows | 1, 5 |
| Want alerts `cand` (`apps/worker/src/job/want-alerts/pairs.ts:49-59`) | `on_trade` sides and `listed` by list | an entry once per row, hidden test by list | per row, with `post_id` | 6 |
| Want alerts recipient `wl`, `ol` (`pairs.ts:70-73`, `:81-85`), `loadContext` (`job/want-alerts/context.ts:15-38`, `:77-79`) | `lists` Open to and `takes_swaps`; `swapPair` from the lowest partner | the last-saved post's | the union rule; `swapPair` from any pair row | 6 |
| Want alerts hide (`pairs.ts:87-97`, `hiddenPostAtSql`), `selectUnhides` (`apps/worker/src/lib/want-alert-match.ts:172-198`), `unhidePosts` (`job/want-alerts/record.ts:40-53`) | hides of every row holding the list | an R1 hide blocks an alert through R2, and an unhide lifts both | the pair's row | 6 |
| Drift check 6c (`apps/worker/src/script/trade-post-drift.ts:92-111`) | a one-row list's on side equals the list | guard | dropped | 9 |

**Readers that stay, and why.** Each asks about a list, or belongs to a later change.

- `lists.discoverable`, "on Trade in some post": the Marketplace (`services/market/aggregate.ts:31`), offers and the picker (`services/offer/view.ts:89`, `core.ts:431`, `picker/index.ts:178`, `:386`, `theirs.ts:226`, `:234`, `shared.ts:164-221`), `askableOnTrade` (`services/trade/lists.ts:20`), chat card resolve (`services/chat/card-resolve.ts:55`), `visibleOnTrade` (`feed/shared.ts:18-24`), Hide a partner's addresses (`hidden.ts:28`, `:77`), want alerts' newly-discoverable set (`apps/worker/src/job/want-alerts/index.ts:48-51`, Open Question 3), and list objects (`services/list/read.ts:56`, `:135`, `:201`). All of them are right for a shared list. The column stays.
- The picker's partner reads through `postPartnerSql` (`picker/shared.ts:175`, `theirs.ts:224`, `index.ts:393`) take the lowest row: `offer-reads-post-id`.
- `PublicList.linkedList` (`services/list/read.ts:80`, the lowest row's partner) and Compare with's `pickedSides` (`schemas/list.ts:52`) take one partner: `shared-lists` decides how a list page and Compare with show a list in several posts.
- The list's own Open to: list objects (`read.ts:57-59`, `:136-138`, `:202-204`), `list.edit`'s guards (`services/list/edit.ts:24-46`), `writeList` (`create.ts:165`, `:195`), `savePost`'s list write (`services/trade/post.ts:41-66`), the planner's fallback (`lib/trade-post-rows.ts:436-459`), and the web's list tags, composer start and badges (`apps/web/src/features/list/list-post-tags.ts`, `features/trade/plan-list.ts`, `schemas/trade-post.ts:462`, `features/list/list-open-to.ts`, `list-type-badge.tsx`). This is a second copy, kept or dropped by Open Question 1.

No web server code reads `@repo/db` (grep of `apps/web/src`), and `scripts/` holds only `setup-worktree.sh`.

## Goals / Non-Goals

**Goals:**
- Every reader that builds, matches or hides a post reads it by row.
- A list in several rows reads right in each reader, by decisions 1 to 6.
- With one row per list, every output, count, alert and cached value equals today's. Tasks 0.1 and 7.4 compare the local outputs before and after, and task 7.2 compares `posts` on production.

**Non-Goals:**
- Lifting `planPost`'s refusal, post-id inputs, offers on `post_id`, and contract step 2.
- Dropping the list-level Open to (Open Question 1).
- Any public output change, `.tsx`, message, `/rpc` input, migration or index.

## Decisions

### 1. Two reading rules, one fallback

- **A post reader reads its row.** A list in post row R takes from R its Trade state and bump, and, while its side is on Trade, a want list's Open to and a sale list's `takes_swaps`. Off Trade, those come from the list's own (`onTradeRowsSql`'s type rule, and `postStateSql`'s fallback today). One pure function holds it, `sideStateOf(row, list)` in `lib/trade-posts.ts`. Its SQL twins are `onTradeRowsSql`, which reads on sides only, and `sideStateSql(row, list, field)` in `lib/trade-sql.ts`, for a read that takes off sides too. `trade-sql.test.ts` pins the text and locks it to `sideStateOf` with a table, as it locks `offersSwapsSql`.
- **A list reader takes the union.** A read that names only a list asks what the list matches. It takes the OR of its sides on Trade (`bool_or` of each flag, the same type rule), else the list's own. This is `listTradeStateSql(alias, field)` in `lib/trade-sql.ts`, which replaces `postStateSql`. Its text is pinned in `trade-sql.test.ts`. Its bump is the latest of its sides on Trade, else null.
- **Why the union is exact.** A shared list holds the same entries in every post, so a match exists exactly when some listed post's Open to allows it. Can swap stays exact too: a paired want list is never Buying only (`pairRefusesOpenTo`), so every pair row it sits in takes swaps, and decision 4 keys swaps to the pair rows.
- **The off-Trade fallback is the one place Open Question 1 changes.** "The list's own" reads `lists` today. If the list-level Open to goes, it becomes "the union of its rows, else the default", in `sideStateOf`, `sideStateSql`, `listTradeStateSql` and the planner, and nowhere else.
- **Why off sides keep the list's own.** A row's Open to lags `list.edit` while its side is off (`docs/trade.md`, Trade posts). So staff posts, the report snapshot and the viewer's off-Trade lists read the list, as they do today.

**`listPostSql(alias)`** is the post a list-keyed reader shows: the lowest row whose side holding the list is on Trade, else `postRowSql`'s row. Chat cards, staff posts and the report snapshot use it. `postRowSql` stays as the twin of the planner's `postRowOf` and as `listPostSql`'s fallback. With one row per list, the two name the same row.

### 2. Posts are built per row

`on_trade` (`onTradeRowsSql`) gains `tp.id AS post_id` and `side` (`lead` or `want`). `posts` then pairs within a row:

- a lead side `a` takes the want side of the same row as `p` when the lead offers swaps (`postPairsSql` over `a.post_id = p.post_id`);
- a want side is a post of its own unless its row's lead side is on Trade and offers swaps;
- `posts` carries `post_id`.

This replaces the lead join (`query.ts:39`) and the anti-join over every row (`:41-44`) with equalities on `post_id`, which hash. Then:

- `listedPostsCte` lists the row ids of listed posts and replaces `listedCte`. Candidates and want alerts filter sides by `post_id IN listed`.
- **The hide set is `hiddenRowsSql(viewer)`:** `SELECT post_id FROM hidden_trade_post WHERE user_id = $1`, read through the primary key. The feed and candidates test `post_id NOT IN (…)`, a set hashed once, as `docs/trade.md` asks (the lookup form cost ten times more). Want alerts take `hiddenRowAtSql(viewer, row)`, the row form of `hiddenPostAtSql`. `coveredListsSql`, `inHiddenPostSql` and the list form of `hiddenPostAtSql` go. `hidesOfSql` keeps its list form for `unhidePost`.
- `matchesIndex` and `computePostCounts` join `on_trade t ON t.post_id = posts.post_id AND t.id = e.list_id`.
- `FeedRow` gains `post_id`. `postId` on feed posts becomes that row, not `postRowSql` of the anchor. They are equal with one row per list.

**Equal today.** With one row per list, a list's only row is the one the old join found, so `posts` has the same `id`, `partner_id`, flags and bump. Task 7.2 checks this as set equality, locally and at gate G1 on production.

### 3. Post readers hydrate from the row

`feedListColumns` keeps list columns only (`id`, names, type, profile, `updatedAt`). Each reader adds state its own way:

- **`loadPosts`** reads the page's lists and its rows in one `Promise.all`. For each `FeedRow` it copies the row's lists, applies `sideStateOf`, sets `linkedListId` and `postId` from the row, then runs `pairPosts` as today. The `trade:post:4` entry cache holds entries only. `showsRatio` and the near index read the copies, so a shared list's two posts each get their own.
- **`fetchMyPosts`** reads the viewer's `postsCte` rows (no listed, hide or partner filter) and hydrates them the same way. So Your posts shows one post per row.
- **`findTradeList`, `listedTradeLists`** (strips, side items, near) name a list. They take `listTradeStateSql`. `listedTradeLists` reads the person's listed posts from `postsCte` for idleness.
- **`fetchPostCards`, `staffPosts`, `reportedPost`** read `listPostSql`'s row and its two lists, and group them per row with `postFromRow`. Each keeps its own filter:
  - a chat card shows the post only while the side holding the named list is on Trade, and keeps `visibleOnTrade`'s sanction and block tests;
  - staff posts and the report snapshot keep off sides. Staff's `posted` or `off_trade` is that row's side, and the snapshot's `discoverable` becomes the side's on-Trade state. `postSnapshot` (`lib/report-post.ts`) keeps its shape.
- **`fetchHiddenPosts`**: the slug is the lead's when `lead_on_trade` and the lead is matchable, else the want list's when `want_on_trade`, else the lead's.
- **`hidePost`** hides the lowest `post_id` among the posts anchored at the list. `unhidePost` stays as it is: `post-id-inputs` gives both a `postId`.

The pure part is `postFromRow(row, lead, want)` in `lib/trade-posts.ts`, built on `sideStateOf` and `groupPosts`. It has unit cases for a pair, a lone side, a Sell only lead with a want side on Trade, and a list in two rows.

### 4. Matching keys posts by row

**Candidates** (`candidates.ts`):
- `partner_sides` are the `on_trade` sides of other users, listed, seen and not hidden, each with its `post_id`.
- `partner_lists` groups them by list with `bool_or` of each flag (decision 1).
- `partner_post` pairs a lead side and a want side of one `post_id` when the lead offers swaps by the row. Each half is keyed to `post_id`.
- `post_of` becomes `list id → row ids` (`array_agg(DISTINCT post_id)`), plus `post_leads`, `row id → lead list id`, built in their own CTE so `matched` keeps one row per entry.

**`PostOf`** becomes `list id → row ids`. `swapScore` loops over each list's rows. A tie compares the rows' lead list ids (`postLeads`, and the viewer's own from decision 5), then row ids, so a tie names the same pairing as today.

**Outputs keep naming lists.** `swapPair.theirPostId` is `postLeads[row]`, the pair's lead, which is the feed post's `id`. `myListIds` are the viewer's lists keyed to the best row. `fillMatches` checks a partner list's rows against that row. So `person-row.ts:68-74` and `picker/index.ts:268-272` need no change. `api-openapi` (Trade feed post ids) already requires `theirPostId` to equal a post's `id`.

**Caches.** Bump every ranking cache whose value holds `postOf`, a post key or a count derived from one. Task 4.4 checks `trade:mutual-people:10`, `trade:mutual-count:9`, `trade:oneway-people:6` and `trade:person:10`. `trade:people-order:3` holds people only, and `trade:post:4` holds entries only.

**Not done here: making the output name the row.** That would change `theirPostId`, the feed `id` and the picker together. It is `post-id-inputs`' scope, and the web keys posts by `id` today.

### 5. The viewer's own lists

- **Flags.** `resolveTradeSides`, `myEntries`, `fetchViewer` and candidates' `my_want` and `my_have` read each list's flags through `listTradeStateSql`. A list on Trade counts with its posts' union. An off one counts with its own, as today.
- **Post keys.** `viewerPostOf` takes the viewer's pair rows, on or off Trade, as `postPartnerSql` reads them today. It keys both halves to the row when the lead offers swaps by `sideStateOf`: the row's `takes_swaps` while the lead is on Trade, the list's own while it is off, as today. `resolveTradeSides` reads the rows beside the lists, in one `Promise.all`.
- **Compare with** keeps `pickedSides`' one partner (Readers that stay).

### 6. Want alerts read per row

- **`cand`** is per side: `on_trade` sides whose `post_id` is listed, with `post_id` and the row's flags.
- **`pairs`** carry `post_id`. The hide test is `hiddenRowAtSql(recipient, post_id)`, so R1's hide never blocks an alert through R2.
- **The recipient's `wl` and `ol`** take `listTradeStateSql`.
- **A group** (direction, want list, offer list, collection) may hold one pair per row. `judge` reads the partner as Sell only only when every pair says so (`partnerSale`), and as wanting swaps when any pair does (`partnerWantsSwaps`). That is decision 1's union.
- **`Unhide`** becomes `{ userId, postId }`, one per hidden pair that passed, and `unhidePosts` deletes exactly that hide.
- **`loadContext`'s `swapPair`** is true when some row pairs the list with a half that can swap, read through `sideStateSql` (the row while the side is on, the list's own while off), rather than through `postPartnerSql`.
- **No state change.** The stored progress holds entry ids only (`apps/worker/src/lib/want-alert-state.ts:20-26`), so its format stays, and a rollback needs no data step.
- **Unchanged:** `want_alert_sent` stays keyed by list. One alert per want list, source list and collection is right for a shared list, since an alert names lists.

### 7. No migration, no break

- The reads use existing indexes: `trade_post_lead_list_id_idx`, `trade_post_want_list_id_idx`, `trade_post_user_id_idx`, and `hidden_trade_post`'s primary key.
- Task 7.3 runs `EXPLAIN` on local data, before and after, for `fetchBumpPeople`, `fetchTradeCandidates` and `fetchPairs`, which all change shape around `postsCte`.
- No output shape, `/rpc` input or `.tsx` changes. If one turns out to be needed, the implementer stops and asks. A `.tsx` change would also need `vercel-react-best-practices` loaded (a repo hook enforces it).

### 8. List objects keep `discoverable`

The web reads it on list objects in eight places: the list header's On Trade mark (`list-header.tsx:96`), list rows (`list-rows.tsx:235`), list tags (`list-post-tags.ts:28`), Find matches (`show-matches.ts:12`), the composer (`add-objekts.tsx:88`, `plan-list.ts:12`) and Edit list (`edit-list-dialog.tsx:131`, `:139`). "On Trade in some post" is what each asks. So it stays, in both branches of Open Question 1.

### 9. Drift

- Check 6c goes ("for a list in exactly one row whose side is on, … equal the list's", `trade-post-drift.ts:106-111`), with its `held` CTE (`:93-98`) and its header sentence (`:13-17`). No reader takes a list's Open to as its post's any more. 6a and 6b stay.
- Check 2 stays a failing check. `shared-lists` turns it into a note.
- The gates use the old script (`8b05487c`) before the deploy and the new one after.

### 10. Proof, kept light

- **Pure tests:**
  - `sideStateOf` and `postFromRow` (`trade-posts.test.ts`);
  - the pinned text of `listTradeStateSql`, `listPostSql` and `hiddenRowsSql` (`trade-sql.test.ts`);
  - `swapScore` with a list in two rows (`trade-person.test.ts`);
  - `viewerPostOf` over rows (`trade-rank.test.ts`);
  - `fillMatches` with row keys (`offer-prefill.test.ts`);
  - `judge`'s union and `selectUnhides` per row (`want-alert-match.test.ts`).
- **One set-equality read** of the old and the new `posts`, locally and at G1 on production. `postsCte` feeds every Trade read, and production's 1,600 rows hold shapes local data may lack, so one read-only query earns its place.
- **`EXPLAIN`** for the three reads in decision 7, locally.
- **A local baseline** of the outputs a pass reads (`trade.people`, `trade.person`, `trade.myPosts`, `trade.hiddenPosts`, a dry want-alerts run), saved before any code changes (task 0.1) and compared after (task 7.4). It is a saved copy of outputs, not a frozen implementation.
- **One local browser pass**, including an off-Trade Open to edit, and a list put in a second row by local SQL, which is the only way to see decisions 1 to 6 before `shared-lists` (task 7.4).
- No differential, mutation testing or frozen copy: no writer changes.

## Risks / Trade-offs

- **[`postsCte` rewrite changes every Trade read]** → set equality locally and on production at G1 (decision 10). A difference stops the rollout.
- **[The feed gets slower]** → the per-row pairing replaces an anti-join with equalities on `post_id`, and the hide set loses a join. `EXPLAIN` before and after (task 7.3). A worse plan is a finding for the owner, not a stop.
- **[Mixed builds during the deploy]** → the cache bumps put new values under new keys. The old and new builds agree on every value with one row per list, and the worker can deploy before or after the web.
- **[Union over-counts a post]** → a list read by list id counts what any of its posts allows. That is what matching asks. A post reader always reads its own row (decision 1).
- **[`list-open-to-retire` touches the same fallback]** → it starts after this change is live.

## Migration Plan

1. Save the local baseline (group 0), build groups 1 to 6, then the local proof (group 7).
2. The owner commits and pushes. CI passes.
3. **G1, read-only, with a go-ahead, before the deploy:**
   - the old drift script, checks 1 to 7 at 0;
   - the set-equality read (task 7.2) returns no difference.
4. The owner brings up web and rebuilds the worker from the same commit. No migrate.
5. **G2, read-only, with a go-ahead:** the new drift script at 0. One look at `/trade` as the owner.
6. **Rollback:** the previous images (`8b05487c`), at any time, with no data step. This change writes nothing new: the worker's unhide deletes the same hide rows, now named by row. The floor from `trade-post-state-contract` stands: step 1's commit once its step 2 has run, else web ≥ `1a062e41`.

Contract step 2 is independent of this change, and either can deploy first.

## Open Questions

Answered by the owner on 2026-11-21: all three recommendations stand. The list-level Open to is dropped in its own change, `list-open-to-retire`, after this one; this change keeps the off-Trade fallback to the list's own.

1. **Drop the list-level Open to?** `lists.match_have`, `match_sale` and `takes_swaps` are a second copy. Edit, Create and Copy list set them off Trade, and a side turning on with no intent takes the list's. **Recommend yes, as its own change, `list-open-to-retire`, right after this one.** It needs `.tsx`, messages, input changes and two migrations, which this server-only change does not. What it changes:
   - **Yes:**
     - Open to becomes a post setting, chosen only in the Post composer. A new post starts from today's defaults: a want side Swaps or buying, a sale list Sell only. Edit post starts from the post.
     - Create, Edit and Copy list lose the control, the off-Trade badge and their en, ko and ja messages. Discord-format text stays English.
     - A list created on Trade (`list.create` with `discoverable`, `create.ts:145`, `:204`) takes the default for the side it turns on, or the composer's choice when New list in the composer makes it.
     - `list.create`, `list.copy` and `list.edit` stop reading `matchSale`, `matchHave`, `takesSwaps`, `openTo` and `saleOpenTo`. Zod strips them, so open tabs still validate.
     - `savePost` stops writing the list. `rowStateOf` takes the intent, else the old row, else the default.
     - The fallback in decision 1 becomes "its rows' union, else the default".
     - List objects lose `matchSale`, `matchHave` and `takesSwaps` (the proposal's table).
     - Step 1 stops reading and writing the three columns. Step 2 drops them with `lists_open_to_something` and `lists_takes_swaps_sale_only`. Rolling back past step 1 needs a reconcile of the list copy from the rows, with a read-only count first, as in `trade-post-state-contract`.
   - **No:** that change is never written. This change stands as it is, and Create and Edit list keep the control.
2. **A list read by its id counts with the union of its posts** (decision 1). **Recommend yes:** it is exact for counts and for Can swap. The other choice, its lowest post's Open to, would miss matches that another post allows.
3. **Want alerts' newly-discoverable set stays per list.** A list that joins a second post with a wider Open to sends no alerts for the entries it already held. Today an Edit post that widens Open to behaves the same way. **Recommend accepting it.** Otherwise the worker's state would be keyed by row, with a state-format change and a migration of the stored state.

## As built

Built on `8b05487c` in the `shared-lists-orca` worktree, uncommitted. Scratch files are in `/private/tmp/claude-501/reads-by-row/`.

### 0.1 Baseline

Saved at `8b05487c`, before any code change, on the local database (dev server on port 3210, isolated browser contexts, sign-in by `fetch` from the loaded page; localtest5 by a local `session` row, as it has no password):

- `baseline/`: localtest1's `trade.people` (no filter, Any, Mutual, `person` = localtest2), `trade.person` for localtest2, `trade.hiddenPosts`, `trade.mutualCount`, `trade.tabCounts`, `trade.sideItems` (13168, 13402), `trade.listMatches` (13168) and `trade.myPosts`; localtest2's `trade.myPosts`, `trade.people` (no filter, Any) and `trade.hiddenPosts`; localtest5's `trade.people` (no filter, Any) and `trade.myPosts`; a signed-out `trade.people`; screenshots of localtest1's Browse and For you (`lt1_trade.png`, `lt1_trade_for-you.png`), localtest2's row on both; `dry-alerts.json` (`fetchPairs`, `loadContext`, `selectAlerts`, `selectUnhides` over entries 1,836,937 to 1,837,936; 189 pairs, 20 alerts, 0 unhides).
- Put back: the 5 Better Auth sessions the pass made were deleted; lists, rows, hides and sessions of the three accounts compare equal to `before-*.tsv`. The pass changed no list, row or hide.

### Deviations from the design

- `hiddenRowsSql` and `hiddenRowAtSql` live in `lib/trade-sql.ts`, not `services/trade/lists.ts`, so `trade-sql.test.ts` pins them without importing `@repo/db`.
- `listedPostsCte` is a set of `(post_id, id)` sides, not bare row ids: a row whose lead takes no swaps is two posts, each idle on its own, and bare row ids would merge their idleness. The set is the same for every row today (no such row exists locally, and the writers refuse a Sell only pair).
- `PostRow` and `sideStateOf` live in `lib/trade-post-state.ts`: `lib/trade-posts.ts` imports `lib/trade-rank.ts`, which now needs `sideStateOf` (oxlint `import/no-cycle`).
- `feedListByListColumns` carries no `linkedListId` or `postId`; the side helpers (`fullSide`, `listMatchesOf`, `nearOf`, `pickerTags`, `indexFor`) take `ListState` (type, Open to, `takes_swaps`) instead of `TradeList`, since none read a pairing or bump.
- `fillMatches` recomputes `bestPairing` to cut to the pairing's own row; `swapPair` keeps its shape.
- `fetchViewer` and `recountPartners` read each list's flags once per list through `listTradeStateSql`, beside the entries, rather than per entry. Candidates do the same in `my_lists`.
- `namedPostsOf` (chat cards, staff posts, report snapshot) also returns the named lists, so staff posts and the snapshot read a list in no row as a post of its own, off Trade, as before. The first build read it as `deleted`; the read-only smoke below caught it.
- Want alerts read the recipient's flags through `listTradeStateSql` inside a `LATERAL` per pair (`wf`, `olf`), since `offerMatchesWantSql` takes a row alias.
- Staff posts' posted or off Trade reads the anchor's side in the row, as it read the anchor's `discoverable` before, not the named list's side.
- `listedTradeLists` (strips, near matches, the picker's tags) returns the same lists as before in another order: it now reads the lists by id from one statement, where before they came grouped by post. Neither build orders that read, and its callers key by list id.
- `packages/db/src/schema.ts`: the comment on `hiddenTradePost` names `hiddenRowsSql` for `coveredListsSql` (a comment only; no migration).

### 4.3 Cache versions

Bumped, each holding counts read through post keys (shapes unchanged): `trade:mutual-people:10` → `11`, `trade:mutual-count:9` → `10`, `trade:oneway-people:6` → `7`, `trade:person:10` → `11`. Left: `trade:people-order:3` (people only), `trade:post:4` (entries only), `trade:counts:<market>:<slug>` (a collection's post counts, 60 s, counted per post `(post_id, anchor)`), `trade:have-lists` (the have index), `trade:filter-slugs:1` (slugs). Candidates (`postOf`, `postLeads`) are never cached.

### 7.1 Checks

`bun run check` (27 tasks; api 1,323 tests, worker 552), `bun run build --filter=web` and `bunx oxfmt --check` exit 0. `grep -rn "postStateSql\|inPostsOf" packages apps` is empty. The Open to grep (`match_have|match_sale|takes_swaps|matchHave|matchSale|takesSwaps` in `packages/api/src` and `apps/worker/src`, tests left out) gives 221 lines; every read of `lists`' own columns is one of:

- the list's own for an off side or a list in no row: `feedListColumns` (`services/trade/feed/entries.ts`, `sideStateOf`'s off side), `resolveTradeSides` (`viewerPostOf`'s off side), `snapshotColumns` in `services/moderation/report.ts` (a list in no row), `onTradeRowsSql`'s type rule for other list types, and the fallback inside `listTradeStateSql` and `sideStateSql`;
- a reader that stays: the planner and `lockPosts` (`services/list/shared.ts`, `lib/trade-post-rows.ts`), `list.edit` (`services/list/edit.ts`), `writeList` (`services/list/create.ts`), `savePost` (`services/trade/post.ts`), list objects (`services/list/read.ts`), `lib/list-pair.ts`, `lib/report-post.ts` and the pure schemas.

Every other hit reads the rows (`on_trade`, `tp.*`) or `listTradeStateSql`.

### 7.2 Set equality

`equality.sql` (old `postsCte` rendered at `8b05487c` against the new one, one read-only statement): 0 rows old-not-new, 0 new-not-old, 0 `post_id` differing from `postRowSql` of its `id`, 381 posts each. It is self-contained for G1 (`psql -f`, read-only).

Also read-only: the dry want-alerts run over the baseline's entries equals the baseline in every field (pairs compared without `postId`); a smoke of `fetchMyPosts` (localtest1, localtest2), `fetchHiddenPosts`, `fetchPostCards`, `staffPosts`, `findTradeList` and `collectionPostCounts` equals the same calls on `8b05487c` (a throwaway worktree outside the repo, removed), and `listedTradeLists` returns the same lists in another order (neither build orders that read); `trade.myPosts` equals 0.1's saved outputs; `trade.people` as localtest1 (no filter, Any, Mutual, `person` = localtest2), parsed through `peopleOutputSchema`, `trade.mutualCount` and `trade.tabCounts` equal 0.1's saved outputs field for field, `postId`, counts and `swapPair` included; both drift scripts read 0 on checks 1 to 7. `EXPLAIN` without `ANALYZE` plans `hidePost`'s new `INSERT` and the worker's new `unhidePosts` `DELETE` in a read-only session, writing nothing.

Not yet run, left to 7.4: `reportedPost` (not exported; it builds on `namedPostsOf` and `sideStateOf`, which the smoke ran), a real hide and unhide, and the picker's `fillMatches` path.

`equality.sql` sits in the scratch folder, which a reboot clears; keep a copy for G1.

### 7.3 Plans

Local, read-only, `EXPLAIN (ANALYZE, BUFFERS)`, warm (the fourth of four runs), localtest1, filter `all`, `fetchPairs` over the baseline's 1,000 entries. Full plans: `explain-base.txt`, `explain-after.txt`.

| Read | `8b05487c` | After |
| --- | --- | --- |
| `fetchBumpPeople` | 2.0 ms plan, 2.2 ms run, 1,371 buffers | 1.4 ms plan, 2.0 ms run, 1,353 buffers |
| `fetchTradeCandidates` | 1.6 ms plan, 6.0 ms run, 2,177 buffers | 1.6 ms plan, 3.4 ms run, 4,833 buffers |
| `fetchPairs` | 1.5 ms plan, 5.4 ms run, 6,602 buffers | 1.4 ms plan, 11.9 ms run, 7,784 buffers |

`posts` now pairs by hash joins on `post_id` (a hash join to `trade_post` and a hash anti join on `on_trade`). Finding for the owner: `fetchPairs`' anti join on `want_alert_sent` moved from an index-only scan of its primary key (189 loops) to a materialized seq scan (749 rows × 189 loops, about 3 ms of the 6.5 ms added), after the recipient's `LATERAL` flags raised the estimate of the rows above it. On production `want_alert_sent` is far larger, so the planner may keep the index there; the job runs once a minute. `fetchTradeCandidates` is faster but reads 4,833 buffers against 2,177: the per-list `listTradeStateSql` reads in `my_lists` and the per-row pairing.

### After review

- **`fetchPairs`' recipient flags** (`apps/worker/src/job/want-alerts/pairs.ts`): the per-pair `listTradeStateSql` subqueries are now one CTE, `list_flags` (`bool_or` of each flag over `on_trade`, grouped by list), left-joined to `wl` and `ol` and read as `coalesce(flag, the list's own)`. Same meaning: `on_trade` applies `listTradeStateSql`'s type rule (a want list's Open to and a sale list's `takes_swaps` from the row, every other list's own), and every recipient list is matchable (`wl` is a want list; `ol` passes `boundOfferListSql`), so `on_trade`'s matchable filter drops none of them. The dry want-alerts run still equals the 0.1 baseline in every field; the want-alert-match tests and the worker checks pass. Plan: the `want_alert_sent` anti join is back on an index-only scan of its primary key (189 loops), 1.2 ms plan / 10.4 ms run, 6,392 buffers (`explain-after2.txt`; before the fix 11.9 ms, 7,784 buffers; at `8b05487c` 5.4 ms, 6,602). What remains is the reverse branch: the planner estimates `on_trade` at 30 rows (439 actual), so it nested-loops over the `list_flags` CTE (262 rescans, about 3 ms). A variant built straight from `trade_post` was slower (12.4 ms) and was not kept.
- **`listedTradeLists`** (`packages/api/src/services/trade/feed/shared.ts`) orders by `lists.id`, since the picker's tags and the near reads take its order.

### 7.4 Local pass

Local database only, dev server on port 3210, one isolated browser context per account, sign-in by `fetch` after the page loaded (localtest5 by a local `session` row). Drift after each step reads 0 on checks 1 to 7, except check 2 (13168) while (e)'s row existed.

1. The old and the new drift scripts: 0 on checks 1 to 7.
2. Saved: lists, rows, hides and sessions of the three accounts (`s74/*.tsv`), equal to 0.1's.
3. Steps:
   - (a) All 20 outputs 0.1 saved equal it field for field, `postId` included; Browse and For you screenshots are pixel-identical to 0.1's.
   - (b) As localtest1, hiding localtest2's "lt2 spares" post (row 1000303) took it off Browse and For you, and their "they have" count went 4 → 3; unhiding brought both back (4).
   - (c) As localtest2, Your posts lists the five posts with their tags, kinds and bumps (`trade.myPosts` and the person page).
   - (d) As localtest1, a report naming the want half (13402) stored the snapshot of the pair (13168 with 13402, WTT and WTB, `onTrade` true). The moderator console's reads (`accountDossier`, `reportQueue`, read through the services as staff sign-in is not covered by the approval) show it as posted with its tags. A post card sent in conversation 397 naming 13402 shows the pair's post.
   - (d2) Localtest1's off-Trade want list 13175 ("lt1 paired wants", Swaps or buying) held nothing, so a temporary entry was added (`autumn26-giwoong-101z`, on localtest2's Sell only sale list only): For you's count against localtest2 rose 4 → 5. Edit list → Swaps only took it back to 4, the row's copy of Open to staying as it was (off Trade). Set back to Swaps or buying through Edit list; the entry was deleted.
   - (e) A second row for 13168 by local SQL (row 1000519: lead 13168, no want list, on Trade, `match_have` false, `match_sale` true): drift check 2 read 1 (13168). Browse showed both posts, the pair with WTT and WTB, the new one with WTT; For you counted 4, the same matches through either post. Hiding "lt2 spares" hid row 1000303 only: row 1000519 stayed shown and counting (4).
   - (f) Before (e)'s row: the dry run equals 0.1's baseline in every field. After it, with row 1000303 hidden: a hand entry `autumn26-sunjae-222z` on 13168 gave two pairs for localtest1's want list 13172 (one per row, row 1000303's `hidden`), one group, one alert (Any) and one unhide, for row 1000303 only. The entry was deleted.
   - (g) As localtest5: `trade.people` (no filter, Any) and `trade.myPosts` answer 200, Browse says "You have no posts on Trade" and For you "Nothing to match yet", no error.
   - (h) The server logged no error. The client logged the `ResizeObserver loop` warnings 0.1's baseline also logged, and, while (e)'s row existed, 10 React errors "Encountered two children with the same key, `13168`": the web keys posts by `id`, the anchor list (`apps/web/src/features/trade/person-row-view.tsx:262`, `my-posts.tsx:185`), and a list in two posts gives two posts that id. The owner accepted it as a known finding: no list can be in two posts in production until `shared-lists` lifts `planPost`'s refusal, so only (e)'s hand-made row shows it. Before `shared-lists` ships, those two keys must take `postId` (`post-id-inputs` or `shared-lists`). No `.tsx` change in this change.
4. Put back: row 1000519, the hide, report 17, message 2543 and the seven sessions the pass made deleted; conversation 397's last message restored to 2542; list 13175's `updated_at` restored. The three accounts' lists, rows, hides and sessions equal 0.1's snapshot, list 13175's whole row equals its saved copy, no entry above 1,837,936 remains, and both drift scripts read 0. Local Valkey: localtest1's and localtest2's For you versions bumped so no cached match holds the pass. The dev server is stopped, the browser contexts closed, and the dev log holds no credential.
- **8.1, G1** (production, read-only, 2026-11-21, after `345273b6` was pushed).
  - The old drift script (`8b05487c`): checks 1 to 7 at 0 each, over 1629 rows. Note 1 read 5 (offers 8764, 9443, 11229, 11753, 12274: offers on posts Edit post re-led since `trade-post-planner-shared`, information). Note 2 read 9.
  - 7.2's set equality: `old_not_new` 0, `new_not_old` 0, `post_id_not_post_row` 0, 1462 posts in each.
  - `fetchPairs` over the last 1,000 entries, three warm-up runs: new 401, 214 and 239 ms; old (`8b05487c`, a throwaway checkout outside the repo, removed) 497, 337 and 238 ms. The new plan probes `want_alert_sent` by its primary key (index-only, 1727 loops).
- **8.2.** The owner brought up web and the worker from `345273b6` and opened `/trade`, For you and Your posts, reported done by 15:42 UTC on 2026-11-21. The time each came up was not recorded.
- **8.3, G2** (production, read-only, 15:42 UTC).
  - The new drift script: checks 1 to 7 at 0 each, over 1630 rows. Note 1 read 5 and note 2 read 9, unchanged from G1.
  - Sentry (`objekt-tracker`): no issue seen in the hour after the deploy.
  - Rollback floor: web and worker `8b05487c`, with no data step.

### 9.1 Agent docs

Checked against `345273b6`, with `writing-for-agents` loaded; every code name the three files cite was looked up in the source.

- `packages/api/docs/trade.md`: the bump cooldown names `turnOnBumpedAt` (`services/list/shared.ts`) for `personBumpedAt`, which no code defines; `postPartnerSql`'s readers add `list.edit`'s guards on a paired list; `postRowSql` is described as it is now used, `listPostSql`'s fallback, with `postRowOf` naming a list's row for the writers.
- `apps/worker/AGENTS.md`, Want alerts: the recipient's flags in `pairs.ts` come from the `list_flags` CTE (the review's fix), and why; `context.ts` still reads `listTradeStateSql`.
- `packages/db/AGENTS.md`, Trade posts: "until the readers take more" now says the readers take rows, and only `planPost`'s refusal and drift check 2 keep one row per list until `shared-lists`.
- `packages/api/AGENTS.md`: the domain-docs table's Trade row adds `trade-post-state.ts`, the new pure module that `docs/trade.md` governs (oxfmt realigned the table).
- `apps/web/AGENTS.md` and the root `AGENTS.md` need no change: neither describes how posts are read or keyed.

Known findings for later, not fixed here: the web keys feed posts by `post.id`, the anchor list (`apps/web/src/features/trade/person-row-view.tsx:262`, `my-posts.tsx:185`, recorded under 7.4 (h)), which must become `postId` before `shared-lists`; and `sideOnTradeSql` (`lib/trade-sql.ts`) has no caller since `fetchOwnTradeLists` went, so `knip` may list it.

### Incident 2026-11-21: For you's candidates read

**What happened.** After `345273b6` went live, `fetchTradeCandidates` (`services/trade/matches/candidates.ts`) ran 17 to 21 at once, 30 s to 5 min each, and production's main Postgres reached 150% CPU at load 22. Web was rolled back to `8b05487c`; the worker stayed on `345273b6`. The worker runs this read too: want alerts ask `mutualPartnerIds` (`services/trade/matches/recount.ts`) for Can swap recipients, which calls `recountPartners` and so `fetchTradeCandidates`, narrowed by `ownerIds` to the alert's partners. So the fix ships to the worker as well as to web. A read-only repro for a heavy user (4 want lists, 3 have or sale lists, about 31,000 entries) ran past 90 s, where the feed's read of the same CTEs takes 0.5 s.

**Cause.** The planner estimated whole CTEs at one row and chose nested loops over CTE scans, which grow with the product of their sizes:

- `my_want` and `my_have` joined the `my_lists` CTE (`listTradeStateSql` per list) instead of `lists`. A CTE has no column statistics, so the join to `list_entries` was estimated at one row per list and the grouped `my_want` at 1 (locally 1 against `8b05487c`'s 296). With `partner_lists` also at 1, the planner crossed `my_want` with `partner_lists` and then probed `list_entries` by slug for every pair.
- `partner_sides` tested `(post_id, id) IN (listed_posts)`, a two-column semi-join whose selectivity multiplies to about one row, then `post_id NOT IN (hidden rows)` and the partner anti joins.
- `partner_post` self-joined `partner_sides`, and `matched_keys` semi-joined the `matched` CTE inside those loops.

**Fix** (same output):

- `my_side_flags`: the viewer's sides on Trade, grouped by list from `trade_post` (`user_id` index), the union `listTradeStateSql` takes. `my_want` and `my_have` go back to `8b05487c`'s join of `list_entries` with `lists` and take the flags by `LEFT JOIN` with `coalesce` to the list's own. A left join never lowers the outer estimate, so `my_want` is estimated as it was before (296).
- `partner_posts`: the partner's posts filtered once on `posts`, as the feed filters them (listed, not hidden by row, `tradePartnerSql`, `ownerIds`). `partner_lists` takes each post's sides from it (the anchor's flags and the partner's `partner_match_*`; a paired half is always a want list, whose `takes_swaps` no rule reads) and `lists` for type and `updated_at`. `partner_post` is the posts with a partner: no self-join, and a pair's halves pass together, as before.
- `all_posts AS MATERIALIZED (SELECT * FROM posts)`: the read names `posts` once, so Postgres would inline it into `partner_posts`, where the filters shrank its estimate and its anti join became a nested loop over `on_trade` per post. Both earlier builds named `posts` twice, which materialized it.
- `post_of` and `post_leads` are built for every partner list, and the new pure `keyMatchedLists` (`lib/trade-rank.ts`, tested) keeps the matched lists' keys and their leads. No CTE is semi-joined to `matched` any more.
- `packages/api/docs/trade.md` (Can swap) says what the CTEs must keep, and points to this As built, which leaves `openspec/changes/` when the change is archived (git keeps it).

**Proof.**

- `bun run check` (api 1,325 tests, the model test included; worker 552), `bun run build --filter=web` and `bunx oxfmt --check` exit 0.
- Output, local and read-only: `fetchTradeCandidates` for every local account with a matchable list (562 viewers, filters `all` and `mutual`, 382 candidates, 107 of them with post keys) and for localtest1, localtest2 and localtest5 (all four filters, hidden posts skipped and kept) equals `345273b6`'s output exactly and `8b05487c`'s with each post key read as its lead. `trade.people` for localtest1 (no filter, Any, Mutual, person), localtest2 and localtest5 (no filter, Any), `mutualCount` and `tabCounts` equal 0.1's saved outputs. The two older builds ran in throwaway worktrees outside the repo, since removed. On the fixed build, each of 764 reads narrowed by `ownerIds` to one person (every local viewer, `all` and `mutual`, hidden posts skipped and kept) equals that person's entry in the unrestricted read.
- Plans, local, `cand-explain.ts`, warm (third run), viewer localtest1. The local data is too small to show the blow-up, so the buffers and estimates are the signal:

  | Build | Planning | Execution | Buffers | `partner_lists` est / actual | `my_want` est / actual |
  | --- | --- | --- | --- | --- | --- |
  | `8b05487c` | 7.6 ms | 6.9 ms | 2,205 | 12 / 31 | 296 / 7 |
  | `345273b6` | 5.5 ms | 10.6 ms | 4,858 | 1 / 31 | 1 / 7 |
  | fixed | 2.5 ms | 8.7 ms | 2,240 | 8 / 31 | 296 / 7 |

  The local data is far too small to show the blow-up, so the evidence is the plan's parity with `8b05487c`: the same buffers, `my_want` estimated at 296 again, and `matched` run as `8b05487c` ran it, `partner_lists` → `list_entries` by `list_id` → a hash join on `my_want`. In the fixed plans no CTE is scanned more than once; the only nodes without an index that run per row are the per-post `VALUES` laterals and the partner rules' small `user_block`, `hidden_trade_partner` and `user_sanction` scans, as in `8b05487c`. The production `EXPLAIN` is the real gate. Localtest2: 13.3 / 5.8 / 10.0 ms run, 2,173 / 4,600 / 2,217 buffers. Plans and logs: `/private/tmp/claude-501/reads-by-row/cand-plan-*.txt`, `cand-explain-*.log`.

**For production** (the owner's go-ahead, read-only): `/private/tmp/claude-501/reads-by-row/cand-explain.ts` explains this read for one viewer on any build. Copy it into the build's `apps/worker/.reads-by-row/` and run `VIEWER=<user id> BUILD=<label> PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=60000' bun run --env-file=<repo>/.env .reads-by-row/cand-explain.ts`, then remove the folder. It refuses to start unless `transaction_read_only` is on, and the explained statement also runs under `SET LOCAL statement_timeout` of 60 s. It prints planning and execution time, the CTEs with the nodes of 1 ms or more, the rescanned nodes that use no index, and the 15 worst estimates. When `EXPLAIN ANALYZE` passes 60 s (as `345273b6`'s will on production), it catches the cancel and prints the plain `EXPLAIN` with estimates only; `PLAN_ONLY=1` prints only that, executing nothing. `OUT=<file>` saves the full plan. Tested locally: the read-only refusal, the cancel fallback (`TIMEOUT_MS=1`, test only), `PLAN_ONLY` and the full run.

**Same pattern elsewhere, not changed:** the worker's `fetchPairs` (`cand` tests `(post_id, id) IN (listed_posts)`) has the same two-column semi-join; locally it is fine and production's worker on `345273b6` has not shown a problem, but its `cand` estimate can fall to one row the same way. The feed reads use `posts` directly and were fine on production.
- **Production timing of the fix** (read-only, 2026-11-22, with the owner's go-ahead). It used the three heaviest For you users by entries on Trade: user 1 has 6 lists with 21,823 want entries, user 2 has 4 lists with 13,362, and user 3 has 13 lists with 11,883 want and 1,233 offer entries. `cand-explain.ts` ran with a 60 s statement timeout. The old build ran from a throwaway checkout outside the repo, since removed.
  - Execution times in ms, three runs each (first cold, then warm):

    | User | Old (`8b05487c`) | Fixed |
    | --- | --- | --- |
    | 1 | 1848, 884, 972 | 898, 939, 893 |
    | 2 | 979, 759, 856 | 858, 788, 858 |
    | 3 | 1119, 907, 1082 | 1776, 1156, 1021 |

  - The broken build (`345273b6`) ran plan-only so nothing executed. It estimates `partner_lists` at 1 row in each of its rescanned spots, the nested-loop shape that blew up.
  - In the fixed plan, `partner_lists` is still estimated at 1 row (actual about 850 to 1,160). It is now scanned once (loops=1), as the outer side of an index lookup into `list_entries` by `list_id`. That is the old build's shape, so the estimate no longer multiplies into rescans. The largest repeat in the plan is about 2,600 memoized `lists_pkey` probes. This remains a watch item for `shared-lists`.

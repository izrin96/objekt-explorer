## Context

See proposal.md for why. This is change 4 of the shared-lists chain:

`trade-post-state` → `trade-post-hides-by-row` → `trade-post-planner-shared` → **this change** → `trade-post-reads-by-row` → `post-id-inputs` → `offer-reads-post-id` → `shared-lists`.

The scope comes from `trade-post-planner-shared` (decision 12 and Inputs), which went live on 2026-11-21 as `6f4de4c2`. The owner's decisions of 2026-11-16 still bind it: Bump stays per person, and a post's Trade state is per post.

Paths are under `packages/api/src/` unless they say otherwise. Line numbers are from `38f516a1`, the same code as production.

**Every bump already lives on the rows.**
- Each `trade_post` row holds `lead_bumped_at` and `want_bumped_at`.
- `rowStateOf` sets them from the write, and `bumpPerson` sets them on Bump.
- `writePosts` then copies each list's latest side bump into `lists.bumped_at` (`lib/trade-post-rows.ts:601-625`, `services/list/shared.ts:177-188`). Drift check 5 holds the copy equal for every list in a row.

**What reads or writes `lists.bumped_at`**, and where each goes:

| Site | Use | After |
| --- | --- | --- |
| `services/list/shared.ts:27-29` `personBumpedAt`, behind `turnOnBumpedAt` (`:35-38`), read by `lockPosts` (`:96`) | the person's last bump: the turn-on bump time | the rows (decision 1) |
| `services/trade/feed/mine.ts:81-87` `lastBumpOf` | Your posts' `lastBumpAt` and `nextBumpAt`; Bump's refusal | the rows (decision 1) |
| `mine.ts:100-125` `bumpPerson` | writes lists, and the sides that hold them; cooldown at `:106-110` | rows only (decision 3) |
| `lib/trade-sql.ts:72` `postStateSql("bumpedAt")` | falls back to the list's own value when the list is in no row (text pinned at `lib/trade-sql.test.ts:151-152`) | null (decision 1) |
| `services/list/read.ts:140`, `:206`; `schemas/list.ts:83` | `PublicList.bumpedAt`, on `/rpc` and `/api/v1` | removed (decision 1, the owner's answer 3) |
| `lib/trade-post-rows.ts:271` `TradeListState.bumpedAt`; `:427`, `:434` `rowStateOf` fallbacks; `:316` `ListSummary`; `:484` `laterBump` and `:601-625` the summary | planner input and output | gone (decision 4) |
| `services/list/shared.ts:137` `tradeState`, `:180-185` `writeLists`, `:232` the `created?.bumpedAt` fallback | the planner's read and write | gone; the fallback takes `createdAt` (decision 4) |
| `services/list/create.ts:197` | the insert sets it | gone (decision 4) |
| `apps/worker/src/script/trade-post-drift.ts:12`, `:79-92` | check 5's bump half | gone (decision 7) |
| `packages/db/src/schema.ts:111`, `:129-131` | the column and `lists_trade_feed_idx` | step 1 removes them from the schema, step 2 drops the column (decisions 5 and 6) |
| model test `:59`, `:108-116`, `:134`, `:240`, `:268-270`, `:532-537`, `:669-670`, `:863-865`, `:1079-1113`; `trade-post-rows.test.ts` `rowStateOf` (`:909-1045`), the summary cases (`:1120-1255`) | tests | updated (decision 8) |

**Not this column, and unchanged:**
- `postsCte`'s `bumped_at` (`services/trade/feed/query.ts:35`) reads the sides through `onTradeSql`.
- The feed cursor (`schemas/trade.ts:117`), post `bumpedAt` (`schemas/trade.ts:232`, `lib/trade-posts.ts`) and the web (`features/trade/post-time.ts`, `person-row.ts`) read post bumps, which come from the rows.

No reader of `bumped_at` was found that can't move to the rows. A grep of `apps/web/src` for `bumpedAt` finds only post bumps: `features/trade/post-time.ts` (fed `trade.myPosts` posts, `my-posts.tsx:253`) and `features/trade/person-row.ts` (feed posts). No web code reads a list's `bumpedAt`.

**`lists.discoverable` stays.** It stays derived by `writePosts` (owner answer (a), `trade-post-state` Open Question 1). Its readers (the Marketplace, offers, the picker, chat cards, the list page, `visibleOnTrade`, want alerts) move in `trade-post-reads-by-row` or later. Nothing here plans to drop it.

## Goals / Non-Goals

**Goals:**
- Nothing reads or writes `lists.bumped_at` or `hidden_trade_post.list_id`, and then both columns are dropped.
- List objects no longer carry `bumpedAt`.
- Bump bumps the sides on Trade.
- With one row per list, every bump, cooldown, turn-on time and feed order equals today's, apart from decision 2's case.
- The two `lists` indexes are settled.

**Non-Goals:**
- Moving any other reader to the rows.
- Lifting `planPost`'s refusal.
- Any `.tsx`, message, `/rpc` input or cache-key change. Removing `bumpedAt` is an output change.

## Decisions

### 1. Bump readers read the rows

One helper goes in `lib/trade-sql.ts`, beside `postStateSql`, with its text pinned in `trade-sql.test.ts`, as the module's other helpers are:

- **`personBumpSql(userId)`:** the latest bump of any side of the person's rows, on Trade or not:

  ```sql
  (SELECT max(greatest(tp.lead_bumped_at, tp.want_bumped_at)) FROM trade_post tp WHERE tp.user_id = $1)
  ```

  - It reads through `trade_post_user_id_idx`. `greatest` skips a null.
  - `personBumpedAt` (so `turnOnBumpedAt` and `lockPosts`' `bumpAt`) and `lastBumpOf` both use it.
  - Off sides count, as off lists count today (`shared.ts:23-26`). So taking a post down and putting it back can't stand in for Bump.
**List objects lose `bumpedAt`** (the owner's product decision, 2026-11-21, which allows the break):
- It leaves `baseListSchema` (`schemas/list.ts:83`), `toPublicList` (`services/list/read.ts:140`) and the profile lists read's columns (`:206`).
- So it leaves `list.findPublic`, `list.find` and `profiles.lists` on `/rpc`, and `GET /api/v1/lists/{slug}` and `GET /api/v1/profiles/{address}/lists`.
- No input changes, so open tabs still validate. An open tab reads an absent `bumpedAt` as `undefined`, which the old schema's `nullish()` allows, and no web code reads it.
- The `api-openapi` delta adds the requirement. Stable contracts is about reorganizing schemas with no change to any body, not a decided removal, so it stays as it is.

`postStateSql("bumpedAt")` loses its no-row fallback and reads null for a list in no row:
- A list on Trade is always in a row (drift check 1).
- Of the readers of `feedListColumns`, only `staffPosts` (`services/trade/feed/post-cards.ts:161-163`) can select a list in no row, and it outputs no bump.

### 2. A list in no row loses its bump

The summary keeps `lists.bumped_at` for a list in no row (`trade-post-rows.ts:621`), so the column can hold a bump that no row holds. Decision 12's "equal" holds only for lists in a row.

**Two writes leave a list in no row:**
- An off-Trade want list is unpaired. Rule 2 of `planPostRows` gives a want list a row only when it is on Trade or already leads one (`trade-post-rows.ts:117-119`).
- A lead is deleted while its want list is off Trade. The row is re-led only when the want list is on Trade.

**When it changes anything.** Only when the lost side held the person's latest bump, and no other side was bumped as late. Bump stamps every on side at once, so the bumped post must have been the person's only post on Trade, or every other one is also deleted or unpaired. For example, a person bumps their one post, takes it down within 24 hours, then deletes its have list (or unpairs a want-only Swap post).

**After this change:**
- A post they put on Trade within the same 24 hours takes `now()`, not the earlier bump. It sorts as freshly bumped, and Bump's cooldown runs from that turn-on.
- Your posts shows that turn-on as the last bump.

**Accepted by the owner** (Open Question 2): the path is narrow, and it costs at most one early return to the top of Browse.
- Keeping that bump would need a parked row for every list that leaves the rows, which is a planner change (`shared-lists` territory).
- Gate G1 counts the people for whom it would matter today.
- It contradicts `web-trade-browse` Bump ("counting … lists since taken off Trade") for a list that left every post. So the delta in `specs/web-trade-browse/spec.md` narrows that sentence and adds one scenario. `web-lists` Show on Trade defers to Bump, so it stays as it is.

### 3. `bumpPerson` bumps the sides on Trade

One statement under `lockTradeLists`, as today:

```sql
UPDATE trade_post SET
  lead_bumped_at = CASE WHEN lead_on_trade THEN now() ELSE lead_bumped_at END,
  want_bumped_at = CASE WHEN want_on_trade THEN now() ELSE want_bumped_at END
WHERE user_id = $1 AND (lead_on_trade OR want_on_trade)
  AND NOT EXISTS (SELECT 1 FROM trade_post x WHERE x.user_id = $1
    AND greatest(x.lead_bumped_at, x.want_bumped_at) > now() - make_interval(hours => 24))
RETURNING now()::text AS bumped_at
```

**The cooldown** reads every side of the person's rows, on or off: the same set `personBumpSql` reads, as today's reads every list (`mine.ts:107-111`). The per-list `bumped_at IS NULL OR … <= cutoff` goes, since the `NOT EXISTS` implies it.

**`matchableList` goes.** An on side always holds a list that can be on Trade:
- `resolveDiscoverable` at create, and `planPost`'s refusals, turn on only such lists;
- `isProfileBind` never changes after create (`services/list/edit.ts:78-81`).

**The lock stays.** Every row writer takes `lockTradeLists` first, so under it no post writer is mid-flight. A row it inserted is visible to this statement's snapshot.

**Equal to today with one row per list.** Today bumps every list on Trade and every side that holds one. A list is on Trade exactly when its one side is on. With shared lists it bumps only on sides, as `planner-shared`'s Inputs asked. A bumped side's list bump is no longer written.

**What it returns is unchanged:** the bump, or with no row updated, `lastBumpOf` (now from the rows) and the same refusal (`mine.ts:128-138`).

### 4. The planner and writers drop the list's bump

- **`TradeListState` and `ListSummary` lose `bumpedAt`.** The summary is `discoverable` alone, so `ops.lists` carries only lists whose `discoverable` changed. `laterBump` and its unit case go. `writeLists` sets `discoverable` only. `tradeState` (`shared.ts:133-141`) drops the column.
- **`rowStateOf`'s two fallbacks to the list's bump become null:**
  - a side with no intent and no old side (`:427`);
  - an intent off with no old side (`:434`).

  Both are an off side of a list entering the rows. No read takes an off side's bump: `postsCte` and `fetchOwnTradeLists` read sides on Trade. A later turn-on takes `bumpAt`.

  Today the list's value is not always null there. It isn't for a list that was on Trade before rows existed, or one that left the rows (decision 2) and comes back off. Such an off side then holds null where today it holds the old bump, and `personBumpSql` misses that bump: decision 2's case, nothing more.
- **`writeList`'s insert stops setting it** (`create.ts:197`).
- **The `bumpAt` fallback** (`shared.ts:232`) becomes the created list's `createdAt`, which the insert returns.
  - The fallback runs only when the person had no have, sale or want list at the lock. Then they have no row, so `turnOnBumpedAt` is `now()`.
  - `created_at`'s default is that same transaction's `now()`, in the same text form as the bump columns.
  - `createdAt` rides beside the inserted state, not in `TradeListState`.

### 5. Indexes: one `discoverable` index replaces both

**Evidence:**
- **`lists_trade_feed_idx`** (`bumped_at DESC, id` WHERE `discoverable`) must go with the column. Production's `EXPLAIN` (`trade-post-state` 11.3, 2026-11-20) found it in one plan only: the Marketplace's `countedListings` (`services/market/aggregate.ts:28-35`), as a bitmap scan for its `discoverable` predicate (2,726 index rows, 445 sale lists kept, 162.4 ms in all). No read orders by `bumped_at` since `trade-post-state` part B.
- **`lists_trade_discoverable_idx`** (`list_type` WHERE `list_type IN ('have','want') AND discoverable`) was in no plan. It leaves out sale lists, so neither the market's read nor want alerts' (`apps/worker/src/job/want-alerts/index.ts:48-51`, which includes bound sale lists) implies its predicate. Every other `discoverable` read also filters by `user_id`, `slug` or `id`, which have better indexes.

**Decision.** Step 1's migration drops `lists_trade_feed_idx` and recreates `lists_trade_discoverable_idx` as `lists (list_type) WHERE discoverable`:
- **The key** narrows the market's `list_type = 'sale'`.
- **The predicate** is implied by both the market's read and want alerts' read.
- **The name** stays, since the meaning is the same and `db:generate` writes a drop and create for a changed predicate.
- **Cost.** About 2,100 entries, so the write cost is nothing.
- **Why step 1:** expand before contract, so the market never runs without an index, and the old build depends on neither index for correctness.

**Rejected:**
- **No replacement.** The market would fall to a sequential scan of `lists`. Accepting that would need an `EXPLAIN` we don't have.
- **Deciding from `pg_stat_user_indexes`.** `idx_scan` is cumulative since the last reset and includes the feed's scans from before part B, so one read proves nothing.
- **Keeping the feed index until step 2.** It goes with the column anyway, and dropping it in step 1 lets gate G2 see the market's real plan.

### 6. Two steps

The house pattern is `retire_linked_list_id`, then `drop_linked_list_id` (`packages/db/AGENTS.md`, Migrations run before the deploy).

**Step 1, `retire_contract_columns`, ships with the code.**
- `schema.ts` loses `lists.bumpedAt` and `lists_trade_feed_idx`, gets the new `lists_trade_discoverable_idx` predicate, and loses `hiddenTradePost.listId` and `hidden_trade_post_list_id_idx`.
- Replace the generated `DROP COLUMN`s and the `hidden_trade_post_list_id_idx` drop with a comment: both columns stay, since the build live while the migration runs still writes them. The hide index goes with its column in step 2.
- Keep the `lists` index statements under the usual `lock_timeout` header (3 s, as `trade_post_state`):

  ```sql
  DROP INDEX IF EXISTS "lists_trade_feed_idx";
  DROP INDEX IF EXISTS "lists_trade_discoverable_idx";
  CREATE INDEX "lists_trade_discoverable_idx" ON "lists" ("list_type") WHERE discoverable;
  ```

- **Locks.** It touches `lists` alone, so it can't deadlock. A non-concurrent `CREATE INDEX` (drizzle runs a migration in a transaction) holds writes on `lists` for the build of a small partial index.

**Step 2, `drop_contract_columns`.**
- Generated with `--custom`, since `schema.ts` already lacks both columns. It takes `lists` first, then `hidden_trade_post` with `NOWAIT`, as `packages/db/AGENTS.md` (Trade posts) asks of a migration that touches both:

  ```sql
  SELECT set_config('lock_timeout', '1s', true);
  LOCK TABLE "lists" IN ACCESS EXCLUSIVE MODE;
  LOCK TABLE "hidden_trade_post" IN ACCESS EXCLUSIVE MODE NOWAIT;
  DROP TRIGGER IF EXISTS "hidden_trade_post_fill_post_id" ON "hidden_trade_post";
  DROP FUNCTION IF EXISTS "hidden_trade_post_fill_post_id"();
  ALTER TABLE "hidden_trade_post" DROP COLUMN IF EXISTS "list_id";
  ALTER TABLE "lists" DROP COLUMN IF EXISTS "bumped_at";
  ```

- **The trigger and its function go by hand.** Drizzle's snapshot doesn't track them. The function reads `NEW.list_id`, and Postgres doesn't track a plpgsql body's columns, so the column drop alone would leave a trigger that fails.
- **What the drops take.** Dropping `list_id` takes `hidden_trade_post_list_id_idx`. `DROP COLUMN` rewrites no data, and `IF EXISTS` covers a database that already lacks either column.
- **If it fails** on the lock or `NOWAIT`, it is rerun at a quiet time.
- **The file must not exist at step 1's push.** Migrate runs every folder it hasn't recorded, so step 1's migrate would run it while `6f4de4c2` still writes both columns. It is written after step 1 is live (task 8.1).
- **Precondition:** web and worker both run step 1's commit or later. `6f4de4c2`'s web reads whole `lists` rows (`readList`, `read.ts:98-103`), inserts `bumped_at`, and writes `list_id` in `hidePost` and `writeMoves`, so it fails without the columns. The worker's own jobs name their `lists` columns, but the api services it imports were not all checked, and it is rebuilt by hand, so the precondition names it too.

**Rollback floors:**

| After | Web and worker may go back to | Cost |
| --- | --- | --- |
| step 1's migrate | any build allowed today (web ≥ `2f107ab3`, ≥ `1a062e41` to keep hide moves) | the market reads through the new index |
| step 1's deploy | web ≥ `1a062e41`, e.g. `6f4de4c2` | the old build reads a stale `lists.bumped_at`, so bring up the old images, then run the reconcile below at once (approved by the owner for this case). A hide made under step 1 has no `list_id`, which builds older than `1a062e41` read, so none of them may run (decision 9) |
| step 2 | step 1's commit only | going lower needs a migration that re-adds both columns, then the reconcile, before the old images |

**The reconcile** is drift check 5's derivation as an update. Each list in a row gets its latest side bump:

```sql
UPDATE lists l SET bumped_at = s.bumped_at
FROM (SELECT side.list_id, max(side.bumped_at) AS bumped_at
      FROM trade_post tp
      CROSS JOIN LATERAL (VALUES (tp.lead_list_id, tp.lead_bumped_at),
                                 (tp.want_list_id, tp.want_bumped_at)) side(list_id, bumped_at)
      WHERE side.list_id IS NOT NULL GROUP BY side.list_id) s
WHERE l.id = s.list_id AND l.bumped_at IS DISTINCT FROM s.bumped_at;
```

**Without the reconcile, the old build:**
- lets a person who bumped under step 1 bump once more within 24 hours;
- gives a turn-on within 24 hours of such a bump `now()`;
- shows an older `lastBumpAt`;
- fails its own drift check 5.

It loses no data, and its `writePosts` rewrites the lists of each component it writes. Run after the old images are up, the reconcile catches every bump made before it, and the old build keeps lists and rows in step from then on.

### 7. Drift

- Note 3 ("a hide that a build before hidden_trade_post_by_row reads differently", `trade-post-drift.ts:138-142`), the last reader of `hidden_trade_post.list_id`, goes in step 1's commit, with the header's sentences on it (`:20-23`). From step 1 on, every new hide has a null `list_id`, so the note would count them all.
- Check 5 becomes "a list whose Trade state disagrees with its rows (list ids)": the same query without the `bumped_at` comparison. It changes in step 1's commit, because the old script fails once anyone bumps under step 1.
- The header loses its sentence on `bumped_at`.
- The gates use the old script (`6f4de4c2`) only before step 1's deploy, and the new one after.

### 8. Proof, kept light

This change moves readers over small data: about 1,600 rows and 2,100 lists on Trade. So:

- **Pure tests.**
  - `trade-sql.test.ts` pins `personBumpSql` and the new `postStateSql` text.
  - `trade-post-rows.test.ts` updates the `rowStateOf` and summary cases, and drops `laterBump`'s case.
  - `trade-post-rows.model.test.ts` drops the bump from the rows world's lists:
    - `ops.lists` carries no bump (`:240`);
    - the differential's list comparison (`sorted`, `:870-876`) leaves out `bumpedAt`, since only the legacy world's lists keep one;
    - equation E's bump half (`checkStates`, `:863-865`) holds for sides on Trade only, and reads the bump from the legacy world's list of the same id, which still keeps one as its reference. Off sides part ways in decision 2's case: a want list unpaired off Trade leaves the rows with its legacy bump, and a later pair brings it back off with a null side. `planner-shared`'s decision 10 allowed this cut, the half check 6 also reads;
    - shared-run assertion 4 (`:1105-1113`) keeps its `discoverable` half;
    - the rows world's `bump` write (`:665-672`) bumps on sides only.

  The legacy world keeps its list bumps, since they are how it derives row bumps.
- **The model test's differential, floors and shared run** stay as they are. Each step adds no differential, mutation testing or frozen copy: the planner's row rules don't change. Only a fallback value and a summary field do, and the unit cases pin both.
- **SQL is proven by running it.** The drift script runs read-only before and after each step. One local pass in the running app covers Bump, Your posts and a turn-on (task 6.2).

### 9. `hidden_trade_post.list_id` goes

**Nothing reads it.** A whole-repo grep (`packages`, `apps`, outside `migrations/` and `openspec/`) finds:
- two writers: `hidePost`'s insert (`services/trade/hidden.ts:101-102`, the anchor as `list_id`) and `writeMoves` (`services/list/shared.ts:199-200`, which carries the newest `list_id` to the target row);
- one reader: drift note 3 (`apps/worker/src/script/trade-post-drift.ts:138-142`);
- the schema (`packages/db/src/schema.ts:246`, `:257`) and the fill trigger's function (`20261120103752_hidden_trade_post_by_row/migration.sql:33-42`), which reads `NEW.list_id`.

`fetchHiddenPosts` names its columns (`hidden.ts:142-150`), and no relation uses `list_id` (`packages/db/src/relation.ts`). Builds before `1a062e41` read it, but the owner put the floor past them.

**Step 1's code stops writing it:**
- `hidePost` inserts `(user_id, post_id)`;
- `writeMoves` drops the `array_agg(hp.list_id …)` column.

Note 3 goes too (decision 7). Step 2 drops the column, its index, the trigger and the function (decision 6).

The doc comments that name `list_id` change with it: `hidden.ts:93-96`, `schema.ts:235-238`, `packages/api/docs/trade.md` (Partner rules, hidden and idle posts) and `packages/db/AGENTS.md` (Trade posts).

## Risks / Trade-offs

- **[A list leaving the rows takes its bump with it]** → Decision 2: narrow, at most one early return to the top. G1 counts it.
- **[Rollback after step 1 reads stale bumps]** → the reconcile (decision 6), approved by the owner for that case. Its effects without it are bounded and lose no data.
- **[Step 2 runs while an old image serves]** → the precondition: the owner confirms both images before task 8.3.
- **[The market's plan changes in step 1]** → the new index is implied by its predicate. G2 records the production plan against 11.3's 162.4 ms, and a worse plan is a finding for the owner. Undoing the index is one migration.
- **[`bumpedAt` leaves `/api/v1` list objects]** → a breaking change the owner chose. The web reads none, and `/rpc` inputs are unchanged.
- **[A hide made under step 1 has no `list_id`]** → only builds older than `1a062e41` read it, and from step 1 on none of them may run (decision 9).
- **[Two changes edit `trade-post-rows.ts`]** → `trade-post-reads-by-row` starts after step 1 lands.

## Migration Plan

1. Build groups 1 to 5, then the local pass (group 6).
2. The owner commits and pushes. CI passes.
3. **G1, read-only, with a go-ahead, before step 1's web comes up:**
   - the old and the new drift script, checks 1 to 7 at 0;
   - the decision 2 count (task 7.1);
   - baseline rows and lists on Trade.
4. The owner runs migrate (step 1's migration), then brings up web and rebuilds the worker from the same commit.
5. **G2, read-only, with a go-ahead:**
   - the new drift script at 0;
   - the market and want-alerts `EXPLAIN` (task 7.3).
6. **Step 2, once step 1 has served for a day:**
   - write the drop migration (both columns, the trigger and its function);
   - apply it locally;
   - the owner commits;
   - G3: the new drift script at 0, and both images confirmed;
   - the owner runs migrate alone;
   - G4: the new drift script at 0.
7. **Rollback:** the table in decision 6.

## Open Questions

Answered by the owner on 2026-11-21:

1. **The reconcile may run on production in a rollback from step 1, for that case only.** Approved. It is the one write that makes `6f4de4c2` exact again (decision 6).
2. **Decision 2's case is accepted.** A want list that left every post takes its bump with it, so a re-post within 24 hours can sort as freshly bumped. The `web-trade-browse` Bump delta writes it.
3. **List objects lose `bumpedAt`** rather than having it filled from the rows. This was overturned by the owner's product decision, which allows breaking `/api/v1`. `listBumpSql` is dropped (decision 1), and the `api-openapi` delta adds the requirement.

New scope from the same answers: `hidden_trade_post.list_id`, its index, its fill trigger and that trigger's function go in step 2, and step 1 stops writing the column (decision 9).

## As built

Groups 1 to 5 and task 6.1, on 2026-11-21, over `38f516a1`. Nothing ran against a database.

**Group 1.**
- `personBumpSql(userId)` sits in `lib/trade-sql.ts` with its text and parameter pinned in `trade-sql.test.ts`. `turnOnBumpedAt` reads `personBumpSql` directly, and its doc comment carries the old `personBumpedAt` sentence: off sides count. It is no longer exported, since nothing outside `shared.ts` uses it. `lastBumpOf` reads `SELECT personBumpSql::text`.
- `postStateSql("bumpedAt")` reads the side's bump with no fallback, so a list in no row reads null. `POST_STATE` keeps only the Open to and `takes_swaps` rules.
- 1.3's grep of `apps/web/src` for `bumpedAt` finds `features/trade/post-time.ts`, `person-row.ts` and `person-row.test.ts`, all post bumps. `bun run typecheck --filter=web` is clean.

**Group 2.** `bumpPerson` is decision 3's statement, with `BUMP_COOLDOWN_HOURS` for the 24 and one difference: it keeps the matchable filter. A `sides` CTE joins each row to its lead and want list, and only an on side whose list passes `matchableListSql` takes `now()` and lets the row update. `matchableList` going was wrong in decision 3. Its premise, that an on side always holds a list that can be on Trade, says nothing of matchability: an unbound have or sale list can be on Trade. Without the filter, such a side was bumped. A person whose only on side held one got a bump and a 24-hour cooldown, where `38f516a1` answered NOT_FOUND. The cooldown's NOT EXISTS still reads every side of the person's rows, as decision 3 gives it. `docs/trade.md` names `personBumpSql` as the read behind the cooldown, `personBumpedAt` and `lastBumpOf`. Its list of reads that stay on `lists` lost those two in this group rather than in 9.1, since 2.1 made it false.

**Group 3.**
- `rowStateOf`'s two fallbacks are null. A unit case pins a list entering a row off with an intent and no side before. `laterBump` and the offset case are gone, and the summary is `discoverable` alone.
- `trade-post-rows.test.ts` changes:
  - "a new post with a list already in a post" now expects `ops.lists` to hold list 7 only. List 3 was already on Trade, and only its bump used to change.
  - The unit tests' list helper (`state`) keeps the bump its side holds as a test-only field (`SideList`), so equation E's cases still pin bumps. The planner reads none from it.
- Model test, as decision 8 lists:
  - The rows world's lists take `discoverable` only.
  - `sorted` leaves out `bumpedAt`.
  - `checkStates(rows, link, at)` checks an on side's bump against the legacy world's list, and an off side's as either that bump or null (decision 2's case).
  - Shared assertion 4 keeps `discoverable`.
  - The rows world's bump stamps on sides.
- Its counts are unchanged from `38f516a1`. The differential's counts: post 5347, takeDown 1511, pair 631, unpair 305, swapWant 113, deleteLead 207, deleteWant 191, createOnTrade 2916, createLinked 593, createLinkedToPaired 141, account 376 and bump 664, each against a floor of 100.
- releads 1499 and editLead 864 (floor 100). D2 248 (floor 50), D3 40 (floor 20), takeover 2 (floor 1), D1 0 (exactly 0).
- The shared run's counts: share 2651 (floor 1000), dropRow 376 (150), downRow 1778 (800), deleteShared 471 (200), mergeShared 36 (15).
- `writeList`'s insert returns `createdAt` beside `tradeState`. `writePosts` takes it as `createdAt`, next to `created`, and uses it when the lock read no `bumpAt`.
- 3.2's grep for `bumpedAt` or `bumped_at` in `services` and `lib` hits no `lists` column.
- 3.3: `hidePost` inserts `(user_id, post_id)`, and `writeMoves` inserts `(user_id, post_id, created_at)`. 3.3's grep (`grep -rn "list_id" packages/api/src apps/worker/src | grep -i hidden`) returns two lines, `services/trade/lists.ts:68` and `:72`. Both are `hide_row.lead_list_id` and `hide_row.want_list_id`, `trade_post` columns read beside `hidden_trade_post`, and neither is the retired column.

**Group 4.**
- `db:generate --name retire_contract_columns` wrote one folder, `20261121094632_retire_contract_columns`. Its snapshot drops both columns, `lists_trade_feed_idx` and `hidden_trade_post_list_id_idx`, and sets `lists_trade_discoverable_idx`'s predicate to `discoverable`.
- Its `migration.sql` was replaced by the `lock_timeout` header, the comment, and the three `lists` index statements. The two drops are `IF EXISTS`, as decision 6 writes them.
- A second `db:generate` found no schema changes.
- `packages/db/AGENTS.md`, Trade posts, records step 1, the columns that stay until step 2, and the `1a062e41` floor.

**Group 5.** Check 5 is "a list whose Trade state disagrees with its rows (list ids)". Note 3 and its header sentence are gone. `apps/worker/AGENTS.md` says two notes. The check 5 sentences in `packages/db/AGENTS.md` and `docs/trade.md` lost the bump half too. The grep for `hidden_trade_post.list_id`, `hp.list_id`, `hiddenTradePost.listId` and `hidden_trade_post_list_id_idx` outside `migrations/` finds only `packages/db/AGENTS.md`, which records the retirement.

**6.1.**
- `bun run check` exits 0 (27 of 27 tasks), and so does `bun run build --filter=web`. Both were run again on the final tree, after the formatting, with `bunx oxfmt --check` clean.
- `bunx oxfmt --check` first flagged `trade-post-rows.ts`, `trade-post-rows.test.ts` and `schema.ts`. These were edits made outside the format hook. `oxfmt` on those three made it clean, and the `lib` tests passed again after.
- The grep `grep -rn "bumped_at\|bumpedAt" packages apps --include='*.ts'` outside `migrations/` returns 114 lines. Each is one of:
  - a `trade_post` side (`lead_bumped_at`, `want_bumped_at`, `side.bumped_at`, `postStateSql`'s side);
  - a post bump (`postsCte`, feed posts, the cursor, `trade-posts.ts`, `trade-people-order.ts`, `post-time.ts`, `person-row.ts`, `mine.ts`);
  - the model test's legacy world, which keeps list bumps as the reference;
  - the unit tests' `SideList` helper.

  None is `lists.bumped_at`.
- `git grep -nE "bumped_at|bumpedAt"` over files other than `.ts`, outside the migrations and `openspec/`, hits:
  - the message key `trade_bumped_at` and its two `.tsx` uses (Your posts' last bump, and a feed post's);
  - `docs/trade.md`'s feed cursor and row sides;
  - `packages/db/AGENTS.md`'s row sides.

  None is a list's bump.

**6.2, on the local database, 2026-11-21, with the owner's approval.** Every database statement went through a wrapper that refuses a `DATABASE_URL` host other than localhost. Redis and Centrifugo were local. The dev server read the indexer through `.env.local`'s read-only production connection, as every local server does. The new drift script ran read-only after every step and read 0 on checks 1 to 7 each time, at 411 rows before and after.

1. **Drift before the migration.** The old drift script (`6f4de4c2`) and the new one both read 0 on checks 1 to 7 before the migration. The old one's notes were 0 too.
2. **Migration.** `db:migrate` applied `20261121094632_retire_contract_columns`. `lists_trade_feed_idx` is gone, `lists_trade_discoverable_idx` is `(list_type) WHERE discoverable`, and `lists.bumped_at`, `hidden_trade_post.list_id` and `hidden_trade_post_list_id_idx` are still there.
3. **Saved rows.** localtest1's and localtest2's 15 lists and 10 `trade_post` rows, and their hides, were saved read-only. There were no hides.
4. **The dev server.** It ran from this worktree on port 3201, since another checkout's dev server held 3200. `SITE_URL=http://localhost:3201` was set for that process only, so Better Auth would accept its origin.
   - Each account had its own tab, in its own isolated context, on the automation Chrome.
   - localtest1 and localtest2 signed in by `fetch` from the hydrated page. No credential reached the dev-server log.
   - The writes and reads were the app's own `/rpc` procedures (`trade.bump`, `trade.myPosts`, `trade.savePost`, `trade.takeDownPost`, `list.create`, `trade.hidePost` and `trade.unhidePost`), sent by `fetch` from each signed-in page. That is the server path the UI calls; a control click went through no part of this change.
   - Pages were loaded for the render checks.

- **(a) Bump.** All of localtest2's sides were on Trade, so post `lt2quiet` (1000452) was first taken off through `trade.takeDownPost`, to give the bump an off side. Then localtest2's side bumps were set 25 hours back.
  - Bump returned `bumpedAt` `2026-11-21T10:07:19.339Z` and `nextBumpAt` 24 hours later.
  - Every on side (rows 1000303, 1000304, 1000305 and 1000439, both sides of each pair) took `10:07:19.339619+00`. The off side kept its `2026-11-20 09:06:57`.
  - `trade.myPosts` gives `lastBumpAt` as the bump and `nextBumpAt` 24 hours later.
  - localtest2 is the first person in localtest1's `trade.people`.
- **(b) Bump again.** It was refused 429 with `trade_bump_too_soon`, and `retryAt` and `nextBumpAt` stayed `2026-11-22T10:07:19.339Z`. Your posts was unchanged and no row changed.
- **(c) Off and on, and a new list.**
  - `lt2sale`, taken off Trade and posted again, kept (a)'s bump. `lt2quiet`, posted again after being off since before (a), took (a)'s bump.
  - A new want list on Trade (13465, `lt2 contract check`) got row 1000517, whose side took (a)'s bump.
- **(d) Outputs.**
  - `GET /api/v1/lists/lt2spares` and `GET /api/v1/profiles/0x2fd7…a394/lists` (4 lists) carry no `bumpedAt`, and neither do their 200 schemas in `/api/v1/spec.json`.
  - `GET /api/v1/trade/people` carries `bumpedAt` on its posts, 23 times.
  - The list page (`/list/lt2spares`, and by profile slug), the profile's lists and the person's post page render.
- **(d2) Hides.** localtest1 hid `lt2spares`' post. The hide row is `(localtest1, 1000303)` with a null `list_id`, and 1000303 left localtest2's posts in localtest1's `trade.people`. After the unhide no hide row was left and the post was back.
- **(e) First list.** `localtest3@local.invalid` already existed locally as `localtest3-noprofile`, with a want list on Trade, a row and trade T-93, so it could not take this role. On the owner's instruction `localtest5@local.invalid` stood in for it.
  - The account (`localtest5-nolists`, email verified, no lists) was made by local SQL, with a session row and its signed cookie, never by app sign-up.
  - Its want list on Trade (13466) was created, and its row 1000518's side bump equals the list's `created_at` (`2026-11-21 10:10:15.926721+00`).
- **(f) Plans.** With `enable_seqscan = off`, the Marketplace's per-slug count over `countedListings` and want alerts' `discoverable` read both use `lists_trade_discoverable_idx`:

    == market per-slug count
    HashAggregate  (cost=7936.83..7983.81 rows=3758 width=23)
      Group Key: list_entries.collection_slug
      ->  Nested Loop  (cost=5.08..7918.04 rows=3758 width=19)
            ->  Nested Loop Anti Join  (cost=4.66..551.15 rows=46 width=4)
                  Join Filter: (user_sanction.user_id = lists.user_id)
                  ->  Bitmap Heap Scan on lists  (cost=4.53..542.31 rows=46 width=36)
                        Recheck Cond: ((list_type = 'sale'::list_type) AND discoverable)
                        Filter: ((profile_address IS NULL) OR (ANY ((profile_address = (hashed SubPlan 2).col1) AND (user_id = (hashed SubPlan 2).col2))))
                        ->  Bitmap Index Scan on lists_trade_discoverable_idx  (cost=0.00..4.52 rows=50 width=0)
                              Index Cond: (list_type = 'sale'::list_type)
                        SubPlan 2
                          ->  Seq Scan on user_address ua  (cost=0.00..81.18 rows=2418 width=75)
                                Disabled: true
                  ->  Materialize  (cost=0.12..8.16 rows=1 width=32)
                        ->  Index Scan using user_sanction_active_idx on user_sanction  (cost=0.12..8.15 rows=1 width=32)
                              Index Cond: (type = ANY ('{trade_block,ban}'::text[]))
                              Filter: ((expires_at IS NULL) OR (expires_at > now()))
            ->  Index Scan using list_entries_list_idx on list_entries  (cost=0.42..158.87 rows=128 width=23)
                  Index Cond: (list_id = lists.id)
                  Filter: (collection_slug IS NOT NULL)
    
    == want alerts discoverable
    Bitmap Heap Scan on lists  (cost=9.03..188.62 rows=32 width=4)
      Recheck Cond: (((list_type = 'want'::list_type) AND discoverable) OR ((list_type = ANY ('{have,sale}'::list_type[])) AND discoverable))
      Filter: ((list_type = 'want'::list_type) OR ((list_type = ANY ('{have,sale}'::list_type[])) AND is_profile_bind))
      ->  BitmapOr  (cost=9.03..9.03 rows=96 width=0)
            ->  Bitmap Index Scan on lists_trade_discoverable_idx  (cost=0.00..4.33 rows=25 width=0)
                  Index Cond: (list_type = 'want'::list_type)
            ->  Bitmap Index Scan on lists_trade_discoverable_idx  (cost=0.00..4.68 rows=71 width=0)
                  Index Cond: (list_type = ANY ('{have,sale}'::list_type[]))
    

- **(g) Errors.** The pages visited as localtest1, localtest2 and localtest5 threw no console error or exception other than two known, harmless kinds, neither from this change:
  - Centrifugo WebSocket 403s. Its `allowed_origins` is only `localhost:3200`, and this server ran on 3201.
  - The dev-server log's 10 lines of `[vite] (client) [Unhandled error] Error: ResizeObserver loop completed with undelivered notifications.`, a browser notice. The first fired on the home page at sign-in, before any page this change touches had loaded, and the same line is in older dev logs of other sessions and builds.

  The pages were the list page, the profile's lists, the post page, `/trade` with Your posts showing "Bumped", and localtest5's list. The log holds no server error.
- **Put back.**
  - Lists 13465 and 13466 were deleted, and their rows went with them.
  - localtest1's and localtest2's lists and rows were restored column for column from the saved copies.
  - Their lists, rows and hides, read again, are byte-identical to the saved files (SHA-256 prefixes `c5b8b268555a`, `7a90fe463bdc` and `b8a263473617`).
  - The drift script reads 0 on checks 1 to 7, at 411 rows.
  - `localtest5@local.invalid` is kept, with no lists, as the owner did not ask to remove it. Its test session row was deleted.
  - The local database keeps step 1's migration.
  - The dev server is stopped and the browser contexts are closed.
- **7.1, G1** (production, read-only, 2026-11-21 10:19 UTC, after `8b05487c` was pushed).
  - The old drift script (`6f4de4c2`) and the new one: checks 1 to 7 at 0 each, over 1608 rows. Note 2 read 9 in both. The old script's note 3 read 9; the new script has no note 3.
  - Decision 2's count: `differs` 5, `matters` 1. The one person has a sale post on Trade bumped 2026-11-02 and an off-Trade want list in no row holding a bump of 2026-11-03. After step 1 their last bump reads 11-02 instead of 11-03. Both are past the 24 hours, so their cooldown and their post's place in the feed are unchanged; only Your posts' "Bumped" line moves by a day. `matters` counts anyone with a post on Trade, not only a bump inside 24 hours. The owner went ahead.
  - Have, sale and want lists in no row with a `bumped_at`: 101 (information).
  - Baseline: 1608 rows, 2147 lists on Trade.
- **7.2.** The owner ran migrate (`20261121094632_retire_contract_columns`) and brought up web and the worker from `8b05487c`, reported done after G1; the time each came up was not recorded.
- **7.3, G2** (production, read-only, after 7.2).
  - The new drift script: checks 1 to 7 at 0 each, over 1608 rows; note 2 at 9.
  - The market's per-slug count (`countedListings`): a bitmap scan on `lists_trade_discoverable_idx` (452 sale lists), 184.1 ms cold and 83.9 ms warm, against `trade-post-state` 11.3's 162.4 ms.
  - Want alerts' `discoverable` read: a BitmapOr of two scans on `lists_trade_discoverable_idx` (926 want, 1221 have and sale), 3.6 ms cold and 0.8 ms warm.
- **8.1, step 2** (local only).
  - **Timing.** Step 1 (`8b05487c`) went live on 2026-11-21 at about 10:30 UTC. Production web and the worker now run `0129b5c4`, which is later than step 1. On 2026-11-22 the owner chose to go ahead without waiting out the full day 8.1 asks for.
  - **Migration.** `packages/db/migrations/20261121171021_drop_contract_columns`, generated with `--custom`, is written as decision 6, step 2 gives it:
    - the `lock_timeout` 1 s header;
    - `lists` `ACCESS EXCLUSIVE`, then `hidden_trade_post` `ACCESS EXCLUSIVE NOWAIT`;
    - the trigger, then its function;
    - `DROP COLUMN IF EXISTS` on `hidden_trade_post.list_id`, then on `lists.bumped_at`.

    The trigger and function names match `20261120103752_hidden_trade_post_by_row`.
  - **Snapshot.** Its snapshot has empty `deltas` and `footprints`, and `prevIds` names step 1's snapshot (`91fd98eb…`), the same shape as `drop_linked_list_id`. A plain `db:generate` afterwards reported "No schema changes".
  - **Applied locally** (`DATABASE_URL` in `.env.local` is `localhost`).
    - Before: both columns, `hidden_trade_post_list_id_idx`, the trigger and its function were present (2, 1, 1, 1).
    - After: all four are gone (0, 0, 0, 0).
    - The new drift script read 0 on checks 1 to 7 at 411 rows, both after the migrate and after the put-back.
  - **Smoke.** The dev server ran from this worktree on `.env.local`, on port 3201 (with `SITE_URL` set for that process). Each account had its own isolated context and tab and signed in by `fetch` after load; no credential reached the dev-server log.
    - As localtest2:
      - The list page (`lt2spares`), Browse, For you and My trades rendered.
      - Before the bump, `trade/myPosts` returned 200 for five posts. Their `lastBumpAt` was `2026-11-16T03:26:39Z`, their `nextBumpAt` null, and their own `bumpedAt` values ran from 11-13 to 11-16.
      - Bump returned 200 with `bumpedAt` `2026-11-21T17:13:16Z` and `nextBumpAt` `2026-11-22T17:13:16Z`.
      - After the bump, every post's `bumpedAt` and `lastBumpAt` was that time and every `nextBumpAt` 24 hours later.
      - Your posts is the section on Browse, and it rendered both before and after the bump.
    - As localtest1:
      - Hiding localtest2's post 1000303 (list 13168) wrote a hide row `(user_id, post_id)`, and the post left `trade/people`.
      - Unhiding removed the row, and the post came back.
    - Errors: the client and the server log showed only the ResizeObserver loop notice, already judged harmless in 6.2 (g). There was no server error.
  - **Put back.**
    - The bump's row times were restored from the saved copy. localtest1's and localtest2's lists, rows and hides, read again, are byte-identical to the saved files.
    - This pass's two session rows were deleted.
    - The dev server is stopped and the contexts are disposed.
    - The local database keeps step 2's migration.
  - **Raw-SQL grep at HEAD** (after `345273b6` and `0129b5c4`): `bumped_at|bumpedAt|fill_post_id|list_id_idx` and a hidden `list_id` in `packages` and `apps` (`*.ts`, `*.tsx`, `*.sql`, outside `migrations/`).
    - The only `bumped_at` hits are `trade_post` sides: `lead_`/`want_bumped_at`, the `side.bumped_at` of `onTradeRowsSql` and `sideStateSql`, and the feed's `on_trade` aliases.
    - The only `bumpedAt` hits are post bumps and the people cursor.
    - The remaining `list_id` columns belong to `list_rule`, `list_entries` and `offer_item`.
    - No comment still says a column, the index or the trigger stays.

    The worker was not run in the smoke. This grep covers the api services it imports.
  - **Shared local database:** it now lacks both columns, so a worktree on a build older than `8b05487c` fails against it.
  - **Rollback floor** (8.3 records the production one): after step 2, web and the worker can go back to `8b05487c` at the lowest.
- **9.1, agent docs.**
  - `packages/db/AGENTS.md`, Trade posts, now records both migrations, the drop of both columns, the trigger and its function, and that no web or worker build older than `8b05487c` can run. The old sentence that an older worker "reads `lists`, which equal the rows" is now in the past tense.
  - Checked against the code:
    - `apps/worker/AGENTS.md`, Trade post drift: check 5 is `discoverable` only, and the notes are two.
    - `packages/api/docs/trade.md`, Trade posts: bumps go through `personBumpSql` (`turnOnBumpedAt`, `lastBumpOf`). The reads that stay on `lists` no longer name a bump reader. Partner rules no longer mentions `list_id`.

    Both match the code.
  - `packages/api/AGENTS.md`, `apps/web/AGENTS.md` and the root `AGENTS.md` mention neither column, the trigger nor these bump readers, so they need no change.

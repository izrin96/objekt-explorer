## Context

**Posts.** A Trade post is one `trade_post` row (`packages/db/src/schema.ts:263-287`). It has `id`, an identity column starting at 1,000,000, and `user_id`. `lead_list_id` is a have or sale list, or a Buy post's want list; it is NOT NULL and `ON DELETE CASCADE`. `want_list_id` is nullable and `ON DELETE SET NULL`. Neither list column has a unique index, on purpose. The rows are the only store of a pairing. Writers plan them through `planPostWrite` and `planPostRows` (`packages/api/src/lib/trade-post-rows.ts`). They write them through `lockPosts` and `writePosts` (`services/list/shared.ts:96-172`).

Four planner facts carry this change:

- A lead keeps its lowest row (`trade-post-rows.ts:51-53`).
- A have or sale list keeps leading a row once it leads one: `leads` is true while `row !== undefined` (`:72-75`).
- On a merge (`:79-84`) the want list's row is kept and re-led when the want list was on Trade before the write and the lead was not. The lead's own row is then deleted.
- `relead` (`:95-115`) turns an insert into an update of any row the plan deletes that holds one of the insert's lists, through its lead or its want list.

`deleteList` writes the rows before it deletes the list (`services/list/edit.ts:119-125`).

**Offers.** An offer records the post it was made on as `offer.post_list_id` (`schema.ts:479-480`). It is a nullable foreign key to `lists.id`, `ON DELETE SET NULL`, with the partial index `offer_post_list_id_idx` (`:492-494`, migration `20261110131530_offer_post_list_idx`).

- **The only writer** is `createOffer`'s insert (`services/offer/index.ts:416-431`): `postListId: getRows.some((row) => !keptObjekt(row.item)) ? onPost : null` (`:429`).
- **Where `onPost` comes from.** It starts as `resolvePostList(partnerId, input.post)` (`index.ts:144`, `core.ts:416-424`). It is cleared when the asks don't fit (`:203-209`, `:226-230`). Otherwise it falls back to the one list the asks came through, `chosen` from `onePostVerdict` (`:202`, `:218`, `:241`; `lib/offer-recipient-rules.ts:98-120`).
- **Always the recipient's own askable list.** `resolvePostList` filters on `askableOnTrade` (have or sale, bound, `discoverable`; `services/trade/lists.ts:20`). `chosen` comes from `allowedEntries`, which filters on `lists.user_id = partnerId` and `askableOnTrade` (`core.ts:340-367`). So the value is that person's have or sale list as it was read before the transaction, never a want list.
- **The only reader** of the stored value is `fetchOffers` (`services/offer/view.ts:73-145`). It selects `o.post_list_id` (`:93`), joins `lists pl` (`:143`), and gates the decline notice's checks on `acrossPosts = forReader AND o.post_list_id IS NULL` (`:79`). `toOfferView` turns the join into `post: { slug, name } | null` (`:236`).
- **Readers that don't use it.** Only offers with what I want (`postWantedAmong`, `picker/shared.ts:169`) and one post per offer read `onPost`, the list being sent, never the stored value. Reports take their own `postListId` from the client (`schemas/moderation.ts:79`, `services/moderation/report.ts:129`).
- **Routing.** The offer router is `/rpc` only. `offer.create` takes a list slug as `post` (`schemas/offer.ts:177`). Views return `post: { slug, name } | null` (`schemas/offer.ts:347`).

**Production, read-only, 2026-11-15/16:**

- 9,468 offers, 2,063 with `post_list_id`. The named list is always a have or sale list.
- For 1,995 of them the list leads exactly one row (2,003 on a rerun on 2026-11-16, after more offers).
- 68 name a list that leads no row. All are closed (declined 31, accepted 22, withdrawn 8, cancelled 7), and all are on lists off Trade.
- All 179 open offers with a post are on a list that leads a row.
- No offer's list leads two rows.
- 1,360 `trade_post` rows.
- Run while planning, read-only, 2026-11-16: no `post_list_id` names a list its offer's recipient does not own, and no row led by an offer's `post_list_id` belongs to another person. The backfill would set 2,003 offers and leave 68 NULL.

## Goals / Non-Goals

**Goals:**
- Every offer that stores `post_list_id` also stores the post's row id, from the deploy on, with no extra round trip.
- Existing offers get the same value by the same rule, in the migration.
- No user, open tab or `/api/v1` caller sees a difference. The live build keeps working while the migration runs and after it.
- The drift script shows when `post_id` disagrees with the rule.

**Non-Goals:**
- Hides (decision 1).
- Any reader of `post_id`, any input or output carrying a post id, a URL with one.
- Renaming or dropping `post_list_id`.
- Reconciling offers the old build creates after the migration (Inputs for later phases).

## Decisions

### 1. Offers only; hides stay on the list rule

`hidden_trade_post.list_id` and its readers, `coveredListsSql` (`services/trade/lists.ts:67`), `hidesOfSql` (`:83`) and `fetchHiddenPosts` (`services/trade/hidden.ts:118`), are unchanged.

Alternative refused, by the owner on 2026-11-16: pointing a hide at a row. That changes three shipped behaviours, and it needs hides moved on every merge. Nothing planned needs it before shared lists. The notes a later hides change needs are under Inputs for later phases.

### 2. `offer.post_id`, SET NULL, with a partial index

`post_id integer NULL REFERENCES trade_post(id) ON DELETE SET NULL`, with `offer_post_id_idx ON offer (post_id) WHERE post_id IS NOT NULL`, the shape of `offer_post_list_id_idx`.

- **The index.** Every `trade_post` delete runs the SET NULL action, which looks up `offer` by `post_id`. Without the index each row delete would scan `offer`. Post writers delete rows in `writePosts` (`shared.ts:157`), and a list delete cascades to its rows.
- **Alternative refused: `ON DELETE CASCADE`.** A row delete would delete offers, and with them their items, messages and trades.
- **Alternative refused: `NO ACTION`.** Every row delete with an offer on it would fail, and those deletes are routine planner output.

### 3. `post_list_id` stays for good, and every reader stays on it

`post_list_id` is the offer's history, the list it was made on. `post_id` is the address later features use: per-post offer rules, pause, a note. It is not history. Three planner cases make a row id the wrong answer for an offer's history:

- **(a) A lead deleted while its want list is on Trade.** `deleteList` re-leads the row to the want list, then deletes the list, which nulls `post_list_id`. `post_id` would now point at a Buy post. The spec requires the "Offer on" line to drop (`openspec/specs/web-trade-offers/spec.md:1078-1092`, Scenario: Post deleted).
- **(b) A merge where a have list that was off Trade joins a live Buy post.** The have list's old row is deleted (`trade-post-rows.ts:79-81`), so `post_id` goes NULL. The offer was plainly on that have list, which still exists.
- **(c) The same merge, when the have list's old want list is on Trade after the write.** This case was found while writing this change. That want list then needs a row, and `relead` hands it the have list's deleted row (`:95-115`). So `post_id` stays set but points at the old want list's Buy post. Meanwhile `post_list_id` still names the have list, now the lead of another row. The composer reaches this in three steps:
  1. Take down a paired have and want list.
  2. Post the want list alone as a Swap post. `composerWrites` allows a Swap post with only a want list (`schemas/trade-post.ts:88-96`). `planPost` keeps the pair while its other half is in no post on Trade (`:301-309`).
  3. Edit another Buy post into a Swap post with that have list and Unpair.

Whether such an offer's `post_id` goes NULL (b) or moves to another list's post (c) depends only on that old want list's Trade state at the time of the merge. That is one more reason not to read it as history.

Alternative refused: moving the readers to `post_id`, or dropping `post_list_id` later. Each of (a) to (c) would change what a person sees about a past offer.

### 4. The writer: one scalar subquery inside the INSERT

`createOffer` computes the stored list once, as today's expression does:

```ts
const postListId = getRows.some((row) => !keptObjekt(row.item)) ? onPost : null;
```

It then inserts `postListId` and, beside it:

```ts
postId: postListId === null ? null : sql`(SELECT min(${tradePost.id}) FROM ${tradePost} WHERE ${tradePost.leadListId} = ${postListId})`
```

The result is NULL when `post_list_id` is NULL, or when the list leads no row. `min(id)` is the planner's "a lead keeps its lowest row" (`trade-post-rows.ts:51-53`), and it reads through `trade_post_lead_list_id_idx`. No other code writes `post_id`.

Alternatives refused:
- **A separate read before the transaction, beside `resolvePostList`.** `onPost` is only known after `onePostVerdict` (`index.ts:202-241`), so this would be a sequential round trip (`packages/api/AGENTS.md`, Round trips). Resolving it early would also widen the window in decision 8(a).
- **A read inside the transaction.** That is another round trip, for the same answer the statement gives.
- **`FOR KEY SHARE` on the subquery,** which would turn the race in 8(a) into a NULL. Refused: within the INSERT it takes the `trade_post` lock before the `lists` key locks of the same statement's foreign-key checks. That is the reverse of the post writers' `lists` → `trade_post` order, so it trades a rare error for a likelier deadlock.

### 5. No reader changes, and none can change

- No reader names `post_id`. `fetchOffers` is raw SQL with named columns (`view.ts:81-145`). Every Drizzle read of `offer` passes a column map: `offerRowColumns` (`state.ts:23-31`) and the reads at `trade-history.ts:75`, `accept.ts:146`, `picker/shared.ts:112, 138`, `account/delete.ts:91`, `moderation/staff-trade.ts:35`, `chat/inbox.ts:274`, and the worker's `trade-reminders.ts:55` and `offer-upkeep.ts:32`.
- The `SELECT *` at `trade-history.ts:96` reads a derived table whose columns are named. Nothing serializes a whole `offer` row: a grep for `row_to_json` and `to_jsonb(` over `packages/api/src`, `apps/worker/src` and `packages/lib/src` finds nothing.
- `post_list_id` is computed by the same expression as before. The new value is only added beside it.

So `acrossPosts`, the decline notice, Only offers with what I want, the offer card, the offer page and reports return what they returned.

### 6. Backfill in the expand migration, by the writer's rule

```sql
UPDATE "offer" o SET "post_id" = p.id
FROM (SELECT "lead_list_id", min("id") AS id FROM "trade_post" GROUP BY "lead_list_id") p
WHERE o."post_list_id" = p."lead_list_id";
```

This is the writer's rule. It touches only the offers it sets. Expected on production: about 2,003 set and 68 left NULL (the planning run of 2026-11-16), give or take offers made since.

Two caveats:
- **Backfilled values are today's rows.** Before `trade-post-stable-ids` (`e99390cb`, 2026-11-15) some writes re-created rows, and every offer from before 2026-11-14 predates the rows altogether. So a backfilled `post_id` is the row the list leads at migration time, not necessarily a row that existed when the offer was made. Decision 3 covers this: `post_id` is an address, not history.
- **Offers in the gap stay NULL.** Migrations run before the new code is live (`packages/db/AGENTS.md`, Migrations run before the deploy). The old build creates offers between the migration and the web deploy, and those keep `post_id` NULL, as do offers from any rolled-back period. Nothing reads `post_id` yet, so that is harmless now. The reconcile belongs to the first change that reads it (Inputs for later phases).

### 7. Migration mechanics

**What to generate.** `schema.ts` gains the column, the foreign key and the index. One migration, named `offer_post_id`, comes from `db:generate`. It should hold exactly three statements: `ALTER TABLE "offer" ADD COLUMN "post_id" integer`, the `CREATE INDEX`, and the `ADD CONSTRAINT … FOREIGN KEY … ON DELETE SET NULL`. Then add three things by hand:

1. At the top, the `lock_timeout` line of `20261115125616_drop_linked_list_id`, with its comment.
2. Below it, `LOCK TABLE "trade_post" IN SHARE ROW EXCLUSIVE MODE;`, with a comment saying why.
3. At the end, the backfill `UPDATE` of decision 6. Being after the foreign key, it is checked by the key.

**Locks.** Drizzle runs every pending migration in one transaction (the comment in `20261115125616_drop_linked_list_id`), so each lock is held until commit.

| Statement | `offer` | `trade_post` | Work |
| --- | --- | --- | --- |
| `LOCK TABLE trade_post` | none | SHARE ROW EXCLUSIVE | blocks post writers, not readers |
| `ADD COLUMN` (nullable, no default) | ACCESS EXCLUSIVE | none | catalog only, no rewrite |
| `CREATE INDEX` | SHARE, already covered | none | about 9,500 rows |
| `ADD CONSTRAINT FOREIGN KEY` | SHARE ROW EXCLUSIVE, covered | SHARE ROW EXCLUSIVE, held | validates over a column that is all NULL |
| backfill `UPDATE` | row locks on about 2,000 rows | key-share checks on about 1,400 rows | |

- **Why `trade_post` is locked first.** `deleteList` takes `trade_post` row locks, then `offer` row locks (the `post_list_id` SET NULL of its list delete). Without the `LOCK TABLE`, the migration would hold `offer` and then wait for `trade_post`, which is the reverse order, and it could deadlock with a list delete. Taking `trade_post` first leaves the migration nothing to wait on in reverse.
- **A plain index is fine.** At 9,468 offers and 1,360 rows the whole transaction takes well under a second. `CREATE INDEX CONCURRENTLY` cannot run inside Drizzle's migrate transaction anyway. `20261110131530_offer_post_list_idx` set the precedent of a plain index on `offer`.
- **The `lock_timeout`.** If a long transaction holds `offer`, the ACCESS EXCLUSIVE request would queue every later reader of `offer` behind it. With the timeout, the migration gives up after 3 s and rolls back whole, and it is rerun at a quiet time.

**The live old build.**
- *While the migration runs,* its reads and writes of `offer` wait for the commit. That covers chat threads, offer views, needs-you counts and the worker's `offerUpkeep`. Its post writers wait on `trade_post`. Nothing fails unless that wait passes a statement timeout.
- *After the migration,* it never names `post_id`. Its insert (`index.ts:416-431`) names only columns of its own schema, so `post_id` takes its default, NULL. Its reads name their columns (decision 5).
- *The worker* creates no offers. It imports `services/offer/notes` and `services/offer/verify`, never `services/offer/index`.

### 8. Concurrency

**(a) Can the INSERT hit a foreign-key violation on `post_id`?** Yes, but only through a narrow race of the same kind that already exists for `post_list_id`. Nothing is half-written when it happens.

- **Nothing orders `createOffer` against post writers.** `createOffer` resolves the list before its transaction (`index.ts:132-145`, `:186-241`). Inside the transaction it locks the two users `FOR SHARE` (`lockParties`, `:334`, `core.ts:92-95`), the conversation (`:346`) and the open offer `FOR UPDATE` (`:349-355`). It never locks the recipient's lists.
- **Which writes can break it.** The `post_id` key check takes `KEY SHARE` on the row the subquery found. A re-lead or a want-list change is an `UPDATE` of non-key columns, which takes `FOR NO KEY UPDATE` and does not conflict with `KEY SHARE`. The insert then stores the row's id, which is now led by whatever the write left there. Only a row `DELETE` that commits while the check waits makes the check fail.
- **When a row led by an existing have or sale list is deleted.** Only in the merge branch (`trade-post-rows.ts:79-81`), which needs the lead to have been off Trade when the writer read it (`live`, `:220`). So the recipient must take the list down and then merge it, both after `createOffer` read it as askable and before its INSERT. The other case is the lead's own deletion through `deleteList`. That already fails the `post_list_id` check today.
- **What the sender sees.** The send fails with a foreign-key error, or with a deadlock error (40P01) when Postgres fires the `post_id` check before the `lists` checks. It picks the order by trigger name, which this change does not control. The transaction rolls back and `createOffer` gives the send slot back (`index.ts:474-477`). A retry resolves the list again.
- **Mitigation.** Resolve inside the INSERT, which is the narrowest window (decision 4). `FOR KEY SHARE` is refused there.

**(b) Does the new SET NULL add a lock order that can deadlock with offer writers?** It adds a new source for an order that already exists, not a new order.

- **The order today.** `deleteList` locks the owner's have, want and sale lists `FOR UPDATE` (`lockTradeLists`, `shared.ts:65-84`), writes rows, then deletes the list (`edit.ts:119-125`). That delete's `post_list_id` SET NULL updates `offer` rows. So lists → `trade_post` → `offer` exists already.
- **Cycle one: `createOffer` against a post writer.** `createOffer` holds the conversation's open offer `FOR UPDATE` (`index.ts:349-355`, updated at `:406-414`). Its INSERTs then take `KEY SHARE` on the recipient's lists through `post_list_id` and `offer_item.list_id`. If the post writer holds those lists and its SET NULL needs that open offer, the two deadlock.
- **Cycle two: `acceptOffer` against a post writer.** `acceptOffer` holds the accepted offer's row, then cancels other open offers that share an objekt (`accept.ts:134-176`). A multi-row SET NULL that locked one of those first, and then waits on the accepted one, deadlocks with it.
- **What is new.** Both cycles exist today through `deleteList`. When `deleteList` deletes a row with offers on it, the same offers already carry `post_list_id` = that list, so it locks no new offer rows, only earlier in its transaction. The new source is `savePost`'s merge branch, the only plan that deletes a row whose lead still exists.
  - `list.create` and `list.copy` cannot reach that branch, because it needs a row the lead already leads, and a new list leads none.
  - `takeDownPost` changes no pairing.
  - Re-leads and takeovers are non-key updates and fire no foreign-key action.
- **What it takes to happen.** The owner merges a have list they took off Trade into a live Buy post, while an offer on that have list is being countered, replaced or accepted, or another offer sharing its objekt is accepted.
- **Mitigation.** Postgres aborts one side with 40P01 after `deadlock_timeout`. That transaction rolls back whole, and the person retries, as with `deleteList` today. No retry loop is added, since `deleteList` has none. The local proof in decision 10(e) runs this cycle on purpose, to show the abort is clean.

### 9. The drift script

The brief's check, "an offer with both ids set whose row is led by another list must be zero", is not an invariant. Case (c) of decision 3 produces it from an ordinary composer edit. So the script splits what must hold from what it reports:

- **Must be zero, added to `CHECKS`:** "an offer whose post is another person's row" (offer ids):

  ```sql
  SELECT o.id FROM offer o JOIN trade_post tp ON tp.id = o.post_id WHERE tp.user_id <> o.to_user_id
  ```

  It holds for three reasons:
  - The writer and the backfill pick a row led by `post_list_id`, which is always the recipient's list (Context).
  - A row's `user_id` is its lead's owner (the script's third check).
  - No writer changes `trade_post.user_id` or `lists.user_id`. `writePosts` sets only `lead_list_id` and `want_list_id` (`shared.ts:159-163`), always to lists of the same person.

  It catches a writer or backfill that stores the wrong row.
- **Printed with up to 10 ids, never failing:**
  - **"an offer on a post now led by another list, its own list still there"** (`o.post_list_id IS NOT NULL AND tp.lead_list_id <> o.post_list_id`). This is case (c). Its count is the input for the owner decision on taken-over rows (Inputs for later phases). Case (a) cannot appear here, because `post_list_id` is NULL by then. `deleteList`'s re-lead and list delete commit together, so a read-only script never sees the moment between them.
  - **"an offer on a list that leads a row, with no post id"** (`o.post_id IS NULL AND o.post_list_id IS NOT NULL AND EXISTS (SELECT 1 FROM trade_post tp WHERE tp.lead_list_id = o.post_list_id)`). This counts offers from the gap and from any rolled-back period, offers whose row ended in a merge (case b), and closed offers whose list later went back on Trade with a new row.

### 10. Proof

No pure-module test covers SQL, so the proof is runs:

- **(a) Checks.** `bun run check` and `bun run build --filter=web`.
- **(b) A local run through `createOffer` for each path.** The paths:
  - a named post the asks fit;
  - no post named, with every ask through one list;
  - a named post the asks don't fit, with `multi_post_asks` on, so the one list they fit is stored;
  - asks across posts with `multi_post_asks` on;
  - gives only;
  - kept-only asks;
  - asks across posts with `multi_post_asks` off, which is refused with `other_post` and writes no offer.

  Each run asserts that `post_id` is the lowest row led by `post_list_id`, or NULL beside a NULL `post_list_id`.
- **(c) Views unchanged.** `toOfferView` output for every local offer, as both parties, is byte-identical before and after the change.
- **(d) The local migration**, applied only with the owner's approval, then the backfill counts checked.
- **(e) Planner cases.** Local runs of a lead delete, the merge of case (b), the takeover of case (c), and the cycle of decision 8(b).
- **(f) The drift script locally.**
- **(g) Production after the deploy.** The drift script and the backfill counts, read-only.

Scratch scripts live in a dot-directory inside `apps/worker` (`apps/worker/.offer-post-id/`), as the earlier phases' did: bun resolves `@repo/*` from the script's path, and a file under `src/script/` would be linted, type-checked and easy to commit. Each refuses to start unless `DATABASE_URL` and `REDIS_URL` point at a local host, and each is deleted afterwards. `createOffer` also reads holdings from the indexer, which `.env.local` points at production read-only. That is a read.

## Risks / Trade-offs

- **[A send fails when the recipient takes a list down and merges it while the offer is in flight.]** → It is rare, needs two writes by the recipient inside one send, and writes nothing. It is the same class as today's `post_list_id` race with `deleteList` (decision 8a). Resolving inside the INSERT keeps the window as narrow as the statement allows.
- **[A deadlock between `savePost`'s merge and an offer counter, replace or accept on that have list.]** → Postgres aborts one side cleanly. It is the same class as `deleteList` today (decision 8b). The local cycle run (task 6.6) shows the abort.
- **[`post_id` can point at another list's post (case c).]** → No reader uses `post_id`. The drift script counts these. A reader needs the owner decision listed below first.
- **[Offers created by the old build after the migration keep `post_id` NULL.]** → Harmless until a reader exists. The rollout records the window, and the first reader's change reconciles exactly that window.
- **[The migration holds `offer` exclusively for its whole transaction.]** → It is sub-second at today's sizes. The `lock_timeout` stops it from queuing readers when it cannot start. Locking `trade_post` first rules out a deadlock with `deleteList`.
- **[A historic `post_list_id` names a list its recipient does not own.]** The backfill would copy that into a failing drift check right after the deploy, where it would read as a writer bug. → A read-only count before the migration (task 8.1) must read zero.
- **[Rollback.]** → Every build from `c66841be` on ignores the column. Offers created during a rollback join the reconcile window, so the rollout notes any rollback period too.

## Migration Plan

1. **Before the migration**, with the owner's go-ahead, read-only on production:
   - offers whose `post_list_id` names a list not owned by `to_user_id`: expected 0;
   - the backfill preview: offers whose list leads a row (2,003 on 2026-11-16) and offers whose list leads none (68).
2. The owner commits and pushes. CI builds web.
3. On the VPS, `docker compose run --build --rm migrate`. Note the time it was applied: the `applied_at` of its row in `drizzle.__drizzle_migrations` (`created_at` there is the folder's timestamp).
4. Bring up web, and note the time the new image serves. The worker needs no rebuild: it runs none of the changed code, and its image already runs from `c66841be` or later.
5. With the owner's go-ahead, read-only:
   - the backfill counts;
   - the drift script: its four checks zero, the two notes printed;
   - the count of offers created between the two times above.
6. Record those results and the two times in this file. If web is ever rolled back to a build before this change, record that period too.

## Inputs for later phases

- **The reconcile.** The first change that reads `post_id` carries an idempotent reconcile in its migration:

  ```sql
  UPDATE offer o SET post_id = p.id
  FROM (SELECT lead_list_id, min(id) AS id FROM trade_post GROUP BY lead_list_id) p
  WHERE o.post_list_id = p.lead_list_id AND o.post_id IS NULL
    AND o.created_at >= '<migration applied>' AND o.created_at < '<web deploy live>'
  ```

  - **Why a time window.** From the data alone it cannot tell an offer the old build left NULL from an offer whose row legitimately ended. Ended rows include a merge (case b), and a list taken down and later posted again with a new row. Without the window, the reconcile would quietly answer the first owner decision below, and attach the 68 historic offers to whatever row their lists lead later.
  - **What the window cannot tell.** Inside it, the reconcile still cannot tell an offer the old build wrote from one whose row ended between its creation and the reconcile. At today's rate that is a handful of offers at most.
  - **Rollback periods.** Any recorded rollback period joins the window.
- **Owner decisions before any reader moves to `post_id`:**
  1. Does an open offer follow its have list across a merge (case b), or stay on no post?
  2. Does the "Offer on" line ever follow a re-led row (case a)? The spec says it drops today.
  3. What does a reader do with a row now led by another list while the offer's own list still exists (case c)? A likely mechanism is the one hides would need: the planner reports rows whose lead changed while the old lead remains, and the writer re-points or nulls `offer.post_id` in the same transaction.
- **Hides, for a later change.**
  - Hides would move on every merge as a planner output, not as a separate pass.
  - `fetchHiddenPosts` would return the lead's id.
  - 2 hides name a list that is in no row today.
  - The owner decides whether a hide follows the row or the list.
- **Post ids in URLs and inputs.** A post id is a number from 1,000,000 up, apart from list ids. A new input that names a post by id joins as an optional field beside the `post` slug, which open tabs keep sending (`packages/api/AGENTS.md`, `/rpc` stays compatible with open tabs). An output adds a field and keeps `post: { slug, name }`. `PostId` (`lib/trade-post-rows.ts:2`) is the brand to carry it in TypeScript.

## As built

- **Who built what.** Groups 1 to 5 (the baseline, the schema and migration, the writer, the drift script, the checks) were built by a subagent from this plan and reviewed line by line; the local proof and the docs were done in the main session.
- **One naming change from task 3.1:** `createOffer` already destructures a `postListId` (the resolved `post` input), so the stored value is `storedPostListId`.
- **Checks:** `bun run check` passes (26 of 26 tasks) and `bun run build --filter=web` builds.
- **Migration** `20261115164916_offer_post_id`: generated as the three statements of decision 7, with the `lock_timeout` line, the `LOCK TABLE` and the backfill added by hand. Applied to the local database with the owner's approval (2026-11-16).
- **Local backfill:** 23 offers had `post_list_id`, all 23 on a list that leads a row. After the migration all 23 have `post_id`, each the lowest row its list leads; no offer without `post_list_id` has one.
- **Views unchanged:** `toOfferView` for every local offer as both parties, 158 entries, written before any change and again after the migration and the code change: byte-identical (`cmp`).
- **Writer paths**, localtest1 to localtest2 through `createOffer`, each offer withdrawn afterwards:
  - a named post the asks fit: `post_list_id` 13169, `post_id` 1000304, the row it leads;
  - no post named, every ask through one list: 13168, 1000303;
  - a named post the asks don't fit, `multi_post_asks` on: the list they fit, 13169, 1000304;
  - asks across posts, `multi_post_asks` on: both NULL;
  - gives only, with a post named: both NULL (the first objekt tried was refused as reserved by an accepted trade; another was used);
  - asks across posts, `multi_post_asks` off: refused `other_post`, no offer added;
  - one post with `multi_post_asks` off: 13168, 1000303.
  `multi_post_asks` was switched by a direct local `UPDATE` of the user row, and put back.
  **Not run:** a counter whose asks are only objekts the recipient offered. It needs an offer from localtest2 with gives, which the local data lacks; it takes the same branch as gives only (`storedPostListId` is NULL).
- **Planner cases.** **Departure from task 6.6:** instead of a fresh offer per case, one closed local offer (303) was pointed at each case's list and row by a local `UPDATE` and put back at the end. The cases test the foreign keys and the planner, and the lists they need are new and hold no objekts, so no offer could be sent on them. The writer was covered by the paths above. Lists were made and removed through `createList`, `savePost`, `takeDownPost` and `deleteList`:
  - lead deleted, want list on Trade: `post_list_id` NULL, `post_id` on the same row, now led by the want list; that want list deleted afterwards: `post_id` NULL;
  - lead deleted, want list off Trade: both NULL;
  - merge (case b): `post_id` NULL, `post_list_id` keeps the have list, which now leads the Buy post's row;
  - takeover (case c): `post_id` keeps its row, now led by the old want list, while the have list leads another row; the drift note counted 1 and the failing check 0;
  - deadlock cycle (decision 8b): the merge's `savePost` waited on the offer row, then Postgres aborted it with 40P01 at `delete from "trade_post"` and the other session committed; the offer and the rows were as before the merge. So a person saving that post gets an error and retries.
  No statement failed otherwise. localtest2's lists, Trade state and rows ended as they began, row ids included, and offer 303 has its columns back.
- **Local drift script,** read-only: 410 rows, zero on the four checks, zero on both notes.
- **Docs:** `packages/api/docs/offers.md`, `packages/db/AGENTS.md`, `apps/worker/AGENTS.md`, and the `schema.ts` doc comments. `packages/api/AGENTS.md` and the root `AGENTS.md` are unchanged: no convention, trap or workflow changed.
- **Before the migration** (task 8.1), read-only on production, 2026-11-16 after the push: no `post_list_id` names a list its offer's recipient does not own; 2,033 offers are on a list that leads a row and 68 on a list that leads none.
- **Rollout** (tasks 8.2 to 8.4): pushed as `7bcd3843`; CI passed and moved `:latest`. The owner ran migrate, then web. Production, read-only, 2026-11-15 17:28:58 UTC (the 16th in the owner's time zone, the date used elsewhere in this file):
  - the migration was applied at **17:28:08 UTC**;
  - 2,105 offers have `post_list_id`; 2,036 have `post_id`, each the lowest row its list leads; 69 have none: the 68 whose list leads no row, and one offer from the gap;
  - no offer has `post_id` without `post_list_id`;
  - two offers were created after the migration, both on a post: **offer 9523 at 17:28:17 has no `post_id`**, so the previous build wrote it; the next, at **17:28:56**, has one, so the new build was serving by then;
  - the drift script: 1,363 rows, zero on the four checks; the takeover note 0; the "no post id" note 1, which is offer 9523.
  **The reconcile window for the first reader of `post_id` is 2026-11-15 17:28:08 to 17:28:56 UTC, and it holds exactly one offer, 9523.** No rollback has happened.
- **Local data left:** six withdrawn or closed test offers (ids 308 to 313) in the localtest1 and localtest2 conversation.

## Open Questions

None.

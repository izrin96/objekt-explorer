## Context

See proposal.md for why. This change is step 2 of the shared-lists chain: `trade-post-state` → this change → `trade-post-planner-shared` → `trade-post-reads-by-row` → `post-id-inputs` → `offer-reads-post-id` → `shared-lists`. Today's hide rule comes from `openspec/changes/archive/2026-11-15-trade-post-hides/`. The owner deferred moving hides to rows in `2026-11-16-offer-post-id` (decision 1). On 2026-11-16 the owner lifted that deferral and set four rules:

1. A hide on a post whose lead list is deleted keeps hiding the re-led Buy post.
2. After a split, the hide stays on the lead's row, so a hidden want list shows again.
3. A list that leaves its row and is posted again gets a new row, and shows.
4. On a merge, the hide moves to the surviving row.

Line numbers below are from the worktree at `4b0e1614` (main `1568f6b1` plus the archive of `trade-post-state`). They were refreshed on 2026-11-20, first against `6567a9c1` and then against `4b0e1614`, after `trade-post-state` shipped (`2f107ab3`, `1568f6b1`). That change moved the planner, `writePosts`, `lockPosts`, `postsCte`, candidates, `pairs.ts` and the drift script. None of the cited files changed between the mapping pass (`ea520100`) and `b3614047`, apart from `post-block.tsx:192`, which is unrelated.

**The table today.** `hidden_trade_post` (`packages/db/src/schema.ts:234-255`, migration `20261110085347_hidden_trade_post`) has:
- `user_id`, `list_id` and `created_at`;
- primary key `(user_id, list_id)`;
- `list_id` → `lists(id)` `ON DELETE CASCADE`, through `hidden_trade_post_list_id_lists_id_fkey`, with `hidden_trade_post_list_id_idx`;
- `user_id` → `user` `ON DELETE CASCADE`.

**The rows.** `trade_post` (`schema.ts:257-300`): `id` is an identity column from 1,000,000. `lead_list_id` cascades and `want_list_id` sets null. Neither list column is unique. Since `trade-post-state`, each row also holds its sides' Trade state and bumps and the post's Open to (`lead_on_trade` to `takes_swaps`), with the CHECK `trade_post_open_to_something`.

**Every reader and writer of hides:**

| Where | What | Today |
| --- | --- | --- |
| `services/trade/lists.ts:67-76` | `coveredListsSql(viewer)`: each hidden list, plus the other list of the row it leads or is the want list of | list rule, set form |
| `lists.ts:83-86` | `hidesOfSql(viewer, alias)`: `hp.list_id IN (alias.id, postPartnerSql(alias))`, where `postPartnerSql` takes the lowest row (`:53-59`) | list rule, lookup form |
| `lists.ts:89-91`, `:94-95` | `inHiddenPostSql` (over the set) and `hiddenPostAtSql` (`max(created_at)` over the lookup) | — |
| `feed/query.ts:112`, `:200` | `feedWhere`'s filter and `fetchPersonRows`' `hidden` column: `inHiddenPostSql(viewer, "posts")`, `posts.id` being the anchor list. `postsCte`'s `on_trade` is built from the rows' sides (`onTradeSql`), but `posts` still carries no row id | set |
| `matches/candidates.ts:90` | `partner_lists`, now `FROM on_trade l`: `NOT inHiddenPostSql(userId, "l")` | set |
| `services/trade/hidden.ts:90-101` | `hidePost`: INSERT `(user_id, list_id)` of the anchor, guarded by `NOT inHiddenPostSql`, `ON CONFLICT DO NOTHING`, `RETURNING list_id` | set |
| `hidden.ts:104-112` | `unhidePost`: DELETE where `gone.list_id IN (SELECT hp.list_id hidesOfSql(viewer, "named"))` | lookup |
| `hidden.ts:118-179` | `fetchHiddenPosts`. It resolves each hide's lead and want through two `ORDER BY r.id LIMIT 1` subqueries, then dedupes in JS by `leadId`. It returns `{ listId: hp.list_id, slug, names, userId, user, handle, profile, hiddenAt }` | lowest row |
| `apps/worker/src/job/want-alerts/pairs.ts:84-90` | `hiddenPostAtSql(recipient, "pl")` per new entry, `pl` joined from `lists` (`cand` reads `on_trade` since `trade-post-state`) | lookup |
| `apps/worker/src/job/want-alerts/record.ts:40-53` | `unhidePosts`: DELETE where `gone.list_id IN (SELECT hp.list_id hidesOfSql(u.user_id, "pl"))` and `created_at < now` | lookup |
| `routers/trade.ts:236-248`, `schemas/trade.ts:77` | `hidePost` and `unhidePost` take `tradePostInputSchema` (`{ listId }`). `hiddenPosts` has no `.output()`. None of the three is in `openApiRouter` (`routers/index.ts:99-104`), so they are on `/rpc` only | — |
| `apps/web/src/features/trade/post-block.tsx:270` | `HidePostItem listId={post.id}`, the anchor | — |
| `actions.ts:152-167` | `showHidden` matches feed posts by `post.id` for the optimistic update | — |
| `actions.ts:169-232` | the hide, Undo and unhide hooks send `{ listId }` | — |
| `hidden-partners-dialog.tsx:168`, `:172`, `:202` | the Hidden list keys by `post.listId`, tests pending by it, and sends it to `unhidePost` | — |
| FK cascades | deleting a list or a user deletes its hides | — |

**The planner** (`lib/trade-post-rows.ts`). `planPostRows` (`:58-108`) deletes a row in exactly four places:
- **(D1) a second row of one lead,** where the lead keeps its lowest row (`:67-70`);
- **(D2) the merge branch,** where the lead's row goes and the want list's row is re-led (`:95-100`);
- **(D3) a want list's row whose want list a have or sale list now holds** (left in `kept`, deleted at `:106`);
- **(D4) a row whose lead is gone** (`removed`) and that `relead` (`:111-131`) does not hand to its want list.

`relead` turns an insert into an update of a row the plan deletes, and so changes the lead of a row that survives. `planPostWrite` (`:261-323`) calls `planPostRows`, then returns `PostWriteOps`: `...ops`, each insert with its `state`, and `states`, the surviving rows whose state changed (`trade-post-state`, decision 4). `writePosts` (`services/list/shared.ts:191-219`) then:
- deletes (`:202`);
- updates;
- writes `ops.states` (`writeStates`, one `UPDATE … FROM unnest`);
- inserts, with their state.

`deleteList` (`services/list/edit.ts:137-156`) calls it with `removed` (`:149`) before deleting the list (`:150`).

**A list in at most one row.** Drift check 2 (`apps/worker/src/script/trade-post-drift.ts:48-53`) holds this, and production reads zero. While it holds:
- a list's row is `postRowSql`/`postRowOf`: the lowest row it leads, else the lowest it is the want list of (`lib/trade-sql.ts:40-44`, `trade-post-rows.ts:133-141`);
- the feed's `posts.id` anchor names exactly one row.

**Production, read-only, from the earlier changes:**
- **Hides:** 327 hides by 5 people (2026-11-15), and no person has two hides on one post.
- **Orphans:** 2 hides name a list that is in no row (offer-post-id, Inputs for later phases).
- **Rows:** 1,363 (2026-11-15), 1,557 at `trade-post-state`'s rollout drift run (2026-11-20).

These numbers are re-read in task 8.1.

**`trade-post-state`, the chain's step 1, shipped first** and is archived (`openspec/changes/archive/2026-11-20-trade-post-state/`). Part A (`2f107ab3`) added the row state columns and `PostWriteOps`; part B (`1568f6b1`) moved `postsCte`'s `on_trade`, `feedListColumns`, candidates' `partner_lists` and `pairs.ts`' `cand` to the rows. Both are live, web and worker. It changed:
- `lib/trade-post-rows.ts` (`PostRow.state`, `postStateOf`, `PostWriteOps`);
- `services/list/shared.ts` (`lockPosts`, `writePosts`);
- `postsCte`, through `onTradeSql`;
- `services/trade/lists.ts`, which gained `onTradeSql` but kept its hide helpers as they were.

It left `fetchHiddenPosts` to this change, and its link `CASE` to `trade-post-reads-by-row` (its decision 8). By its decision 5, this change generates its migration on top of `20261120085525_trade_post_state_reconcile`. Since that migration, no web build older than `2f107ab3` may run (`packages/db/AGENTS.md`, Trade posts).

## Goals / Non-Goals

**Goals:**
- A hide names one `trade_post` row. Every read of hides gets the covered lists from that row, and every write keeps the owner's four rules.
- Nothing changes for anyone on the day of the deploy: the same posts and lists are hidden before and after (task 8.1 proves it on production data, read-only).
- The build that is live while the migration runs keeps working, and a rollback to it keeps working.

**Non-Goals:**
- Comparing row ids in the feed or in candidates. Post ids in inputs or outputs.
- Dropping `list_id`, the trigger or its function.
- Changing which Edit post writes keep a row (`trade-post-planner-shared`).

## Decisions

### 1. A hide covers the lists of its row, stated in the same two forms

The set form and the lookup form stay, with their signatures, so `inHiddenPostSql`, `hiddenPostAtSql` and every caller compile unchanged:

```ts
/** The lists `viewer`'s hides cover, as `id`: the lead and the want list of each hidden row. */
export const coveredListsSql = (viewer: UserRef) =>
  sql`SELECT hide_row.lead_list_id AS id FROM hidden_trade_post hp
      JOIN trade_post hide_row ON hide_row.id = hp.post_id
      WHERE hp.user_id = ${ref(viewer)}
    UNION ALL
    SELECT hide_row.want_list_id FROM hidden_trade_post hp
      JOIN trade_post hide_row ON hide_row.id = hp.post_id
      WHERE hp.user_id = ${ref(viewer)}`;

/** `viewer`'s hides whose row holds the list `alias`, as `hp`, from FROM onwards. */
export const hidesOfSql = (viewer: UserRef, alias: string) =>
  sql`FROM hidden_trade_post hp
    JOIN trade_post hide_row ON hide_row.id = hp.post_id
    WHERE hp.user_id = ${ref(viewer)}
      AND ${column(alias, "id")} IN (hide_row.lead_list_id, hide_row.want_list_id)`;
```

The two forms agree by construction: "L is a list of a hidden row" read from either end. `hidesOfSql` no longer calls `postPartnerSql`, so the disagreement the mapping pass found disappears. The lookup's lowest-row partner could differ from the set form once a list sits in two rows; now neither form picks a row. `hp` is read through the primary key's `user_id` prefix and `hide_row` by its primary key.

**Exact while drift check 2 holds.** The feed asks about a post's anchor list, and candidates about each list:
- With a list in one row, "the anchor is a list of a hidden row" is the same as "the post's row is hidden".
- A shared want list would be covered in every post through one hidden row.
- `trade-post-reads-by-row` moves the feed and candidates to a row set, `hiddenRowsSql` (Inputs for later phases).

Rejected:
- **Comparing rows in the feed now.** Since `trade-post-state` part B, `on_trade` and `postsCte` are built from `trade_post`, so carrying a post's row id would cost one column, not two subqueries per post. It still waits for `trade-post-reads-by-row`.
- **Keeping the list rule and adding `post_id` beside it.** That is two rules again, the state the last hides change removed.

### 2. Where a hide goes when a write changes the rows: it follows the lead

The rule is the owner's four rules made one. After a write, a hide on row R moves to the surviving row that holds R's lead from before the write, whether as lead or as want list. When R's old lead is in no surviving row, the hide stays on R if R survives, and ends with R otherwise (the cascade).

| Planner path | Before → after | The hide on R | Owner rule |
| --- | --- | --- | --- |
| D3, the default merge: have list H with row R1 takes Buy post W (row R2) | R2 deleted, R1 = (H, W) | R2 → R1 | 4: a hidden Buy post that is paired stays hidden |
| D2, the live merge: H off Trade (R1) joins live Buy post W (R2) | R1 deleted, R2 = (H, W) | R1 → R2 | 4 |
| `relead`: a new have list joins Buy post W (R2) | R2 = (H, W) | stays (W, R2's old lead, is in R2) | 4 |
| D1, a second row of lead H | D deleted, K kept | D → K | 4 |
| `deleteList(H)`, W on Trade | R re-led to (W) | stays (H is gone) | 1 |
| `deleteList(H)`, W off Trade | R deleted (D4) | ends | 3 |
| Unpair (H, W) | R = (H), W gets a new row | stays on H's row; W's post shows | 2, 3 |
| Takeover (offer-post-id case c): H's row R1 handed to its old want list W_old, H now leads R2 | R1 = (W_old), R2 = (H, W) | R1 → R2 | follows the lead |
| Edit post swaps H for H2 in (H, W) | R = (H), (H2, W) a new row | stays on H; the edited post shows | 3 (interim, see Risks) |

Take off Trade changes no row, so a hide survives it. That is the spec's "One half of a hidden pair leaves Trade" and "A hidden post off Trade".

The takeover row is the one case the four rules don't name. "Follows the lead" gives the outcome today's list rule gives when the hide was made on H's post: the post H moves into stays hidden, and W_old's new Buy post shows. It is also rule 2 read for a row whose lead leaves it. The owner can overturn it (Owner confirmations, 1).

Rejected:
- **Strict row identity: a hide stays on its row id whatever leads it.** In a takeover it would hide W_old's Buy post and show the post H moved into, the reverse of rule 2's "the hide stays with the lead".
- **Dropping hides on a merge.** The owner chose move.
- **Following the list a hide was made on.** That is today's rule, which shared lists break.

### 3. The planner reports the moves

`PostRowOps` gains `moves: { from: PostId; to: PostId }[]`. `planPostRows` computes it last, after `relead`, from the rows before and the operations. It is pure:

```ts
/** Where each hide goes: a row that lost its lead, or was deleted, to the surviving row now holding that lead. */
function movesOf(rows: readonly PostRow[], ops: Omit<PostRowOps, "moves">): PostRowOps["moves"] {
  const deleted = new Set<number>(ops.deletes);
  const after = new Map(rows.filter((row) => !deleted.has(row.id)).map((row) => [row.id, row]));
  for (const update of ops.updates) {
    const row = after.get(update.id)!;
    after.set(update.id, { ...row, leadListId: update.leadListId ?? row.leadListId, wantListId: update.wantListId });
  }
  const holder = (listId: number) =>
    [...after.values()].find((row) => row.leadListId === listId || row.wantListId === listId);
  return rows.flatMap((row) => {
    const now = after.get(row.id);
    if (now?.leadListId === row.leadListId) return [];
    const to = holder(row.leadListId);
    return to && to.id !== row.id ? [{ from: row.id, to: to.id }] : [];
  });
}
```

Inserts are left out of `after`: they have no id yet, and `relead` turns every insert that shares a list with a deleted row into an update. So a list that leaves a deleted row lands in a row with an id, or in a row of its own that the hide should not follow (rule 3). `planPostWrite` spreads `ops` into its `PostWriteOps` (`Omit<PostRowOps, "inserts">` plus state), so `writePosts` receives the moves with no new parameter and no edit to `planPostWrite`.

Tested in `trade-post-rows.test.ts` (one case per table row of decision 2) and in `trade-post-rows.model.test.ts`. Each random write asserts these invariants:
- every `to` survives the write;
- no `to` is also a `from`;
- each `from` appears once;
- each `to` holds the `from`'s old lead.

A simulated hide on every row, moved and cascaded by the plan, never points at a deleted row. The suite also counts at least 100 moves of each of D2, D3 and takeover, as it counts re-leads today. If the random writes cannot reach 100 of a kind at a sane iteration count, its floor drops to what the suite reliably reaches, as long as every kind occurs at least once in every run (owner, 2026-11-20); the measured counts go in As built. D1 never arises from random writes, since the model asserts no list is in two rows, so only the unit test covers it and the model expects zero D1 moves.

Rejected: computing moves in SQL inside `writePosts` from the rows before and after. The planner already knows why each row went, and a pure rule is what the model test can check.

### 4. `writePosts` moves hides before it deletes rows

Two statements go in front of the row deletes (`shared.ts:202`), only when `moves` is not empty:

```sql
INSERT INTO hidden_trade_post (user_id, post_id, list_id, created_at)
SELECT hp.user_id, m.to_id, (array_agg(hp.list_id ORDER BY hp.created_at DESC))[1], max(hp.created_at)
FROM hidden_trade_post hp
JOIN unnest(${fromIds}::int[], ${toIds}::int[]) AS m(from_id, to_id) ON hp.post_id = m.from_id
GROUP BY hp.user_id, m.to_id
ON CONFLICT (user_id, post_id) DO UPDATE SET created_at = greatest(hidden_trade_post.created_at, excluded.created_at);

DELETE FROM hidden_trade_post WHERE post_id = ANY(${fromIds}::int[]);
```

- **Why a copy and a delete, not an `UPDATE … SET post_id`.** The person may already hide the target row. Two rows may also move into one target for the same person. An `UPDATE` would break the primary key in both cases, and could not merge the two times.
- **The newer time is kept,** because `hiddenPostAtSql` is `max(created_at)` today. The worker's "entries from before the hide stay out" (`pairs.ts`, `p.entry_at > hid.at`) reads it, so a merged post keeps the later of its hides.
- **The explicit `DELETE`** removes the source hides of a takeover, whose row survives. For deleted rows it runs ahead of the cascade.
- **Order.** The move must come before the row delete, or the `post_id` cascade deletes the hides first.
- **Lock order inside the transaction:**
  1. the person's lists (`lockTradeLists`, `FOR UPDATE`);
  2. `trade_post` rows;
  3. `hidden_trade_post` rows, by the move statements;
  4. the cascade of the row delete.

  `hidePost` locks a hide (its own insert), then `KEY SHARE` on the `trade_post` row through the `post_id` key. Row updates take `FOR NO KEY UPDATE`, which `KEY SHARE` does not conflict with, so a concurrent hide of a re-led row cannot form a cycle. That includes `writeStates` and `bumpPerson`'s row half, which since `trade-post-state` update only state columns, after `lockTradeLists`. The `list_id` key would have formed one through the `lists` row, and decision 6 drops it.

  The worker's `recordRun` locks hides and inserts notifications, and touches no `lists` or `trade_post` row lock.
- **No new round trip on writes without moves.** A merge adds two statements to a transaction that already runs one per update.

The moves are not added to `writePosts`' return value. The hiders' trade versions are not bumped either: today a pair change also changes what a hide covers without a bump, and the matches cache expires in 5 minutes (`packages/lib/src/server/list-touch.ts:12`).

### 5. Hide, Unhide, the Hidden list and the worker by row

**`hidePost`:**

```sql
WITH ${postsCte}
INSERT INTO hidden_trade_post (user_id, post_id, list_id)
SELECT ${viewerId}, r.id, posts.id FROM posts
CROSS JOIN LATERAL (SELECT ${postRowSql("posts")} AS id) r
WHERE posts.id = ${listId} AND posts.user_id <> ${viewerId} AND r.id IS NOT NULL
ON CONFLICT DO NOTHING
RETURNING post_id
```

- It writes the anchor's row, and the anchor as `list_id` for a rolled-back build.
- The `NOT inHiddenPostSql` guard goes: a post that is already covered is the same row, and the primary key now refuses it.
- The version bump stays, on a returned row.
- `r.id IS NOT NULL` stays as a guard. Since `trade-post-state` part B every `posts` anchor comes from a row, so it never filters anything; it is redundant and harmless, and keeps a post with no row from ever reaching the trigger.

**`unhidePost`** keeps its shape on the new column:

```sql
DELETE FROM hidden_trade_post gone
USING (VALUES (${listId}::int)) AS named(id)
WHERE gone.user_id = ${viewerId}
  AND gone.post_id IN (SELECT hp.post_id ${hidesOfSql(viewerId, "named")})
```

**`fetchHiddenPosts`** joins `hp` → `trade_post r ON r.id = hp.post_id` → `lists lead ON lead.id = r.lead_list_id`, then `LEFT JOIN lists want ON want.id = r.want_list_id`. The output shape is unchanged:
- **`listId`** is `r.lead_list_id`, never `hp.list_id`, which can be NULL or point at a list that left the row. It is unique per viewer while drift check 2 holds. The web keys by it, tests pending by it, and sends it to `unhidePost`, which finds the row through it.
- **`slug`:**
  - the lead's, when it is on Trade and matchable;
  - else the want list's, when that is on Trade;
  - else the lead's.

  Today's last fallback was the named list. `slugTarget` redirects a want slug to the anchor.
- **`names`** are `[lead, want]` or `[lead]`, as today. `profile` is the lead's bound profile, as today.
- One entry per hide is now one entry per post, so the two subqueries and the JS dedupe go.

**`/rpc` and open tabs.**
- `hidePost` and `unhidePost` keep `tradePostInputSchema`.
- An open tab sends the anchor from its ⋯ menu and Undo, which is a list of exactly one row.
- From its Hidden list it sends the `listId` it loaded before the deploy, a list the old rule tied to that post. That list is in the backfilled row unless the post split since.
- Both validate and reach the right row. No input changes, so `/api/v1` is untouched: none of the three procedures is mounted there.

**The worker.**
- `pairs.ts` follows through the `hiddenPostAtSql` import, with no edit.
- `record.ts:51` becomes `AND gone.post_id IN (SELECT hp.post_id ${hidesOfSql(sql\`u.user_id\`, "pl")})`. On `list_id` it would miss every hide whose `list_id` is NULL or names a list that left the row.
- The worker image is rebuilt, and `import-boundary.test.ts` covers the import chain, which is unchanged.

**The web needs no edit.** `post.id` is still the anchor and the anchor names one row. `showHidden` drops or marks the post the server hides. `onSuccess` refetches either way. Rejected: re-keying the web by row id, which is `post-id-inputs`' work, along with a `postId` input.

### 6. The schema, and the expand migration

`schema.ts`, `hiddenTradePost`:
- `listId: integer("list_id")`: nullable, no `references`;
- `postId: integer("post_id").notNull().references(() => tradePost.id, { onDelete: "cascade" })`;
- `primaryKey({ columns: [t.userId, t.postId] })`;
- `index("hidden_trade_post_post_id_idx").on(t.postId)`, which the cascade and the moves look up by;
- `hidden_trade_post_list_id_idx` is kept;
- the doc comment: the hide names a post's row and covers its lists. `list_id` is the anchor it was made on, read only by builds before this change.

**Why `list_id` loses its foreign key now, not in a later contract.**
- While `list_id` cascades, `deleteList`'s list delete (`edit.ts:150`) deletes a hide made on H right after `writePosts` re-led H's row to W. That breaks rule 1 from the first day.
- `SET NULL` was the alternative, but the key also takes `KEY SHARE` on the `lists` row whenever a hide is written. `writePosts` holds that row `FOR UPDATE`, so a hide inserted during a merge could deadlock with the move's `ON CONFLICT` wait on it.
- With no key, a deleted list leaves its id in `list_id`. Only a rolled-back build reads it, and to that build such a hide covers no list on Trade.

**The migration, `hidden_trade_post_by_row`.** `db:generate` gives:
- the primary key swap;
- `ADD COLUMN`;
- `DROP NOT NULL`;
- the foreign key drop and add;
- the index.

The hand edits put the statements in this order, each before its own `--> statement-breakpoint`:

1. `SELECT set_config('lock_timeout', '1s', true);`: while the migration waits for `lists`, every later reader and writer of `lists` queues behind it, so it gives up after 1 s.
2. `LOCK TABLE "lists" IN ACCESS EXCLUSIVE MODE;`, then `LOCK TABLE "trade_post" IN SHARE ROW EXCLUSIVE MODE NOWAIT;` and `LOCK TABLE "hidden_trade_post" IN ACCESS EXCLUSIVE MODE NOWAIT;`.
   - **ACCESS EXCLUSIVE on `lists`, first, holding nothing.** Dropping the `list_id` key takes ACCESS EXCLUSIVE on `lists` (task 2.3 measured it), so the migration takes that mode up front rather than a weaker one it would upgrade. Every writer locks `lists` before `trade_post` and hides, so none can be waiting on the migration while it waits for `lists`. This is the owner's "EXCLUSIVE, or stronger as measured" rule, applied by the coordinator on 2026-11-20.
   - **Every later lock at once, or fail (`NOWAIT`).** A statement that names `hidden_trade_post` before `lists` (`fetchHiddenPosts`, the worker's `unhidePosts`) can hold its hides lock while queued behind the migration's `lists` lock. Waiting for it would deadlock, so `NOWAIT` makes the migration the side that fails (55P03), and it is rerun.
   - **SHARE ROW EXCLUSIVE on `trade_post`** covers the new foreign key without blocking reads of `trade_post`.
3. `ALTER TABLE … DROP CONSTRAINT "hidden_trade_post_list_id_lists_id_fkey";`
4. `ADD COLUMN "post_id" integer;`
5. The backfill, by the `postRowSql` rule:
   ```sql
   UPDATE "hidden_trade_post" hp SET "post_id" = coalesce(
     (SELECT min(id) FROM "trade_post" WHERE "lead_list_id" = hp."list_id"),
     (SELECT min(id) FROM "trade_post" WHERE "want_list_id" = hp."list_id"));
   ```
6. Fold two hides of one person on one row into the newer. Expected 0 on production:
   ```sql
   DELETE FROM "hidden_trade_post" older USING "hidden_trade_post" newer
   WHERE older."user_id" = newer."user_id" AND older."post_id" = newer."post_id"
     AND (older."created_at", older."list_id") < (newer."created_at", newer."list_id");
   ```
7. `DELETE FROM "hidden_trade_post" WHERE "post_id" IS NULL;`, the hides on a list in no row. Expected 2 on production. Their lists are off Trade (drift check 1 reads zero), so they hide nothing anyone sees. Under rule 3, such a list shows when it is posted again (Owner confirmations, 2).
8. `DROP CONSTRAINT "hidden_trade_post_pkey"`, `ALTER COLUMN "list_id" DROP NOT NULL`, `ALTER COLUMN "post_id" SET NOT NULL`, `ADD CONSTRAINT "hidden_trade_post_pkey" PRIMARY KEY ("user_id", "post_id")`.
9. `CREATE INDEX "hidden_trade_post_post_id_idx" …`, then the foreign key to `trade_post(id)` `ON DELETE CASCADE`.
10. The trigger of decision 7.

**Cost.** The table holds about 330 rows, so the transaction is sub-second. The `lock_timeout` keeps it from queueing readers behind a long transaction. A plain index is fine: `CONCURRENTLY` cannot run in Drizzle's migrate transaction, and the precedent is `20261115164916_offer_post_id`.

Rejected:
- **A second table.** Every reader and the worker would switch tables, for about 330 rows.
- **A nullable `post_id` with a unique index until a contract.** This would serve only if hides from the old build could carry NULL. Decision 7 gives them a row.

### 7. Hides the old build writes: a `BEFORE INSERT` trigger

Migrations run before the deploy (`packages/db/AGENTS.md`). This change's readers switch in the same deploy that the migration precedes, so a hide the old build writes between the migration and the web deploy needs a row. The same goes for a hide written during a rollback.

```sql
CREATE FUNCTION hidden_trade_post_fill_post_id() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.post_id := coalesce(
    (SELECT min(id) FROM trade_post WHERE lead_list_id = NEW.list_id),
    (SELECT min(id) FROM trade_post WHERE want_list_id = NEW.list_id));
  -- a list in no row has no post to hide
  IF NEW.post_id IS NULL THEN RETURN NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER hidden_trade_post_fill_post_id BEFORE INSERT ON hidden_trade_post
  FOR EACH ROW WHEN (NEW.post_id IS NULL) EXECUTE FUNCTION hidden_trade_post_fill_post_id();
```

- **It fires only for a build that does not name `post_id`.** The new build always names it.
- **What the old `hidePost` gets:**
  - its `ON CONFLICT DO NOTHING` (no target) now meets the new primary key;
  - its `RETURNING list_id` is empty when the trigger skips the row, so it skips the version bump.
- **It is the repo's first trigger.** It is dropped with `list_id` by the later contract change (Inputs for later phases).

Rejected:
- **A reconcile in a later migration, by time window (offer-post-id's way).** `offer.post_id` had no reader when it shipped. Here the readers are live from the deploy, so a post hidden in the gap would show again until the reconcile ran, and so would every hide made during a rollback.
- **Readers that fall back to `list_id` when `post_id` is NULL.** Both rule forms, the Hidden list and the worker would carry a second rule until the contract.

### 8. The build before this change, against the migrated table

| Its code | What happens |
| --- | --- |
| `hidePost` | The trigger gives the hide a row. A post it covers through its other half is refused by its own guard, as today. |
| feed, candidates, `hiddenPostAtSql` | It reads `list_id` by its rule. The two rules agree on every hide written before the migration and every hide `hidePost` writes after it. |
| `unhidePost`, the worker's `unhidePosts` | They delete by `list_id`. They miss a hide whose `list_id` is a deleted list. That build doesn't see such a hide as hiding anything either. |
| `fetchHiddenPosts` | Its inner join on the named list drops a hide whose list is deleted. Otherwise it is as today. |
| `deleteList` | No `list_id` cascade any more, so a re-led row keeps its hide, which is the new rule. |
| `writePosts` merges (D1 to D3) | The row delete cascades the hide and nothing moves it. **This is the one loss.** It lasts from the migration to the web deploy, and through any rollback period. |

So the build before this change, and any later one, runs against the migrated table.

### 9. Drift

- **Must be zero, added to `CHECKS`:** "a hide on its hider's own row (row ids)": `SELECT hp.post_id FROM hidden_trade_post hp JOIN trade_post tp ON tp.id = hp.post_id WHERE tp.user_id = hp.user_id`.
  - `hidePost` refuses own posts.
  - Moves stay inside one person's rows, since a write plans only its owner's rows.
  - No writer changes `trade_post.user_id`.
- **A note, never failing:** "a hide that the build before this change reads differently (row ids)": `hp.list_id IS NULL OR hp.list_id NOT IN (tp.lead_list_id, tp.want_list_id)`. It counts what a rollback would lose, and the contract change drops it.
- **Numbering.** Since `trade-post-state` the script has six checks and two notes. The hide check is check 7 and the hide note the third note.
- **`apps/worker/AGENTS.md`** loses "none compares hides with rows" (the script's header never had it). Both the header and that paragraph now say that a hide must sit on another person's row.

### 10. Proof

- **Pure tests** (task 3): the planner cases and the model test's invariants (decision 3). No test touches the database.
- **Staged comparison, read-only, local and production.** A scratch script under `apps/worker/.hides-by-row/` puts a CTE named `hidden_trade_post` ahead of the statements:

  ```sql
  WITH hidden_trade_post AS (
    SELECT user_id, list_id, created_at, <postRowSql over list_id> AS post_id
    FROM public.hidden_trade_post)
  ```

  An unqualified `hidden_trade_post` in the built helpers then reads the backfill as it will be, before any migration. This is the archived `trade-post-hides` trick. For every hider, it compares:
  - the posts the feed hides (`inHiddenPostSql` over `posts`);
  - the lists on Trade that matching drops;

  under the previous helper text and the new helpers. Expected: 0 newly hidden and 0 no longer hidden. The two orphans' lists are in no row, so off Trade.

  Locally, staged hides cover every planner path, as the archived change did with 517 staged hides.
- **The local migration** (task 7.1), applied with the owner's approval. Before it, task 2.3 runs the `DROP CONSTRAINT` once in a local `psql` session inside `BEGIN … ROLLBACK`, to read its lock mode from `pg_locks`.
- **The worker's lookup form, measured.** `hiddenPostAtSql` runs once per (recipient, list) in `pairs.ts`, and `unhidePosts` runs the same fragment. The new `hidesOfSql` has no `(user_id, list_id)` key left to probe: Postgres either takes the viewer's hides through the primary key's `user_id` prefix and joins `trade_post` by its primary key, or drives from `trade_post`'s two list indexes. Tasks 7.2 and 8.4 run `EXPLAIN (ANALYZE)` of the `pairs.ts` lateral for the heaviest hider, record the plan's shape, and hold it to 1 ms per (recipient, list) probe.
- **Service functions locally:** `fetchHiddenPosts`, `hidePost`, `unhidePost` and `writePosts` for each planner path in decision 2, as localtest1 hiding localtest2's posts, plus the drift script.
- **The browser pass** (task 7.5).
- **Production, read-only, each run with the owner's go-ahead:**
  - task 8.1, before the migration: the counts and the staged comparison;
  - task 8.4, after the deploy: the drift script and `EXPLAIN` of the For you hide filter for the heaviest hider.

### 11. Docs

- **`packages/api/docs/trade.md`, the hides paragraph (Partner rules, hidden and idle posts):**
  - a hide names a row and covers its lists;
  - it follows the lead through writes (decision 2's rule);
  - `coveredListsSql` and `hidesOfSql` still change together;
  - a hide ends by Unhide, by the worker, or when its row ends.

  Drop the `list_id` cascade. In Trade posts, say that `writePosts` moves hides before it deletes rows.
- **`packages/db/AGENTS.md`, Trade posts:** `hidden_trade_post.post_id`, the trigger and why it exists, and that `list_id` is kept only for the build before this change, without a key.
- **`apps/worker/AGENTS.md`:** Trade post drift (decision 9), and want alerts (`unhidePosts` deletes by row).
- **`packages/api/AGENTS.md` and the root `AGENTS.md`:** no convention changes. The task says so.

## Owner confirmations before apply

Each is a default this design takes. Overturning one changes a task. Confirmed by the owner on 2026-11-20: all four recommendations stand.

1. **Takeover follows the lead** (decision 2). The alternative is strict row identity, which hides W_old's new Buy post instead. Recommended: follow the lead.
2. **Delete the 2 hides on a list in no row** in the expand migration (decision 6, step 7). The alternative is to keep them, which needs `post_id` nullable, a unique index instead of the primary key, and a contract later. Recommended: delete.
3. **A trigger for the old build's hides** (decision 7), the repo's first. The alternative is a reconcile by time window, with posts hidden in the gap showing again until it runs. Recommended: the trigger.
4. **The interim Edit post outcome** (Risks): from this deploy until `trade-post-planner-shared`, swapping or dropping a hidden post's have list shows the edited post. Recommended: accept. The next change in the chain fixes it.

Four refresh recommendations, also taken by the owner on 2026-11-20 and built to:

5. **Decision 6, the lock on `lists`:** EXCLUSIVE, or the stronger mode task 2.3 measures for the `DROP CONSTRAINT`, never weaker. Decision 6 step 2 and task 2.4 say so.
6. **Decision 1:** comparing rows in the feed stays out of scope; its reason now reads from part B's `postsCte`, where a row id costs one column, not two subqueries per post.
7. **Decision 5:** `hidePost` keeps its `r.id IS NOT NULL` guard; since part B every `posts` anchor comes from a row, so it is redundant and harmless.
8. **Decision 3, the model-test floors:** if the random test cannot reach 100 moves of each of D2, D3 and takeover at a sane iteration count, each floor drops to what it reliably reaches, with every kind still occurring at least once in every run; the counts go in As built.

## Risks / Trade-offs

- **[Edit post swapping or dropping a hidden post's have list shows the edited post]** The planner gives the edited post a new row (`packages/db/AGENTS.md`, Trade posts), and the hide stays on the old have list's row.
  - Today the post stays hidden when the hide named the want list. When it named the have list, the post shows today as well.
  - → `trade-post-planner-shared` keeps the edited row, and the hide with it. Until then the user can hide the post again. Owner confirmations, 4.
- **[A hide made while the owner merges that very post is lost]** The merge's move reads the hides before the new one commits. The row delete then waits for the new hide's `KEY SHARE`, and its cascade removes the hide.
  - → It needs a hide and a merge of the same post in the same instant. The post shows again with Hide post.
- **[The build before this change drops a hide on a merge]** This holds from the migration to the web deploy, and during a rollback (decision 8).
  - → The window is a minute. Merges of hidden posts are rare (5 people hide). The drift note counts the hides such a build reads differently.
- **[Coverage through lists is wrong once a list is in two rows]**
  - → Drift check 2 fails before that state can arise. `trade-post-reads-by-row` switches the readers to rows before `shared-lists` lifts the refusal.
- **[The two rule forms must agree]**
  - → Both are written as "a list of a hidden row". The staged comparison checks every local list against both.
- **[Web and worker on different builds]**
  - A new web with an old worker means that until the rebuild, alerts and the worker's unhides read `list_id`. Moved hides keep a `list_id` of their merged row. A re-led row's hide has its deleted lead in `list_id`, so the old worker alerts on that Buy post's entries and can't unhide it.
  - → Both last until the rebuild, and the alert links to a page with Unhide post. The rollout rebuilds the worker right after web.
- **[`trade-post-state` edited the same files]** (`trade-post-rows.ts`, `shared.ts`, `lists.ts`, `postsCte`)
  - → It landed first, and this change is written on top of it. Its `planPostWrite` row-state rule and this change's `movesOf` both read the final rows, and neither changes the other's output.
- **[The migration's lock on `lists`]** If task 2.3 finds that the `DROP CONSTRAINT` takes `ACCESS EXCLUSIVE` on `lists`, every read of `lists`, which means nearly every page, waits for the migration transaction.
  - → Task 2.3 measured ACCESS EXCLUSIVE, so every read of `lists` waits for the migration transaction. It touches about 330 hides, the `lock_timeout` gives up after 1 s rather than queueing readers behind a long transaction, and `NOWAIT` on the later locks fails at once instead of waiting.
- **[The first trigger in the repo]**
  - → It is dropped with `list_id`. The `packages/db/AGENTS.md` paragraph names it, so `db:generate` drift is not mistaken for it. Drizzle's snapshot does not track triggers.

## Migration Plan

1. **Locally:**
   - implement groups 1 to 6 and run `bun run check` and `bun run build --filter=web`;
   - with the owner's approval, migrate the local database;
   - run the staged and service checks, the drift script (all checks zero) and the browser pass.
2. **With the owner's go-ahead, read-only on production (task 8.1):**
   - the counts: hides; hides on a list in no row (expected 2); two hides of one person on one row after the backfill (expected 0); hides on the hider's own row (expected 0);
   - the staged comparison (expected 0 and 0);
   - the drift script, checks 1 to 6 at zero;
   - `EXPLAIN` of the For you hide filter for the heaviest hider on the live build, the baseline for step 5.

   Any other number stops the rollout.
3. **The owner commits and pushes.** CI builds web.
4. **On the VPS:**
   - `docker compose run --build --rm migrate`;
   - bring up web;
   - rebuild and restart the worker.

   Record the migration's `applied_at` and the time the new web serves.
5. **With a go-ahead, read-only:**
   - the drift script (its checks zero, the hide note printed);
   - the hide count against step 2 minus orphans and folds;
   - `EXPLAIN` of the For you hide filter for the heaviest hider, which must stay within 1.5 times the figure task 8.1 takes on the live build before the migration. The 2026-11-15 figure (2.8 to 3.4 ms) predates `trade-post-state` part B, which rebuilt `on_trade` from the rows;
   - `EXPLAIN` of the `pairs.ts` lookup for that hider (decision 10).

**Rollback.** Redeploy the previous web and worker images: web B and worker B, `1568f6b1`. Web may go no lower than web A, `2f107ab3` (`trade-post-state`'s floor); both have the same hide code. The table stays migrated: the trigger serves that build's hides, and decision 8 lists what it reads differently. No down-migration is planned.

## Inputs for later phases

- **The contract (a later change, two deploys, as `packages/db/AGENTS.md` asks):**
  - **Deploy one:** stop writing `list_id` (`hidePost`, the move) and drop it from `schema.ts`, with a no-op migration.
  - **Deploy two:** `DROP TRIGGER`, `DROP FUNCTION`, and `DROP COLUMN IF EXISTS "list_id"` (its index goes with it), with `lock_timeout`.

  After deploy two no build from before this change can run.
- **`trade-post-planner-shared`:**
  - `movesOf`'s holder becomes many rows once a list can sit in two. The rule must then say which post a hide follows, probably the one the write names.
  - Keeping the edited row on Edit post's swap and drop removes the interim risk above.
- **`trade-post-reads-by-row`:**
  - `hiddenRowsSql(viewer)` (`SELECT post_id FROM hidden_trade_post WHERE user_id = …`) replaces `coveredListsSql` once posts and candidates carry their row id;
  - `hidesOfSql` takes a row alias;
  - the worker's per-entry read asks for the entry's posts' rows.
- **`post-id-inputs`:**
  - `hidePost` and `unhidePost` take an optional `postId` beside `listId`;
  - `hiddenPosts` adds `postId`. Its `listId` (the lead) is ambiguous for a shared lead;
  - the web re-keys the Hidden list and the optimistic update by row.

- **For later expand migrations: the count baseline.** Take it just before the migrate, or compare against the hides (or rows) older than the baseline. Normal writes, such as the want-alerts worker's unhides, move the count between a baseline read and the migration: here 5 hides went in the 18 minutes between 8.1's read and the migrate (As built, 8.4).

## Assumptions and unverified facts

- **From earlier changes, not re-run here:** 327 hides by 5 people, 2 orphans and none doubled (2026-11-15/16). Task 8.1 re-reads them.
- **Not verified:**
  - which lock mode `DROP CONSTRAINT` on a key into `lists` takes on `lists` in Postgres 18 (task 2.3 reads it);
  - the plan of the worker's lookup form on the new key (tasks 7.2 and 8.4).
- **Assumed:** two hides of one person never map to one row on production. The archived pass found none on 2026-11-15. The fold handles them if they appear.
- **Checked by reading:**
  - the four delete sites and `relead`;
  - `deleteList`'s order;
  - that none of the hide procedures is on `/api/v1`;
  - that no hide code lives outside `packages/api/src`, `packages/db/src`, `apps/worker/src` and `apps/web/src` (grep over `packages/lib/src` and `apps/indexer/src`);
  - that the web reads only `listId`, `slug`, `names`, `handle`, `user` and `profile` of a Hidden list entry;
  - that `posts.id` is the anchor list id.
- **Read on 2026-11-20:** `trade-post-state`'s archived design, As built included. The design was written against its proposal only; the refresh to `4b0e1614` checked every cited line against what it built.

## Open Questions

None beyond the owner confirmations above.

## As built

Applied on 2026-11-20 in the Orca worktree on `4b0e1614`, uncommitted, up to the owner gates (2.3, 2.4's lock line, group 7 onward).

- **1.1, `staged.ts`.** It stages `hidden_trade_post` as a CTE named like the table, with `post_id` by `postRowSql` over `list_id`, ahead of `postsCte`, and runs the imported helpers.
  - `--previous` swaps in a verbatim copy of today's `coveredListsSql` and `hidesOfSql` (aliases `previous_hp` and `previous_row`), for task 8.1.
  - `--stage` replaces the table with made-up hides by one viewer on every third list of each kind that is in a row. For every have, sale and want list it then reports whether the set form, the lookup form and "a list of a hidden row" agree.
  - `--prod` refuses to start unless the transaction is read-only; without it, the script refuses unless the database and Redis hosts are local.
  - It lives outside the repo, in `/private/tmp/claude-501/hides-by-row/`, and is copied into `apps/worker/.hides-by-row/` only to run, because that folder is linted and shows as untracked (the tasks' ground rules say otherwise; `trade-post-state` found the same).
  - On the unchanged code, `before.json` is empty: the local database holds no hides. The imported helpers and the `--previous` copy give the same file.
  - `--stage` on the unchanged code: 212 of 1,480 lists covered, and the set form, the lookup form and the row rule agree on every list (the list rule equals the row rule while a list is in one row). Saved as `stage-before.json` for 7.2.
- **1.2, local counts (read-only).** 0 hides, 0 hiders, 0 on a list in no row, 0 shared `(user, row)` pairs after the backfill, 0 on the hider's own row. localtest2's record for restores:
  - lists: 13142 `lt2wants` (want, on, Buying only), 13168 `lt2spares` (have, on), 13169 `lt2extras` (have, on), 13170 `lt2sale` (sale, on), 13173 `lt2quiet` (have, on), 13402 `Ec6Vd_tJQ` (want, on), 13403 `7bnmLvQ2M` (want, on);
  - rows: 1000303 (13168 + 13402), 1000304 (13169 + 13403), 1000305 (13170), 1000439 (13142), 1000452 (13173), all on Trade.
- **2.1 and 2.2.** `hiddenTradePost` now has `list_id` nullable with no key, `post_id` NOT NULL referencing `trade_post(id)` `ON DELETE CASCADE`, the primary key `(user_id, post_id)`, and `hidden_trade_post_post_id_idx` beside the kept `hidden_trade_post_list_id_idx`.
  - `db:generate` stopped once to ask whether the new foreign key renamed the dropped one. It is a new key, answered with `--hints` (`create`, `hidden_trade_post_post_id_trade_post_id_fkey`).
  - It wrote `20261120103752_hidden_trade_post_by_row`. Its snapshot's `prevIds` is `011614da-2c69-4ca2-82d4-95bbb73a6a42`, the reconcile's.
  - Its deltas touch only `hidden_trade_post`: the `post_id` column, the index, the new key, the dropped `list_id` key, `list_id` nullable and the primary key's columns. No `trade_post` column or check changed.
- **2.4, drafted, not done.** The migration is written in decision 6's order, steps 1 to 10, every block before its own breakpoint, except the `lists` lock mode. That line reads `LOCK TABLE "lists" IN TODO_TASK_2_3 MODE;`, invalid SQL on purpose, so the migration fails at once if anyone applies it before task 2.3 sets the mode (EXCLUSIVE or stronger). `db:generate` afterwards reports no schema change. Two drafting choices:
  - the primary key is re-added by name (`hidden_trade_post_pkey`);
  - the fold's tie-break compares `(created_at, list_id)` as decision 6 gives it.
- **2.5.** `packages/db/AGENTS.md`, Trade posts, now names `post_id`, the primary key and the cascade; `list_id` without a key, read only by builds before `hidden_trade_post_by_row`; and the trigger, why it exists, that Drizzle's snapshot does not track it, and that the contract change drops it by hand.
- **3, the planner.**
  - `PostRowOps` gains `moves`. `planPostRows` builds its writes as before, then sets `moves: movesOf(rows, written)` on what `relead` returns; `relead` only takes the type without `moves`.
  - `movesOf` is decision 3's function, copying each row's id and lists, never its state.
  - `planPostWrite` is unchanged and passes `moves` on through `PostWriteOps`.
  - **Unit tests.** One per row of decision 2's table: D3, D2, `relead`, D1 (the existing "two rows led by one list" test, renamed), `deleteList` with the want list on and off Trade, unpair, takeover, and Edit post's swap. Every existing literal expectation now states its `moves`; the five that move a hide were checked against decision 2's rule.
  - **Model test.** `checkMoves` runs on every random write of the rows world. Each row starts with one simulated hide, tagged with the row it started on. The plan's moves copy it, the sources are deleted and the deleted rows cascade. It asserts:
    - the moves themselves: each `to` survived and existed before, no id is both a `from` and a `to`, each `from` appears once, and each `to` holds its `from`'s old lead;
    - the hides: each row's hide ends on the surviving row holding its old lead; a row with no such holder keeps its own hide if it survives (a re-led row whose lead was removed); and the hide ends otherwise.
  - **Mutation checks.** With `moves` emptied the hide check fails; with self-moves allowed, the "both a from and a to" check fails. The first version tested only that a target row held some hide, so emptying `moves` passed it; the tagged hides replaced it.
  - **Move counts** over the existing 1,000 runs of 40 writes, which are seeded and deterministic: **D2 96, D3 41, takeover 2, D1 0**. 100 takeovers would take about 50,000 runs. Under the owner's rule the floors are D2 ≥ 50, D3 ≥ 20, takeover ≥ 1 and D1 exactly 0, each kind still occurring in every run.
- **4.** `writePosts` runs `writeMoves` before its deletes: decision 4's `INSERT … ON CONFLICT (user_id, post_id) DO UPDATE` keeping the later time and the newest `list_id`, then the `DELETE` of the sources, one `unnest` of two int arrays, only when `moves` is not empty. The `lockTradeLists` comment gives the order lists, rows, hides.
- **5.**
  - `coveredListsSql` and `hidesOfSql` are decision 1's text. `hidesOfSql` no longer reads `postPartnerSql`, which stays for its other callers.
  - `hidePost` writes the anchor's row and the anchor as `list_id`, keeps `r.id IS NOT NULL` and returns `post_id`. `unhidePost` deletes by `post_id`.
  - `fetchHiddenPosts` joins the hide's row, its lead and its want list: `listId` is the lead, and the slug's last fallback is the lead. The two subqueries and the JS dedupe are gone, and so is the old join's `want.user_id = lead.user_id`, since a row's lists share its owner (drift check 3).
  - `docs/trade.md` has the row rule, the moves and the three ways a hide ends. `writePosts` moving hides before it deletes rows is now in Trade posts.
  - The 5.4 grep leaves `list_id` only in `hidePost` and `writeMoves`, its writers.
- **6.**
  - `record.ts`' `unhidePosts` deletes by `post_id`.
  - The drift script gains check 7 (a hide on its hider's own row) and the third note (a hide that a build before this change reads differently), with a header paragraph.
  - `apps/worker/AGENTS.md`: Trade post drift drops "none compares hides with rows", adds check 7 and says "three counts" for the notes; Want alerts says `recordRun` deletes the hide of the entry list's row.
  - **For task 8.1.** The working tree's drift script reads `hidden_trade_post.post_id`, so before the migration check 7 fails on the missing column. 8.1's "checks 1 to 6" run needs the live build's script (`git show 1568f6b1:apps/worker/src/script/trade-post-drift.ts`) or check 7 left out.
- **Checks.** `bun run check` passes (27 of 27; every suite 0 fail; `@repo/api` lint keeps one warning that was already there, in `serial-anchored.ts`), and so does `bun run build --filter=web`. `bunx oxfmt` reformatted the two planner files once.
- **Read-only preview of the new helpers, not task 7.2.** `staged.ts --stage` on the new code, through the staging CTE (no migration), gives the same hidden posts, covered lists and per-list hides as `stage-before.json` on the old code: 212 of 1,480 lists covered, the set and lookup forms agreeing with the row rule on every list. The made-up hides' times came from `now()`, so the files differed only there; `--stage` now uses a fixed time. `counts.ts` (task 1.2's counts, with the same guards and a `--prod` mode) is saved beside `staged.ts` for 7.1 and 8.1.
- **Not yet run against a database:** `hidePost`, `unhidePost`, `fetchHiddenPosts`, `writeMoves`, the worker's `unhidePosts` and drift check 7, all of which need `post_id` (group 7). The local baseline has no hides, so 7.2's before-and-after comparison is empty locally; `--stage`, task 7.3 and task 8.1 carry that proof.
- **Lock order, an input for 2.3 and 2.4 (not acted on).** While the migration runs, the live build (`1568f6b1`) still runs its `hidePost`: an `INSERT` that takes ROW EXCLUSIVE on `hidden_trade_post`, then, in its `list_id` foreign-key check, ROW SHARE on `lists`. The migration holds `lists` in EXCLUSIVE, which conflicts with ROW SHARE, then needs ACCESS EXCLUSIVE on `hidden_trade_post` for the `DROP CONSTRAINT`. A hide landing in that window would deadlock with the migration, and Postgres aborts one of the two: a failed hide, or a migrate rolled back whole and rerun. ACCESS EXCLUSIVE on `lists` may close the window, if the old `hidePost` waits for its `lists` lock before it takes the one on `hidden_trade_post`; task 2.3's measurement can settle which. The migration's comment no longer claims it never holds a later table while waiting on an earlier one.
- **Task 2.3's last sentence** ("if it is weaker, stop and ask the owner") predates the owner's EXCLUSIVE floor. Under the floor, a weaker measured mode no longer needs asking: the migration takes EXCLUSIVE.

- **2.3, the lock measurement (2026-11-20, approved by the owner; local only, every session rolled back or timed out, PostgreSQL 18).**
  - **The migration's statements**, run in order in one `BEGIN … ROLLBACK` without the two `LOCK TABLE`s, with this backend's `pg_locks` on the three tables read after each:

    | Statement | Takes |
    | --- | --- |
    | `set_config('lock_timeout')` | nothing |
    | `DROP CONSTRAINT hidden_trade_post_list_id_lists_id_fkey` | **ACCESS EXCLUSIVE on `lists`** and ACCESS EXCLUSIVE on `hidden_trade_post` |
    | `ADD COLUMN post_id` | nothing new (ACCESS EXCLUSIVE on `hidden_trade_post` held) |
    | the backfill `UPDATE` | ROW EXCLUSIVE on `hidden_trade_post`, ACCESS SHARE on `trade_post` |
    | the fold `DELETE` | ACCESS SHARE on `hidden_trade_post` |
    | the orphan `DELETE` | nothing new |
    | the primary key and NOT NULL statements | SHARE on `hidden_trade_post` |
    | `CREATE INDEX` | nothing new |
    | `ADD FOREIGN KEY` to `trade_post` | SHARE ROW EXCLUSIVE on `hidden_trade_post`; ROW SHARE and SHARE ROW EXCLUSIVE on `trade_post` |
    | the function and the trigger | nothing new |

    The `DROP CONSTRAINT` takes ACCESS EXCLUSIVE on `lists`, stronger than the EXCLUSIVE floor. By the owner's rule (decision 6), the migration's first `LOCK TABLE "lists"` takes the stronger mode, ACCESS EXCLUSIVE, since taking EXCLUSIVE and then upgrading could deadlock.
  - **The `DROP CONSTRAINT`'s own order.** It was probed alone, with a second session holding ACCESS SHARE on `lists`. It held ACCESS EXCLUSIVE on `hidden_trade_post` and waited for ACCESS EXCLUSIVE on `lists`. Without an explicit `LOCK TABLE "lists"` ahead of it, the migration would lock hides before lists.
  - **The live build's writers**, each a plain-SQL equivalent run in a probe session that one holder session blocks; an observer read the probe's granted and waiting locks:
    - **`hidePost`** (`WITH` a read of `trade_post` joined to `lists`, `INSERT INTO hidden_trade_post (user_id, list_id) … ON CONFLICT DO NOTHING`):
      - its statement start locks ACCESS SHARE on `trade_post`, then ACCESS SHARE on `lists`, then ROW EXCLUSIVE on `hidden_trade_post`;
      - its `list_id` foreign-key check then asks for ROW SHARE on `lists`;
      - against EXCLUSIVE on `lists` it held all three and waited for that ROW SHARE: the deadlock window, since the migration then needs ACCESS EXCLUSIVE on `hidden_trade_post`;
      - against ACCESS EXCLUSIVE on `lists` it held only ACCESS SHARE on `trade_post` and waited for ACCESS SHARE on `lists`, before taking anything on `hidden_trade_post`. ACCESS SHARE on `trade_post` does not conflict with the migration's SHARE ROW EXCLUSIVE.
      - So its order is `trade_post`, `lists`, hides, then `lists` again.
    - **`deleteList`'s list `DELETE`** (`DELETE FROM lists`): ROW EXCLUSIVE on `lists`, then, in the `list_id` cascade, ROW EXCLUSIVE on `hidden_trade_post`. Against ACCESS EXCLUSIVE on `hidden_trade_post` it held `lists` and waited for the hides. The real `deleteList` takes `lists` ROW SHARE first (`lockTradeLists`), then `trade_post` (`writePosts`), then this `DELETE`, so its order is `lists`, `trade_post`, `lists`, hides.
    - **`writePosts`' row `DELETE`** (`DELETE FROM trade_post`), on today's schema: it takes no lock on `hidden_trade_post` (it ran through a holder of ACCESS EXCLUSIVE on it), because no hide references `trade_post` yet. After the migration its new `post_id` cascade takes ROW EXCLUSIVE on `hidden_trade_post` after `trade_post`, so `writePosts` keeps `lists`, `trade_post`, hides.
  - **What the measurements say about the lock line (for the coordinator's review, not applied).** With `LOCK TABLE "lists" IN ACCESS EXCLUSIVE MODE` first, every writer measured waits on `lists` before it holds anything on `hidden_trade_post`. `hidePost` would hold only ACCESS SHARE on `trade_post`, which the migration's SHARE ROW EXCLUSIVE does not conflict with. `deleteList` waits at `lockTradeLists`. So the measured orders leave no cycle. The cost is that every read of `lists` waits for the migration's sub-second transaction, bounded by `lock_timeout` (Risks, the migration's lock on `lists`).
  - Task 2.3 was ticked with 2.4 once the lock line was set (below).
- **2.4, the lock lines, set (2026-11-20).** An Opus review of the diff returned "proceed after lock fix", and 2.3's measurement confirmed its premise. The coordinator applied the owner's "EXCLUSIVE, or stronger as measured" rule: `lock_timeout` 1 s, then `LOCK TABLE "lists" IN ACCESS EXCLUSIVE MODE`, then `trade_post` in SHARE ROW EXCLUSIVE and `hidden_trade_post` in ACCESS EXCLUSIVE, both `NOWAIT` (decision 6, step 2). The migration's first twelve lines are the review's text verbatim. The writers' orders the review weighed, as measured in 2.3 or read from the code:

  | Statement | Order on `lists`, `trade_post`, `hidden_trade_post` | Against the migration |
  | --- | --- | --- |
  | the migration | `lists` (ACCESS EXCLUSIVE, holding nothing), then `trade_post` and hides, `NOWAIT` | — |
  | `writePosts` / `savePost` / `takeDownPost` | `lists` (`lockTradeLists`), `trade_post`, then hides (moves, cascade) | waits at `lists`, holding nothing |
  | `deleteList` | `lists`, `trade_post`, `lists` (the delete), hides (cascade) | waits at `lists`, holding nothing |
  | `bumpPerson` | `lists`, `trade_post` | waits at `lists` |
  | live-build `hidePost` | `trade_post` (ACCESS SHARE), `lists`, hides, `lists` again (foreign-key check) | holds only ACCESS SHARE on `trade_post`, which SHARE ROW EXCLUSIVE does not block |
  | `fetchHiddenPosts`, the worker's `unhidePosts` | hides first, then `trade_post` and `lists` | can hold hides while queued for `lists`; `NOWAIT` makes the migration fail rather than deadlock |

- **2.4, checked locally with two sessions, both rolled back (2026-11-20).**
  - **(a)** A reader holding `hidden_trade_post` while it waits for `lists`, both shapes measured: a worker `unhidePosts`-style `DELETE … USING lists` (ROW EXCLUSIVE on hides) and a `fetchHiddenPosts`-style `SELECT` (ACCESS SHARE on hides and `trade_post`). It started while the migration's session held `lists` in ACCESS EXCLUSIVE. Each time, the migration's `LOCK TABLE "hidden_trade_post" … NOWAIT` failed at once with **55P03** ("could not obtain lock"), the migration rolled back, and the reader then finished. No 40P01.
  - **(b)** A live-build `hidePost`-style `INSERT` (`WITH` a read of `trade_post` and `lists`, then `INSERT INTO hidden_trade_post (user_id, list_id)`) began while the migration's ACCESS EXCLUSIVE request on `lists` was queued behind a reader. The `INSERT` held ACCESS SHARE on `trade_post` and waited for `lists` behind the pending request. The migration gave up at its 1 s `lock_timeout` (55P03) and rolled back, and the `INSERT` then went through and returned its row. No 40P01.
- **Drift note fix.** The third note's `hp.list_id NOT IN (tp.lead_list_id, tp.want_list_id)` gave NULL whenever `want_list_id` was NULL, so a hide on a re-led Buy post (rule 1: lead deleted, row re-led to the want list alone) was never counted. It now reads `hp.list_id IS DISTINCT FROM tp.lead_list_id AND hp.list_id IS DISTINCT FROM tp.want_list_id`.
- **Model-test floors, a note from the review.** D1 = 0 is within the owner's rule, which applies "at least once" to D2, D3 and takeover only. Takeover sits at 2 against a floor of 1, so a change to the model's random writes may need more runs to keep it.

- **Group 7, the local proof (2026-11-20, approved by the owner; local database only).** `DATABASE_URL` and `REDIS_URL` both pointed at `localhost`. The record taken first (`record.ts`: localtest1's and localtest2's 15 lists, 10 rows, 0 hides and 51 offers' `post_id`) is the restore target.
  - **Seeds, on the old schema before the migration.** The local database had no hides, so localtest1 got five: on 13168 (01:00) and 13402 (02:00), two lists of row 1000303; on 13170; on 13142; and on 13174, a list in no row. `counts.ts` read 5 hides, 1 orphan, 1 shared `(user, row)` pair and 0 on the hider's own row. `staged.ts --previous` (today's helper text) gave `before-seeded.json`, the same file as the new helpers over the staged backfill.
  - **7.1.** `db:migrate` applied `20261120103752_hidden_trade_post_by_row` (migrations applied successfully, exit 0).
    - 3 hides remain, 5 minus the orphan and the fold. Each sits on the row the backfill rule names: 1000303 (the fold kept the newer, on 13402 at 02:00), 1000305 and 1000439.
    - `\d hidden_trade_post` shows the primary key `(user_id, post_id)`, `hidden_trade_post_post_id_idx`, the kept `list_id` index, the foreign key to `trade_post(id)` `ON DELETE CASCADE`, `list_id` nullable, and the trigger `hidden_trade_post_fill_post_id` (`BEFORE INSERT … WHEN (new.post_id IS NULL)`).
  - **7.2.**
    - `staged.ts --live`, a new mode that reads the migrated table itself with no staging CTE, gives the same hidden posts and covered lists as `before-seeded.json`. The per-list hides differ only by the fold: 13168 and 13402 each show the one surviving hide.
    - `--stage` on the migrated database gives the same result as the preview before it, ignoring the made-up times: 212 of 1,480 lists covered, and the set form, the lookup form and the row rule agree on every list.
    - `EXPLAIN (ANALYZE)` of the `pairs.ts` lookup (`hiddenPostAtSql` over `lists pl`, for localtest1 across 1,480 lists): per list, a sequential scan of the viewer's 3 hides (a 3-row table here) and `trade_post_pkey` per hide, filtered to the row's two lists. That is about 0.003 ms per probe, against the 1 ms bound; the whole query took 5.3 ms. On production's larger table the hides may come through the primary key's `user_id` prefix instead; 8.4 records that plan.
  - **7.3, `paths.ts`, every path of decision 2 as localtest2**, with localtest1's hides made through `hidePost`. All checks passed:
    - `relead`: an unbound have list created paired with a hidden want-only post; the row (1000472) is re-led to it, and the hide stays.
    - `deleteList` of that have list with the want list on Trade: the row is re-led to the want list, and the hide stays.
    - `deleteList` with the want list off Trade: the row is deleted, and the hide ends.
    - D3, both posts hidden: a want-only post taken off Trade, then joined by lt2quiet's live post. Its row (1000473) is deleted, and one hide stays on lt2quiet's row 1000452 at the later time.
    - Unpair: the hide stays on 1000452, and the want list's new row (1000474) is not hidden.
    - D2, both hidden: lt2quiet, off Trade, joins the live want post. 1000452 is deleted, 1000474 is re-led to lt2quiet, and one hide stays, at the later time.
    - Takeover: lt2quiet, off Trade, pairs with a live want post (1000475), and its old want list, on Trade, takes over 1000474. The hide follows lt2quiet to 1000475, and 1000474 shows.
    - Edit post swapping the have list: the hide stays on 1000475 (lt2quiet alone), and the new (H5, W3) row 1000476 shows.
    - The old build's insert, `INSERT … (user_id, list_id) … ON CONFLICT DO NOTHING RETURNING list_id`: for a list in a row, the trigger set `post_id` to that row; for a list in no row, the insert was skipped and returned nothing.
    - `fetchHiddenPosts` returned one entry per hidden row: the lead as `listId`, the slug and names of the row.
    - Two script fixes along the way, neither a design difference. A Buy post makes its want list Buying only, which can't pair (`list_pair_buying_only`), so the paths use want-only Swap posts, open to swaps, for the same want-led rows. The composer refuses to merge two posts both live (`trade_post_list_in_post`), so D3 takes the want post off Trade first and D2 edits the live post (`replaces`).
  - **7.4.** The drift script read 0 on all seven checks. The hide note counted 1 (row 1000475: after the takeover its hide still has the old want list as `list_id`), information as designed. The run showed that check 7 and the hide note selected `hp.post_id` where the script prints `id`, so their sample ids came out blank. Both now `SELECT hp.post_id AS id`, and the note named 1000475.
  - **Restore after 7.3.** The created lists were deleted through the app (`deleteList`). One SQL transaction then wrote back the recorded lists, rows (row 1000452, deleted by the D2 path, re-inserted under its old id), hides (none) and offers' `post_id`. The re-read is byte-identical to the record, and drift and notes read 0.
  - **7.5, the browser pass**, as localtest1 viewing localtest2, on the dev server at port 3200. Two isolated `browser-use` contexts (`BU_CDP_URL` 9333), each signed in through `fetch('/api/auth/sign-in/email')` from a loaded page, so no form was submitted. localtest1's hides, Undo and Unhide went through the UI (the post's ⋯ menu, the toast's Undo, `/account/hidden`'s Unhide). localtest2's writes went through the `/rpc` procedures the composer calls.
    - (a) Hide post on "lt2 quiet" in Browse: it left at once. Undo brought it back, and hiding it again stored one hide on row 1000452.
    - (b) `/account/hidden` listed it once ("lt2 quiet"). Its link opened the post page, whose menu offers Unhide post.
    - (c) "lt2 wants extras" was unpaired from lt2extras and hidden. lt2 then paired it with lt2extras, which was off Trade (D2): the pair stayed hidden, and `/account/hidden` named "lt2 extras · lt2 wants extras".
    - (c2) lt2quiet, hidden and alone, was taken off Trade. lt2 then edited the live want-only post "lt2 wants spares" into a Swap post with it: the merged post was hidden, and `/account/hidden` listed it once, as "lt2 quiet · lt2 wants spares". This is the D2 move, 1000452 to 1000478.
    - (d) lt2 unpaired (c)'s pair, keeping lt2extras on Trade alone, and posted the want list again: "lt2 extras" stayed hidden, and "lt2 wants extras" was on Browse with Hide post in its menu.
    - (e) A throwaway have list was created paired with "lt2 wants extras", the post was hidden, and the have list deleted: the re-led post stayed hidden (row 1000479), and `/account/hidden` named "lt2 wants extras".
    - (f) Unhide from `/account/hidden`: the post was back on Browse.
    - (g) An error collector installed on every new document caught one entry over all the loads, the browser's "ResizeObserver loop completed with undelivered notifications", and no error from the app.
    - No credential reached a URL or the dev-server log (a grep found none). The tabs and contexts were closed and the dev server stopped.
  - **Restore after 7.5.** As after 7.3: byte-identical to the record (lists, rows, hides, offers), 0 hides, no `hbr` list left, and drift and notes all 0. The migration stays applied locally.
  - **7.6.** `bun run check` passes (27 of 27, every suite 0 fail, the one lint warning that was already there), and so do `bun run build --filter=web` and `bunx oxfmt --check`. `apps/worker/.hides-by-row/` was removed; the scripts stay in `/private/tmp/claude-501/hides-by-row/`.
- **9.1, the package docs (2026-11-20, approved by the owner).** Checked against the code as built:
  - `packages/db/AGENTS.md`, Trade posts, already named `post_id`, the primary key and cascade, `list_id` without a key, the trigger, and that Drizzle's snapshot does not track it. It gains one sentence on the final lock order: `lists` ACCESS EXCLUSIVE first with a 1 s `lock_timeout`, then `trade_post` and `hidden_trade_post` `NOWAIT`, and why, for any later migration that touches those tables.
  - `apps/worker/AGENTS.md` (drift check 7 and the third note; `recordRun` deleting by the entry list's row) and `packages/api/docs/trade.md` (the row rule, `moves`, `writePosts` moving hides before deletes, the three ways a hide ends) describe the code as built. They are unchanged here.
  - `packages/api/AGENTS.md`, `apps/web/AGENTS.md` and the root `AGENTS.md`: no convention, trap or workflow changed (no web code, no `/rpc` or cache-key change, round trips and the import boundary kept), so they are unchanged.
- **8.1, stopped at its first read (2026-11-20, approved by the owner; production, read-only).** On commit `1a062e41`, with production at web B and worker B (`1568f6b1`) and the hides migration not run, `counts.ts --prod` ran once (`default_transaction_read_only=on`, the root `.env` only, no Redis). It read:
  - 2,440 hides by 11 people;
  - **1 hide on a list in no row, where 2 were expected**;
  - 0 shared `(user, row)` pairs after the backfill, as expected;
  - 0 hides on the hider's own row, as expected.

  The orphan count differs from the expectation, so per the task the run stopped there for the owner to decide. **The owner accepted 1 orphan in place of 2 on 2026-11-20.** The likely cause: since 2026-11-15, one of the two lists was posted to Trade again or deleted. The staged comparison, the drift script from `1568f6b1` and the `EXPLAIN` baseline did not run. 8.1 stays unticked. The hide total is also well above the design's 327 by 5 people (2026-11-15), which was not a stated expectation. No temp file is left in the repo.
- **8.1, resumed and finished (2026-11-20, production, read-only).** Same rules: `default_transaction_read_only=on`, the root `.env` only, every script refusing unless `transaction_read_only` is on, no Redis, no connection string printed, each read once.
  - **2, `staged.ts` with the previous helpers' text and with the new ones**, over the staged backfill, 11 hiders: 2,323 posts hidden and 3,574 lists covered both ways. **0 posts and 0 lists newly hidden, 0 no longer hidden**, as expected, and the per-list hides are identical for every hider.
  - **3, the drift script from `1568f6b1`** (`git show` into `/private/tmp`). Bun resolves `@repo/db` from the script's own path, so the run from there failed at module resolution, before any connection. A temporary copy in `apps/worker/.hides-by-row/`, removed after, read 1,564 rows: **checks 1 to 6 all 0**, as expected. The offer note listed the same 9 offers with no post id (8634, 8660, 8665, 8726, 8753, 8797, 8889, 8934, 9523), "in step".
  - **4, 8.4's baseline:** `EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF)` of the For you hide filter for the heaviest hider, on the live build's helpers. That is `fetchBumpPeople`'s read for that viewer, with the live `coveredListsSql` text: all types, no match filter, limit 2001. **Planning 9.5 ms, execution 19.3 ms.**
    - The hide filter is a hash right anti join of `posts` against the viewer's covered set.
    - That set is three sequential scans of `hidden_trade_post` (1,315 rows each): the hides themselves, and two hash joins to `trade_post` (1,564 rows) on `lead_list_id` and on `want_list_id`.
    - `on_trade` is a sequential scan of `trade_post` with the VALUES sides and `lists_pkey` per side (2,090 sides). The pairing, sanction, partner-hide, block and folded-want checks follow, ending in 23 people.
  - **5, the distribution.** The heaviest hider has **1,315** hides. Hides per hider, sorted: 1,315, 1,073, 15, 15, 12, 3, 2, 2, 1, 1, 1, which is 2,440 in all.
  - **6, the migration's backfill and fold, plain `EXPLAIN` only** (never ANALYZE). Both statements name `post_id`, which does not exist on production yet, so Postgres refused to plan either ("column … does not exist"). Their reads were explained instead, as `SELECT`s doing the same work:
    - **Backfill:** a sequential scan of `hidden_trade_post` (estimated 2,431 rows; the actual count is 2,440), with two subplans per row: `trade_post_lead_list_id_idx` and `trade_post_want_list_id_idx`, each an index scan of 1 estimated row under an aggregate.
    - **Fold:** the backfilled rows as a CTE (the scan above), then a merge join of the CTE with itself on `(user_id, post_id)`, each side sorted, filtered on `(created_at, list_id)`. The estimate is 4,763 rows, the planner's guess for a self-join on a computed key; read 1 counted 0 shared `(user, row)` pairs, so it should delete none.
  - Read 1's orphan count (1, not 2) is above, with the owner's acceptance. The output files that held user ids and the `1568f6b1` copy were deleted; the scripts stay in `/private/tmp/claude-501/hides-by-row/` for 8.4.
- **8.2.** The owner pushed `1568f6b1..1a062e41` (a fast-forward), and Docker CI/CD run 44728509142 succeeded.
- **8.3.** The owner ran `docker compose run --build --rm migrate` while web B (`1568f6b1`) served, then brought up web and rebuilt and restarted the worker from `1a062e41`. The migration was applied at 11:37:55 UTC (from the migration record). At 11:39 UTC the coordinator ran the working tree's drift script read-only on production: 1,564 rows, **checks 1 to 7 all 0**, the 9-offer note unchanged, the hide note ("a hide that a build before `hidden_trade_post_by_row` reads differently") 0, "in step".
- **8.4, run but not passed (2026-11-20, production, read-only).** The same rules as 8.1: the root `.env` only, scripts refusing unless `transaction_read_only` is on, no Redis, each read once.
  - **The migration's result.** Every hide has a `post_id` (`count(post_id)` = count), and none points at a missing row. The primary key is `(user_id, post_id)`. `hidden_trade_post_post_id_idx` exists beside the kept `list_id` index. The foreign key is `FOREIGN KEY (post_id) REFERENCES trade_post(id) ON DELETE CASCADE`, `list_id` is nullable, and the trigger is `hidden_trade_post_fill_post_id` (`BEFORE INSERT … WHEN (new.post_id IS NULL)`). All as built.
  - **The hide count: 2,434, where 2,439 was expected** (8.1's 2,440, less the 1 orphan, with no fold). It is 5 fewer.
    - Hides per hider, sorted: 1,311, 1,071, 15, 15, 12, 3, 2, 2, 1, 1, 1. Against 8.1, the two heaviest hiders have 4 and 2 fewer; the rest are unchanged.
    - The newest hide was made at 10:47:53 UTC, before the rollout, and 21 hides date from after 10:00 UTC.
    - Not explained here; the owner decides.
  - **The For you hide filter for the heaviest hider (now 1,311 hides), on the new helpers:** `EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF)` of `fetchBumpPeople`'s read for that viewer. **Planning 5.4 ms, execution 20.6 ms**, against the gate of 29 ms (1.5 × 8.1's 19.3 ms): it passes.
    - The covered set is two hash joins of the viewer's 1,311 hides to `trade_post` by its id, one for the lead and one for the want list.
    - The filter is a hash right anti join of the posts against it, leaving 27 people.
  - **The `pairs.ts` lookup** (`hiddenPostAtSql` over `lists pl`, for the same viewer, 3,805 lists): one probe per list.
    - Each probe is a bitmap OR of `trade_post_lead_list_id_idx` and `trade_post_want_list_id_idx`, then `hidden_trade_post_pkey` on `(user_id, post_id)` per row found.
    - About 0.005 ms a probe, within the 1 ms bound. The whole query took 55.9 ms (planning 0.9 ms).
  - **The hidden set, read from the migrated table (`staged.ts --live`):** 11 hiders, **2,318 posts hidden and 3,566 lists covered, where 8.1's 2,323 and 3,574 were expected**: 5 posts and 8 lists fewer, in step with the 5 fewer hides.
  - **Verdict: normal** (a read-only investigation on production, by an Opus agent, 2026-11-20):
    - **All 5 hides went before the migration, on the old schema.** `hidden_trade_post` shows `n_tup_upd` = 2,435, and only the backfill ever updates a hide, so the table held 2,435 when the migration ran at 11:37:55 UTC. 2,435 less the 1 orphan is 2,434, the 8.4 count: no fold, and nothing lost after.
    - **Likely cause: the want-alerts worker's unhides.** It ran every 5 minutes, and owners added entries matching the two hiders' lists before the 11:21, 11:26 and 11:31 runs. Not provable per hide: both hiders have alerts off, and an unhide writes no notification.
    - **A sixth hide**, of row 1001789, went at the 11:41 run through the new code: a normal want-alert unhide.
    - **No bug:** no `trade_post` row was deleted after the migration, so no move was owed; drift's hide note reads 0; no hide names a deleted list.
    - **No migration-window gap** (decision 8): web B wrote no rows after the migration.
    - **Corrected times:** 8.1's per-hider read ran after 11:19:34 UTC, the migration at 11:37:55, and 8.4's reads from about 11:39:34 to 11:41:07.
  - 8.4 is ticked on that verdict. The scripts in `/private/tmp/claude-501/hides-by-row/` were deleted.

## Context

See proposal.md for why. Today's post rules are in `packages/api/docs/trade.md` (Trade posts). These facts shape this slice:

- **A post is found, not stored.** `postsCte` (`services/trade/feed/query.ts`) folds a want list into the have or sale list that links to it when both are on Trade. A pair's link (`lists.linked_list_id`, written to both rows) and each list's Trade state (`discoverable`) are separate facts. Posting one half of a pair keeps the link (`planPost`, `keepsPair`), and so does Take off Trade, so links with one half on Trade are made today. There are 10 on production, and 5 locally (4 with the want half on Trade, 1 with the offering half).
- **Writers serialise on `lockTradeLists`** (`services/list/shared.ts`), which locks the person's have, want and sale rows `FOR UPDATE` in id order.
- **`writeList` takes that lock only when it links** (`services/list/create.ts:157`), yet it inserts `discoverable` (`create.ts:191`). `createListInputSchema` accepts `discoverable` (`schemas/list.ts:189`), and `list.copy` goes through `writeList` (`services/list/copy.ts:122`). The web never sends the flag, but `/rpc` accepts it, so a list can go on Trade at create without the lock.
- **Deploys.** `apps/migrate` applies all pending migrations, sorted by folder name, in one transaction (drizzle-orm 1.0.0-rc.5, `pg-core/async/session.js` `migrate`), and then web and worker restart. The old build serves for a while after the migration.
- **Local snapshot.** 89 links (all valid), 219 have or sale lists with `discoverable` on and no link (1 of them not bound to a profile), and 102 want lists with `discoverable` on and no have or sale list linking to them. Every guard count below is zero. The largest list id is 13,175.

## Goals / Non-Goals

**Goals:**

- `trade_post` holds one row per post and stays in step with `lists` after every write.
- No reader, user, open tab or `/api/v1` caller sees any difference.
- A read-only check proves the rows match the links at any time.

**Non-Goals:**

- Reading the table.
- Touching `hidden_trade_post`, `offer` or any column of `lists`.

## Decisions

### 1. Scope: the write-only slice

This change adds the table, fills it, and keeps it in step. `trade-post-reads` moves the reads, adds `post_id` to hides and offers, and reconciles.

The cut sits here because a `post_id` on hides would be write-only while reads stay on `list_id`, and its CASCADE would delete hide rows that today's reads still use. Nothing in this change deletes, moves or alters a `hidden_trade_post` or `offer` row.

Rejected: the earlier plan that also switched reads, in a second deploy of the same change. Its hide semantics need decisions of their own (see Inputs for `trade-post-reads`).

### 2. Table shape

```sql
CREATE TABLE trade_post (
  id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (START WITH 1000000),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  lead_list_id integer NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  want_list_id integer REFERENCES lists(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trade_post_want_not_lead CHECK (want_list_id <> lead_list_id)
);
CREATE INDEX trade_post_user_id_idx ON trade_post (user_id);
CREATE INDEX trade_post_lead_list_id_idx ON trade_post (lead_list_id);
CREATE INDEX trade_post_want_list_id_idx ON trade_post (want_list_id) WHERE want_list_id IS NOT NULL;
```

What each column does:

- **`lead_list_id`** is the have or sale list, or a Buy post's want list.
- **`want_list_id`** is set only on a row whose lead is a have or sale list.
- **`user_id`** must equal both lists' owner. The planner keeps it so and the drift script checks it. `trade_post_user_id_idx` serves the planner's per-person read.

`lead_list_id` is `NOT NULL` because every post has a lead, and the schema then states that rule. Its CASCADE and `want_list_id`'s SET NULL are the right fallback if a delete ever skips the planner: the post goes with its lead, and a pair keeps its have or sale list when its want list goes. They are not what the writers rely on. `list.delete` and account deletion delete or update rows explicitly before deleting lists (decision 4).

Rejected: two nullable list columns with a check that one is set. It works only while every writer deletes rows first, and nothing in the schema would say which list leads.

**No unique index** on either list column. The owner wants room for one list in two posts. "A list is in at most one row" is kept by the planner under the lock and checked by the drift script.

**Ids start at 1,000,000**, far above any list id, so the later read change can never mistake a list id for a post id, not even on migrated rows. This is the repo's first identity column. `GENERATED ALWAYS` refuses a hand-written id.

**What stays on `lists`** in this change and in `trade-post-reads`:

- `discoverable`: it is per list, since a pair can have one half on Trade, and Market, privacy, the On Trade badge and `hidePartner` read it per list.
- `bumped_at`: bump stays per person, and `personBumpedAt` spans off-Trade lists.
- Open to (`match_sale`, `match_have`) and `takes_swaps`: they are edited off Trade (`show-open-to-off-trade`), and `pairRefusal` reads them.

`linked_list_id` becomes a mirror of the row once `trade-post-reads` moves the reads, and is dropped in the contract.

### 3. The row rule

One rule, stated once here. The planner and the backfill both implement it.

For one person's have, sale and want lists:

1. A have or sale list leads exactly one row if it is linked to a want list, is `discoverable`, or already leads a row. The row's `want_list_id` is its linked want list, else null.
2. A want list that no have or sale list links to leads exactly one row if it is `discoverable` or already leads a row. The row has no want list.
3. Every other row of the person is deleted:
   - a row whose lead is gone;
   - a row led by a want list that a have or sale list now links to;
   - a second row led by the same list.

Where a lead already leads a row, that row keeps its id (the lowest, if there are several).

Consequences:

- **The link is the membership, whatever the Trade state.** An off-Trade pair is a row. A lone want list linked to a have list that is off Trade loses its own row and joins the have list's. That is decided on its merits here, since no hide is attached to rows yet. `trade-post-reads` must decide what happens to hides then (its input 2).
- **Take off Trade keeps the row**, through "already leads a row". Posting it again brings back the same row.
- **`discoverable`, not "on Trade"**, decides. An unbound list with `discoverable` on (1 locally) gets a row, because whether a post shows (bound, idle, sanctions) is a read-time question, as it is today. `list.edit` (`services/list/edit.ts:75`) changes no link, type, binding or `discoverable`, so it never needs to write rows.
- **The backfill** starts from an empty table, so "already leads a row" is false for everyone. It gives rows to every link and every `discoverable` list, and the planner keeps those rows from then on.

### 4. The planner and its writers

`planPostRows(rows, lists)` in `packages/api/src/lib/trade-post-rows.ts` is pure and tested:

- **Input:** the person's current rows, and the person's have, sale and want lists as they stand after the write (`id`, `listType`, `discoverable`, `partnerId`).
- **Output:** the deletes, `want_list_id` updates and inserts that turn the current rows into the rule's row set.

Because it works out the whole set, any write by a person also repairs rows the old build left stale for that person, or rows a missed writer got wrong. A branded `PostId` type marks row ids.

Every writer, re-checked by a full-text search for `linkedListId`, `linked_list_id`, `discoverable`, `tradeColumns` and `delete(lists)`:

| Writer | Where | What it does with rows |
| --- | --- | --- |
| `trade.savePost` | `services/trade/post.ts:26`, list writes at 43–83 | Plans after its list writes |
| `trade.takeDownPost` | `services/trade/post.ts:93`, write at 100 | Plans after it; rows normally stay, so this only repairs |
| `writeList`, through `list.create` and `list.copy` | `services/list/create.ts:152` (insert at 175, link writes at 202–214); `routers/list-crud.ts:55` and `:83` → `services/list/copy.ts:122` | Takes `lockTradeLists` for every have, want and sale list, not only one that links, then plans after the insert and partner writes |
| `deleteList` | `services/list/edit.ts:98`, delete at 108 | Plans with the list removed and its partner unlinked, writes rows, then deletes the list |
| `anonymizeUser` | `services/account/anonymize.ts:93`, delete at 94 | Plans with no lists (deletes every row), then deletes the lists |

Checked and not writers:

- `list.edit` (`services/list/edit.ts:75`), see decision 3;
- `bumpPerson` (`services/trade/feed/mine.ts:93`), which writes only `bumped_at`;
- `touchListWith` (`packages/lib/src/server/list-touch.ts:35`), which writes only `updated_at`;
- `list.dropReceived` (`services/list/received.ts:64`);
- the copy's ratio write (`services/list/copy.ts:125`).

**How a writer feeds the planner.** `lockTradeLists` also returns, per list, the rows that list leads, in the same locked statement (`FOR UPDATE OF lists`, a subquery on `trade_post`). The rows need no lock of their own, since every writer takes the list lock first. A writer builds the after-state in memory from those locked lists and its own writes, and applies the planner's operations in the same transaction: deletes, then updates, then inserts. It does not re-read `lists`. That way the contract change only changes where `partnerId` comes from.

Rejected:

- **A planner that diffs only the lists a write touched.** It would leave stale rows from the deploy window in place until the reconcile.
- **A database trigger on `lists`.** It would state the rule a second time, in plpgsql, and the repo has no triggers.

### 5. Migration

There are two files. Neither edits a past migration.

1. **`<ts>_trade_post`**, from `bun run --filter=@repo/db db:generate`: the DDL in decision 2.
2. **`<ts>_trade_post_backfill`**, from `bunx drizzle-kit generate --custom` in `packages/db`.

They run in one transaction, expand first. Each file begins `SET LOCAL lock_timeout = '5s'`. A custom file separates statements with `--> statement-breakpoint`.

**Guard.** A `DO` block raises an exception, naming the count, if any of these is non-zero. All of them were zero on production on 2026-11-14 and are zero locally. A failure rolls back the expand too:

- a link to another owner's list, or to a list of the same side;
- a link that isn't mutual;
- a link from a `general` list;
- a linked sale list without `takes_swaps`;
- a want list named by two links.

**Rows** (rules 1 and 2 on an empty table):

```sql
INSERT INTO trade_post (user_id, lead_list_id, want_list_id)
SELECT o.user_id, o.id, w.id
FROM lists o LEFT JOIN lists w ON w.id = o.linked_list_id AND w.list_type = 'want'
WHERE o.list_type IN ('have', 'sale') AND (o.linked_list_id IS NOT NULL OR o.discoverable);
--> statement-breakpoint
INSERT INTO trade_post (user_id, lead_list_id)
SELECT w.user_id, w.id FROM lists w
WHERE w.list_type = 'want' AND w.discoverable
  AND NOT EXISTS (SELECT 1 FROM lists o WHERE o.linked_list_id = w.id AND o.list_type IN ('have', 'sale'));
```

Expected locally: 89 + 219 + 102 = 410 rows. Production is about 2,000 rows (Assumption, from the brief's counts; task 1.2 reads the real numbers). Creating the table and inserting into it locks only the new table. The guard's reads take no locks that block writers.

**Deploy and window.** The owner approves and runs the production migrate, then deploys. Until then the old build writes only `lists`, and rows go stale for the people who post in that window. Each person's next write repairs their own rows (decision 4), and the reconcile in `trade-post-reads` repairs the rest. Nothing reads the rows meanwhile, so no one sees it.

**Rollback.** Redeploy the previous image. Nothing reads the table, so it can stay and go stale. To remove it entirely, write a new migration that drops `trade_post`, which needs the owner's approval. This change has no point of no return.

### 6. Where pairing is stated

After this change, the pairing is stored in one place, the row. It is still stated in several places, and none of them changes here:

| Statement | Where | Changed by |
| --- | --- | --- |
| `leadsPairSql` | `services/trade/lists.ts:39` | `trade-post-reads`: replaced by `postOfListSql` and `postPartnerSql` over the row |
| `postsCte`'s anchor rule | `services/trade/feed/query.ts:16` | `trade-post-reads`: rebuilt from `trade_post` with the same output columns |
| `partner_post`'s both-halves join | `services/trade/matches/candidates.ts:102` | `trade-post-reads`: reads the partner from the row |
| `swapPair` | `apps/worker/src/job/want-alerts/context.ts:28` | `trade-post-reads`: reads the partner from the row and keeps its Can swap test |
| `fetchHiddenPosts.partnerName` | `services/trade/hidden.ts:110` | `trade-post-reads`: names from the row |
| `groupPosts` | `schemas/trade-post.ts:146`, used by `lib/trade-feed.ts:75`, `lib/report-post.ts:47` and the web's `features/list/list-post-tags.ts` | `trade-post-reads`: its `linkedListId` input is filled from the row |
| `partnerOf` | `schemas/trade-post.ts:187`, used by `planPost`, `rowBlock`, `startForList`, `tradeLineOf`, `composer-choice.ts:64` and `composer/settings.tsx:310` | `trade-post-reads`: the same input change |
| `planPostRows` | new | Post addresses: updates a row instead of deleting and re-creating it |

### 7. Proof

The local database has no hides and few sale pairs, so the main proof is pure:

- **Model test** (`lib/trade-post-rows.model.test.ts`). It runs seeded random sequences of transitions over a few lists of one or two people:
  - post, Take off Trade, link, unlink, swap the want list;
  - delete either half, create on Trade, copy;
  - account deletion.

  Each transition follows the write rules (`pairRefusal`: a linked sale list takes swaps). After every step, the test checks that the posts `groupPosts` derives from the links and `discoverable` (the legacy rule) equal the posts the planner's rows give (each row's lists that are on Trade). It also checks that no list is in two rows and that every row's lists belong to its owner. A fixed seed keeps it repeatable.
- **Healing test.** Each step instead starts from rows corrupted at random (missing, wrong want list, extra rows), and one planner call must restore the invariants and the equal posts.
- **Unit table** for `planPostRows`: one case per transition, including a Buy post's lead deleted and an off-Trade unlinked list keeping its row.
- **Drift script** `apps/worker/src/script/trade-post-drift.ts`. It is read-only and refuses to start without `default_transaction_read_only`, as `fix-transferability.ts` does. It prints a count and up to 10 ids for each of:
  1. a have or sale list linked to a want list with no row for that pair;
  2. a row whose `want_list_id` differs from its lead's link;
  3. a `discoverable` list in no row;
  4. a list in two rows;
  5. a row whose owner differs from its lists', whose want list isn't a want list, or whose want-list lead has a `want_list_id`;
  6. a row led by a want list that a have or sale list links to.

  It runs locally after each writer is wired, and read-only against production before and after the deploy.

### 8. Room for later phases

- **Per-post offer rules, pause, a note:** each becomes a column on the row. `trade-post-reads` supplies the row a read or an offer resolves to.
- **Shared lists:** there are no unique indexes. The planner's "at most one row per list", `partnerOf` and the derived single partner are what that change revisits.

## Inputs for `trade-post-reads`

These are findings from the review, each with the fix it proposed, kept so that the next change starts from them.

1. **Hides through an unlink or a lead delete.** A hide on the want half of a half-shown pair is lost, or moves to another post, when the pair is unlinked or its offering list deleted. *Fix:* before an unlink or a lead delete, hides follow the list they were made on.
2. **Linking a Buy post to an off-Trade list** would drop its hides by rule 3 (absorption), with nothing visible changing. *Fix:* decide whether absorption waits until the offering list is on Trade, or carries the hides.
3. **`hidePost` over a stale hide.** With `ON CONFLICT (user_id, list_id) DO NOTHING`, it silently does nothing when a stale hide holds the key. *Fix:* `DO UPDATE` sets `post_id` and `created_at`.
4. **At least three visible hide changes, each needing a spec delta:**
   - a lone want post's hide ends when it is paired;
   - a hide made on a half-shown pair covers the whole post once the other half joins;
   - stale hides on a paired want list stop keeping it out of the hider's matches, Can swap and want alerts, and out of what `/account/hidden` lists.
5. **The reconcile** re-derives every hide's `post_id` from `list_id`, not only the null ones. It also adds rows for offering lists that a hide or an offer names, which this backfill skips.
6. **Drift items to add:**
   - the legacy `posts` CTE against the new one, both ways;
   - `partner_post` keys;
   - the hide predicates.

   Reads to cover: `swapPair`, `postWantedAmong`, `partnerListChoices`, hidden-post names, `inPostsOf` and `staffPosts`, `counts.ts`, `read.ts`'s `linkedList`, and `/api/v1` output.
7. **The hide lookup index** is `(user_id, post_id)`.
8. **Addresses stay the anchor list.** This was the earlier plan's decision 3:
   - feed `post.id`, `theirPostId`, slugs and inputs keep naming the anchor list;
   - `post-block.tsx:377` passes `post.id` as the report's `listId`;
   - the `posts` CTE keeps its output columns for `trade-active-hours`;
   - no cache version changes.
9. **Post addresses**, the stable-id step after it, changes these:
   - the planner updates a row instead of deleting and re-creating it;
   - a row may outlive its lead, so `lead_list_id` drops `NOT NULL` and becomes SET NULL;
   - the step that turns an anchor into a row goes;
   - inputs and `/api/v1` ids change, and so do the cache versions behind `theirPostId`.

   No data has to be redone.

## Risks / Trade-offs

- **[A writer missed now or added later]** → Mitigation: the planner repairs that person's rows on their next write, the drift script reports what remains, and `trade-post-reads` reconciles before any read depends on the rows.
- **[`writeList` now locks for every have, want and sale create]** → Mitigation: it is one locked read of the person's trade lists, which `savePost` already takes. Creating a general list still takes no lock.
- **[The planner reads all of a person's rows on every write]** → Mitigation: one person holds at most a few dozen rows (29 posts at most on production).

## Migration Plan

1. Locally: generate both migrations, apply them to the local database, and run the drift script.
2. With the owner's go-ahead, read-only against production: the guard counts, the row counts per rule, and `max(lists.id)`.
3. The owner approves and runs `docker compose run --build --rm migrate`, then deploys web and worker.
4. With the owner's go-ahead, run the drift script read-only against production. Expected: only the window's drift, which shrinks as people write.

## Assumptions and unverified facts

- **Read on production, read-only, 2026-11-14:** `max(lists.id)` is 17,395. Every guard count is zero. The backfill would write 1,312 rows: 649 pairs, 464 lone have or sale lists, 199 lone want lists.
- **Checked:** drizzle-kit 1.0.0-rc.5 renders the identity with `START WITH 1000000`.

## As built

Three departures from the decisions above, each smaller than what it replaces:

- **`syncPostRows` re-reads instead of building the after-state in memory** (decision 4). After its list writes, a writer calls `syncPostRows(tx, userId)` (`services/list/shared.ts`), which reads the person's lists joined to their rows in one statement and applies `planPostRows`. A writer therefore cannot mirror its own writes wrongly, `lockTradeLists` keeps its shape, and the cost is one read per post write. The contract change swaps that read's `linked_list_id` for the row.
- **`deleteList` syncs after the delete, not before.** The foreign keys remove the deleted lead's row and clear a deleted want list from its row; the sync then gives a partner left alone its own row.
- **`anonymizeUser` is unchanged.** Deleting every list deletes every row through `lead_list_id`'s CASCADE, so there is nothing to plan.
- **The drift script has no pure part**, so nothing was added under `apps/worker/src/lib/`: it is six `SELECT`s.

## Open Questions

None for this slice. The hide questions belong to `trade-post-reads` (Inputs 1 to 4).

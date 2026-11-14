## Context

See proposal.md for why. Today's post rules are in `packages/api/docs/trade.md` (Trade posts), and phase 1 is `openspec/changes/archive/2026-11-15-trade-post-table/`. These facts shape this slice:

- **The row and the link say the same thing on production.** `trade_post` has 1,322 rows, and all six drift checks read zero (read-only, 2026-11-15). The backfill guard left zero non-mutual links. Every writer still writes `lists.linked_list_id` on both rows and then calls `syncPostRows`, which derives the person's rows from the link under `lockTradeLists`.
- **The row pairs more lists than a post does.** A link is a row whatever its lists' Trade state, and an unbound `discoverable` have list has a row but no post. `leadsPairSql` also requires:
  - the offering list to offer swaps (`offersSwapsSql`);
  - the same owner;
  - a want list as the partner.

  `postsCte` additionally requires both halves to be on Trade and matchable. So "is in a row together" replaces only the `linked_list_id` comparison, never those conditions.
- **No unique index on either list column of `trade_post`.** "A list is in at most one row" is held by `planPostRows` under the lock and checked by drift check 4. The link, a single column, can never give two answers; the row can, if that invariant breaks.
- **Hides read the pairing in two ways today, and they disagree** (see the inventory's Surprises 1):
  - The feed compares `hp.list_id` with the anchor, `posts.id`.
  - Matching, Can swap and alerts use `hidesOfSql`. It matches the hide's own list, or a lead through `leadsPairSql`, and ignores Trade state.

  This change keeps both exactly as they are.
- **The worker imports `postsCte`, `listedCte` and `hidesOfSql`** from `@repo/api`, and builds its image on the VPS, apart from the web's CI image.
- **`openspec/changes/trade-active-hours/`** (open) adds an `owners` predicate to `feedWhere`. It reads `posts.user_id`, `posts.bumped_at` and the `FeedRow` shape, and nothing about the pairing.
- **Local database, read-only, 2026-11-15:**
  - 410 rows, 437 lists on Trade;
  - the legacy and new `posts` (decision 2) both give 381 posts, 56 of them paired, with zero rows in either direction of `EXCEPT ALL`;
  - the legacy and new pair predicates both give 89 pairs, the same 89;
  - `postPartnerSql` equals `linked_list_id` for every list;
  - there are no hides locally.

## Goals / Non-Goals

**Goals:**

- Every read of the pairing outside a write path reads `trade_post`.
- Every moved statement returns what it returns today, for every state the row rule allows.
- Old and new statements are compared on production data, read-only, before the deploy.

**Non-Goals:**

- Reads inside a write path (decision 5), hides and offers keyed by post, and the hide mismatches.
- A faster feed. The goal is the same plan shape, not a better one.

## Decisions

### 1. Two helpers, in `services/trade/lists.ts`

The pairing is stated once over the row, in the module where `leadsPairSql` lives today. The worker already imports from that module, and its import chain is clear of `env.ts`.

**`postPairsSql(post, lead, want)`** replaces `leadsPairSql(offer, want)`. It reads: "the `trade_post` row `post` pairs `lead` with the want list `want` as one post". The caller joins `trade_post` under the alias `post` itself.

```ts
export const postPairsSql = (post: string, lead: string, want: string) =>
  sql`(${column(post, "lead_list_id")} = ${column(lead, "id")}
    AND ${column(post, "want_list_id")} = ${column(want, "id")}
    AND ${column(want, "list_type")} = 'want'
    AND ${column(lead, "user_id")} = ${column(want, "user_id")}
    AND ${offersSwapsSql(lead)})`;
```

It keeps every condition of `leadsPairSql`; only `offer.linked_list_id = want.id` becomes the two equalities through the row. Its callers are `postsCte` (decision 2), `partner_post` and `hidesOfSql`. `leadsPairSql` is deleted, so the typechecker finds any caller left behind.

**`postPartnerSql(alias)`** gives the other list of the row that list `alias` is in, or null. It is the row's twin of the `linked_list_id` value, with no other conditions, since the callers apply their own today.

```ts
export const postPartnerSql = (alias: string) =>
  sql<number | null>`coalesce(
    (SELECT partner_row.want_list_id FROM trade_post partner_row
      WHERE partner_row.lead_list_id = ${column(alias, "id")} ORDER BY partner_row.id LIMIT 1),
    (SELECT partner_row.lead_list_id FROM trade_post partner_row
      WHERE partner_row.want_list_id = ${column(alias, "id")} ORDER BY partner_row.id LIMIT 1)
  )`;
```

The two branches work like this:

- For a lead, the first branch gives its want list. That is null for a Buy post or a lone list, and the second branch then finds nothing, by drift check 6.
- For a want list, the second branch gives its lead.
- `ORDER BY id LIMIT 1` matches the planner's lowest-id rule. It turns a broken "one row per list" into a stable answer instead of a "more than one row returned" error on Browse, a list page or `/api/v1`.
- Each branch is one probe of `trade_post_lead_list_id_idx` or the partial `trade_post_want_list_id_idx`.

The helper takes a raw alias, as `column` does, because drizzle leaves a single-table select's columns unqualified. Every caller names `lists` or an `alias()` name. The inner alias is `partner_row` so that it cannot capture a caller's `tp`, `pp` or `lists`.

Rejected:

- **Keeping `leadsPairSql(offer, want)` with an `EXISTS (… trade_post …)` inside.** Callers would not change, but the pairing would become a correlated subquery inside `LEFT JOIN on_trade p ON …`. Postgres cannot hash-join on it, so `postsCte` and `partner_post` risk a nested loop of `on_trade` × `on_trade`. Today's `a.linked_list_id = p.id` hash-joins (local `EXPLAIN`, decision 2).
- **A "row of a list" helper (`postOfListSql`, named in phase 1's decision 6).** No read here needs the row itself, because hides and offers stay keyed by list. It belongs to `trade-post-keys`.

### 2. The rebuilt `posts` CTE, driven from `on_trade`

```sql
on_trade AS (
  SELECT id, user_id, list_type, match_sale, match_have, takes_swaps, bumped_at,
    updated_at, created_at
  FROM lists
  WHERE discoverable AND ${matchableListSql()}
),
posts AS (
  SELECT
    a.id,
    a.user_id,
    a.list_type AS type,
    a.match_sale,
    a.match_have,
    a.takes_swaps,
    p.id AS partner_id,
    p.match_sale AS partner_match_sale,
    p.match_have AS partner_match_have,
    date_trunc(
      'milliseconds',
      coalesce(greatest(a.bumped_at, p.bumped_at), greatest(a.updated_at, p.updated_at))
    ) AS bumped_at,
    greatest(a.updated_at, p.updated_at) AS updated_at
  FROM on_trade a
  LEFT JOIN trade_post tp ON tp.lead_list_id = a.id
  LEFT JOIN on_trade p ON ${postPairsSql("tp", "a", "p")}
  WHERE NOT EXISTS (
    SELECT 1 FROM trade_post th JOIN on_trade h ON h.id = th.lead_list_id
    WHERE ${postPairsSql("th", "h", "a")}
  )
)
```

The two statements against each other:

- **Output columns:** `posts` is unchanged, and so is its comment about milliseconds.
- **`on_trade`:** drops `linked_list_id`. Its only reader was `leadsPairSql` (`matchesIndex` reads `t.list_type` and `t.takes_swaps`, `counts.ts` reads `t.list_type`, and `trade-active-hours` reads neither). Dropping it means no consumer can keep reading the link through the CTE without noticing.
- **Plan shape:** run locally, read-only, the new statement plans as hash joins only, as the legacy one does:
  - a Hash Right Join of `trade_post` on `lead_list_id`;
  - a Hash Anti Join on `th.want_list_id = a.id`;
  - a Hash Left Join on `tp.want_list_id = p.id`.

  The legacy statement took 2.6 ms and the new one 1.6 ms, at 437 lists. A `LATERAL (… ORDER BY id LIMIT 1)` variant planned as nested loops with 60,000 rows removed by join filters, which is why the join is plain.

**Each state the row rule allows, old against new.** O is a have list, or a sale list that takes swaps. W is a want list. "On" means on Trade and matchable (in `on_trade`).

| State | Today | New |
| --- | --- | --- |
| Pair (O, W), both on | `a = O`, and `p = W` by the link. W is dropped because `h = O` leads it | `tp = (O, W)` and `p = W`. W is dropped because `th = (O, W)` and `h = O` is on. One post, O, partner W |
| Lead on, want off | `a = O`, `p` null (W is not in `on_trade`). W is no anchor | `tp = (O, W)`, but W is not in `on_trade`, so `p` is null. One post, O, no partner |
| Want on, lead off or unbound | `a = W`. No on-Trade list leads W, so W is the anchor. `p` is null, since W does not offer swaps | No row is led by W (check 6), so `tp` is null and `p` is null. `th = (O, W)`, but O is not in `on_trade`, so the anti-join keeps W. One post, W, alone |
| Buy post W | `a = W`, alone | `tp = (W, null)`. `want_list_id = p.id` is never true, so `p` is null. No row names W as its want. One post, W, alone |
| Unbound `discoverable` have list U, a row with or without a want | U is not matchable, so it is not in `on_trade`. No post (its want list, if on, is the row above) | The same, since `on_trade` is unchanged |
| Lone have or sale list on Trade, row `(O, null)` | `a = O`, alone | `p` is null. The same |
| Sale list without `takes_swaps` linked to W, both on (0 on production; `pairRefusal`) | Two posts: `offersSwapsSql(a)` is false, and nothing leads W | The same two: `postPairsSql` keeps `offersSwapsSql` on both joins |
| Both halves off Trade | No post | No post |

A list on Trade with no row cannot happen while drift check 3 reads zero. If it did, it would still show, alone, because the CTE is driven from `on_trade`.

Rejected:

- **Driving `posts` from `trade_post`.** It needs a `UNION` for the sale-list-without-swaps case and for a want list on Trade whose lead is not, which are two anchors from one row. It would also silently drop an on-Trade list that a missed writer left without a row, and it widens the diff for `trade-active-hours`.
- **Deduplicating the join** (`LEFT JOIN (SELECT DISTINCT ON (lead_list_id) …)`). It would restate the planner's one-row rule and hide a violation that checks 4, 8 and 9 surface. With the invariant broken, the plain join shows a post twice, which is visible but not an error. The scalar helper still guards against an error (decision 1).

### 3. Each moved read

Inventory section 1a, items 1 to 14. Paths are under `packages/api/src/` unless they start with `apps/`.

| # | Path | Function | New source |
| --- | --- | --- | --- |
| 1 | `services/trade/lists.ts:39` | `leadsPairSql` | Deleted, and replaced by `postPairsSql` (decision 1) |
| 2 | `services/trade/feed/query.ts:16` | `postsCte` | Decision 2 |
| 3 | `services/trade/matches/candidates.ts:88-107` | `fetchTradeCandidates`: `partner_lists` and `partner_post` | `partner_lists` drops `l.linked_list_id`, which nothing else in the statement reads. `partner_post` becomes `FROM partner_lists o JOIN trade_post tp ON tp.lead_list_id = o.id JOIN partner_lists w ON ${postPairsSql("tp", "o", "w")} CROSS JOIN LATERAL (VALUES (o.id), (w.id)) AS half(id)`. `post_key` stays `o.id` |
| 4 | `services/trade/lists.ts:46` | `hidesOfSql` (behind `inHiddenPostSql`, `hiddenPostAtSql` and the worker's `unhidePosts`) | The first branch, `hp.list_id = alias.id`, stays. The lead branch becomes `hp.list_id IN (SELECT hide_lead.id FROM trade_post hide_row JOIN lists hide_lead ON hide_lead.id = hide_row.lead_list_id WHERE ${postPairsSql("hide_row", "hide_lead", alias)})`. Like today, it ignores Trade state |
| 5 | `services/trade/hidden.ts:114-118` | `fetchHiddenPosts.partnerName` | `${partner}.id = ${postPartnerSql("lists")}` in place of `lists.linkedListId`. The owner, `<> 'want'` and `= 'want'` conditions stay |
| 6 | `apps/worker/src/job/want-alerts/context.ts:28-35` | `loadContext` → `swapPair` | `p.id = ${postPartnerSql("lists")}`. The owner, matchable and Can swap tests stay |
| 7 | `services/trade/feed/post-cards.ts:20-30` | `inPostsOf`, used by `fetchPostCards` and `staffPosts` | `or(inArray(lists.id, listIds), inArray(lists.id, db.select({ id: postPartnerSql("named") }).from(named).where(inArray(named.id, listIds))))`, with `named = alias(lists, "named")` |
| 8 | `services/trade/feed/entries.ts:23` | `feedListColumns.linkedListId` | `postPartnerSql("lists")`. That one field covers `loadPosts`, `findTradeList`, `listedTradeLists`, `fetchMyPosts`, `fetchPostCards` and `staffPosts`. Every one of them selects from bare `lists` |
| 9 | `services/trade/matches/recount.ts:43` | `resolveTradeSides` → `matchSides`, `viewerPostOf` | `linkedListId: postPartnerSql("lists")` |
| 10 | `services/offer/picker/shared.ts:168-178` | `postWantedAmong` | `select({ want: postPartnerSql("lists") })`, still by the anchor list id `onPost`. The `want`, `discoverable` and entry tests stay |
| 11 | `services/offer/picker/theirs.ts:202-228` | `partnerListChoices` | `eq(wantHalf.id, postPartnerSql("lists"))` in the `want_half` join |
| 12 | `services/offer/picker/index.ts:361-383` | `postListsOf` | `db.select({ id: postPartnerSql("named") }).from(named).where(eq(named.slug, slug))` |
| 13 | `services/moderation/report.ts:68-98` | `reportedPost` → `postSnapshot` | `snapshotColumns.linkedListId: postPartnerSql("lists")`. The partner read and the stored snapshot shape stay |
| 14 | `services/list/read.ts:46-208`; `packages/db/src/relation.ts:33-36` | `readList`, `readListForViewer`, `fetchOwnedLists` | Decision 4 |

**Pure modules keep `linkedListId`, filled from the row.** These keep their input field and its name:

- `groupPosts` and `partnerOf` (`schemas/trade-post.ts`);
- `pairPosts` (`lib/trade-feed.ts`);
- `pickedSides` (`schemas/list.ts`);
- `viewerPostOf` and `matchSides` (`lib/trade-rank.ts`);
- `postSnapshot` (`lib/report-post.ts`).

Renaming the field belongs to the contract phase, when the column goes. The server call sites that fill the field from the row:

- `feedListColumns` (item 8), for `pairPosts` and `groupPosts`;
- `resolveTradeSides` (item 9), for `pickedSides` and `viewerPostOf`;
- `snapshotColumns` (item 13), for `postSnapshot` and `groupPosts`;
- `PublicList.linkedList` (item 14), which the web turns into `linkedListId` for `groupPosts`, `pickedSides` and `partnerOf` (`list-post-tags.ts`, `compare-rule.ts`, `plan-list.ts`).

These still fill it from the link, because they sit in write paths (decision 5):

- `lockTradeLists` (`PlanList` for `planPost`, `postsOf`, `partnerOf`);
- `syncPostRows` (`planPostRows`);
- `findOwnedList` (`openToEdit`, and the raw column for `list.find`).

No pure module changes, so no pure test changes. No web `.ts` module changes.

Rejected: a new field, such as `partnerId`, beside `linkedListId`. It would touch every pure module and test, and the web's `plan-list.ts`, for a rename the contract phase does anyway.

### 4. `PublicList.linkedList` through the existing `tradePost` relations

In `packages/db/src/relation.ts`, two `one` relations are added to `lists`. They are the reverse of the declared `tradePost.leadList` and `tradePost.wantList`, and share their aliases:

```ts
postLed: r.one.tradePost({
  from: r.lists.id,
  to: r.tradePost.leadListId,
  alias: "trade_post_lead",
}),
postWanted: r.one.tradePost({
  from: r.lists.id,
  to: r.tradePost.wantListId,
  alias: "trade_post_want",
}),
```

`lists.linkedList` is removed, so the typechecker lists every reader. Today those are only the two in `read.ts`.

Checked in drizzle-orm 1.0.0-rc.5:

- A relation with `from` and `to` set is accepted without looking at its alias (`relations.js:28-38`). The aliases above only name the pair for a reader.
- A `one` relation always renders `limit 1` (`pg-core/dialect.js:429`), so a non-unique target cannot return two rows.
- That one row is unordered, while `postPartnerSql` takes the lowest row id. The nested config therefore sets `orderBy: { id: "asc" }` on `postLed` and `postWanted`, so that a broken one-row invariant gives the list page and Browse the same partner. Task 5.1 confirms the rendered SQL.

In `services/list/read.ts`:

- `listWith` and `fetchOwnedLists`' `with` replace `linkedList: linkedListWith` with:

  ```ts
  postLed: { columns: { id: true }, orderBy: { id: "asc" }, with: { wantList: linkedListWith } },
  postWanted: { columns: { id: true }, orderBy: { id: "asc" }, with: { leadList: linkedListWith } },
  ```

- One function, `pairedListOf(row) = row.postLed?.wantList ?? row.postWanted?.leadList ?? null`, gives the partner:
  - A lead resolves through its row's `want_list_id`. That is null for a Buy post or a lone list, which then falls through to `postWanted`, and that finds nothing.
  - A want list resolves through the row whose `want_list_id` names it.
- `toPublicList` reads it. `fetchOwnedLists` computes it before `needsTradeHandle({ ...rest, linkedList })`, which reads `linkedList.profileAddress`.
- `fetchOwnedLists` spreads every key it does not pull out into its result (`read.ts:203-208`), and `user.currentUser` has no output schema to strip them (`routers/user.ts:81`). So its map pulls `postLed` and `postWanted` out beside `userAddress`. Otherwise every list in the `currentUser` payload would carry `trade_post` ids, and the typechecker would not flag it, since a spread gets no excess-property check.

The output keeps its shape: the same `linkedListWith` columns, and the same `toLinkedList`.

Rejected:

- **`through` relations from `lists` to `lists`** (`r.lists.id.through(r.tradePost.leadListId)` → `r.lists.id.through(r.tradePost.wantListId)`). Drizzle 1.0.0-rc.5 supports them on `one` (`relations.js`, the `One` constructor). They are flatter, but they bypass the declared `tradePost` relations. They also hide the row, which `trade-post-keys` and post addresses will want to read beside the partner.
- **A `postPartnerSql` extra plus a second read for the partner's columns.** It adds a sequential round trip (`packages/api/AGENTS.md`, Round trips).

### 5. What stays on the link, and why

These reads run inside a write transaction, under `lockTradeLists`. There, the link is what the writer has just written, and `syncPostRows` derives the rows from it at the end of the same transaction. Switching the source of truth on the write side is a step of its own (Inputs for later phases, 2).

| Item | Where | Read |
| --- | --- | --- |
| 15 | `services/list/shared.ts:54-72` | `lockTradeLists` → `PlanList` for `planPost`, `postsOf`, `postHolding` |
| 16 | `services/list/shared.ts:80-117` | `syncPostRows` → `planPostRows` |
| 17 | `services/list/edit.ts:21-24` | `openToColumns` `CASE` |
| 18 | `services/list/edit.ts:47` → `schemas/open-to.ts:51-60` | `editList` → `openToEdit`, from `findOwnedList`'s whole row |
| 19 | `services/list/edit.ts:104-107` | `deleteList`'s partner `touchList` |
| 20 | `services/list/create.ts:205-213` | `writeList`'s stale-link clear |
| 21 | `services/trade/post.ts:41-62` | `savePost`'s unlink and stale-link `WHERE` |
| 22 | `apps/worker/src/script/trade-post-drift.ts` | Checks 1, 2 and 6, which compare the rows with the link |

The raw `linkedListId` that `list.find` returns (`findOwnedList`) and the report snapshot's stored `linkedListId` also stay as they are.

**Reads that start from the want list's own link.** Examples are `swapPair` in either direction, `inPostsOf`, `postListsOf`, `reportedPost`, and `linkedList` on a want list. Under the row, the partner is read from the row whichever half you start from. The result is equal because:

- production has zero non-mutual links (the phase 1 backfill guard);
- the drift checks read zero;
- the local `postPartnerSql`-against-link comparison is zero.

Checks 1 and 2 start from the have or sale side, and check 6 from a want-led row. None of them catches a want list whose link names a list that does not link back, or a row whose want list's link names another list. New check 7 (decision 6) does: it compares `postPartnerSql` with `linked_list_id` for every list.

Rejected: moving `lockTradeLists` onto the rows now. The lock would then read the rows that `syncPostRows` is about to rewrite from the link, so one transaction would hold two sources of truth.

### 6. Proof before the deploy: equivalence checks in the drift script

`apps/worker/src/script/trade-post-drift.ts` keeps its six checks and its read-only guard. It gains checks 7 to 12. They hold the legacy SQL only inside the script, and import the new statements from `@repo/api`, so they test the real code:

- `postsCte` from `@repo/api/services/trade/feed/query`, as `job/want-alerts/pairs.ts` already does;
- `postPairsSql`, `postPartnerSql` and `hidesOfSql` from `@repo/api/services/trade/lists`;
- `db.query.lists` with the relations of decision 4.

The legacy statements are copied verbatim from the code at `54d9209a`. They use the CTE names `legacy_on_trade` and `legacy_posts`, and the aliases `legacy_hp` and `legacy_lead`, so nothing collides with `on_trade`, `posts`, `hp` or the helpers' inner aliases.

| # | Check (ids printed) | Statement |
| --- | --- | --- |
| 7 | A list whose partner by its row differs from its link (list ids) | `SELECT l.id FROM lists l WHERE ${postPartnerSql("l")} IS DISTINCT FROM l.linked_list_id` |
| 8 | A legacy post missing from, or different in, the new `posts` (anchor ids) | `WITH ${postsCte}, legacy_on_trade AS (…), legacy_posts AS (…)`, then the 11 columns of `legacy_posts EXCEPT ALL` the same 11 of `posts` |
| 9 | A new post missing from, or different in, the legacy `posts` (anchor ids) | The same, the other way |
| 10 | A pair that one predicate makes and the other does not, over every list, on Trade or not. This is the `partner_post` key and the lead branch of `hidesOfSql` (lead ids) | The legacy `(o, w)` from `lists o JOIN lists w ON` the legacy `leadsPairSql` text, against the new `(o, w)` from `trade_post tp JOIN lists o ON o.id = tp.lead_list_id JOIN lists w ON ${postPairsSql("tp", "o", "w")}`, both ways |
| 11 | A (hider, list) pair whose hide predicate differs (list ids) | Over `cand(user_id, id)`, which holds, for each hide, its `list_id`, that list's `linked_list_id`, and the `want_list_id` of the row that list leads: `EXISTS (SELECT 1 ${hidesOfSql(sql`cand.user_id`, "l")})` (with `l` the candidate list) is distinct from the legacy predicate's `EXISTS` |
| 12 | A list whose `linkedList` relation partner differs from its link (list ids) | `db.query.lists.findMany({ columns: { id, linkedListId }, with: { postLed: …, postWanted: … } })`. The script inlines `postLed?.wantList ?? postWanted?.leadList` rather than importing `pairedListOf`, because `services/list/read.ts`' import chain has not been checked against the worker's `env.ts` and Redis rule. Its output goes in the same format as the loop's |

Why `partner_post` is covered: it is a join of `partner_lists` with itself on the pair predicate. Which lists enter `partner_lists` depends on `listed` (from `postsCte`) and on `inHiddenPostSql`, so the set is the same given checks 8, 9 and 11. Over the same set, the join is the same given check 10. Check 10 compares with `EXCEPT ALL`, so a pair that the new join returns twice (a list in two rows) also shows.

Why `inPostsOf` may drop a branch: today it also takes the lists whose `linked_list_id` is a named id (`post-cards.ts:28`). `postPartnerSql` of a named list gives the same lists only when links are mutual and each list is in one row, which checks 4 and 7 hold.

Why check 11's candidates lose nothing: either predicate holds for a list L and a hide H only when one of these is true:

- L is H's own list;
- L is the want list that H's list leads, by the link (legacy) or by the row (new).

Every such L is a candidate. Bounding L this way keeps the check to a few hundred probes on production (313 hides), instead of 5 hiders times every list.

Check 8 compares every output column, `bumped_at` and `updated_at` included, so it covers `listedCte`, `FeedRow`, `TAG_WHERE` and `trade-active-hours`' reads of `posts`.

Each check prints a count and up to 10 ids, and the script exits 1 when any count is above zero, as today. An `EXPLAIN=1` mode runs `EXPLAIN (ANALYZE, BUFFERS)` on the legacy and new `WITH … posts, listed SELECT count(*) FROM posts WHERE ${listedPost}`, on the legacy and new pair join of check 10, and on the legacy and new hide predicate applied per list, as `partner_lists` and the worker's `fetchPairs` apply it: `SELECT count(*) FROM lists l WHERE l.discoverable AND NOT EXISTS (SELECT 1 ${hidesOfSql(hider, "l")})`, for the person with the most hides. The local database has no hides, so only the production run shows that plan. `EXPLAIN ANALYZE` of a `SELECT` is allowed in a read-only transaction. The header comment changes too: drift is no longer harmless, since reads now follow the rows, and checks 7 to 12 go in the contract phase.

Pure tests: none change or are added, since no pure module changes (decision 3). The existing suites are the regression net: `trade-post.test.ts`, `trade-feed.test.ts`, `trade-rank.test.ts`, `report-post.test.ts`, `list.test.ts`, `trade-sql.test.ts` and the web's pure tests. Tests never touch a database. The proof that touches data is this script.

Rejected: a one-off comparison script in the scratchpad. It would test copies of the new SQL rather than the imported statements, and it would not be there for the post-deploy run.

### 7. Deploy and rollback

One deploy, with no migration:

1. The web image comes from CI on push to `main`.
2. The worker image is built on the VPS in the same rollout.

If the worker lags, it keeps the legacy `postsCte` and `hidesOfSql` over the link. That stays correct, because every writer still writes the link and the drift checks read zero, so alerts and unhides give the same answers either way. The web lagging the worker is the same case in reverse.

Rollback is redeploying the previous web and worker images. Nothing was written differently, so there is no point of no return. Checks 7 to 12 stay in the script until `trade-post-contract` drops the columns they compare.

### 8. Docs

- `packages/api/docs/trade.md` (Trade posts):
  - posts, pairs, partners and `PublicList.linkedList` are read from `trade_post`;
  - `postPairsSql` is the one pairing rule over the row, and `postPartnerSql` gives a list's partner;
  - writers and the reads inside them (`lockTradeLists`, `syncPostRows`, `openToEdit`) still use the link, which every writer must keep writing.
- `packages/db/AGENTS.md` (Trade posts): "written and not yet read" becomes "read for every post outside a write path; writers still derive it from the link".
- The `tradePost` doc comment in `packages/db/src/schema.ts`: the same correction. Comment only; `db:generate` finds no diff.
- `packages/api/src/lib/trade-post-rows.ts:43`: the comment names `leadsPairSql`, which is gone.
- `apps/worker/AGENTS.md` (Trade post drift):
  - checks 7 to 12 and `EXPLAIN=1`;
  - drift now changes what people see.

## Inputs for later phases

1. **`trade-post-keys`** (next): `hidden_trade_post.post_id` and `offer.post_id`, read instead of `list_id` and `post_list_id`. Carried over:
   - `offer.post_id` must be `ON DELETE SET NULL`, never CASCADE. CASCADE would delete offers with their messages, items and trades (`schema.ts:418,523,550`).
   - The hide's primary key is `(user_id, list_id)`, so `list_id` keeps being written.
   - The reconcile maps a hide through the lead or the want list (`hidePost` can write a want list's id when it is the anchor), and re-derives every `post_id`, not only the null ones.
   - 68 offers and 2 hides on production name a list that is in no row.
   - `acrossPosts` reads the absence of a post. A null `post_id` beside a set `post_list_id` would flip an offer to "Asks from your posts" and could trigger the one-post decline notice.
   - The deploy needs either expand → deploy → reconcile → deploy, or readers that fall back to `list_id` and `post_list_id` while `post_id` is null.
   - From the legacy design: inputs 1 to 5 (hides through an unlink or a lead delete, linking a Buy post to an off-Trade list, `hidePost` `ON CONFLICT … DO UPDATE` with a target, the visible hide changes that need spec deltas, the reconcile adding rows), and input 7 (the `(user_id, post_id)` hide index, after a dedupe).
   - Correction to legacy input 4: a stale hide on a paired want list already leaves Browse unaffected. The visible change is to matches, Can swap and alerts only (inventory, Surprises 1).
   - **The owner's answers of 2026-11-15, to implement there:**
     - (a) Someone hid a Buy post, and its owner later pairs that want list with a have or sale list. The post stays hidden: the hide moves to the paired post. The same rule covers a pair with one half on Trade once the other half joins.
     - (b) Someone hid a paired post, and its owner unpairs it. The have or sale list's post stays hidden, and the new Buy post is shown: one hide for one post.
   - `postPartnerSql` and the `postLed` and `postWanted` relations are where a row id is read beside the partner. A "row of a list" helper (decision 1, rejected here) lands with the keys.
2. **The write-side switch.** Writers write rows first, and the link becomes a mirror. `lockTradeLists`, `syncPostRows`, `openToColumns`, `findOwnedList`/`openToEdit`, `deleteList`'s partner read, and the stale-link clears in `writeList` and `savePost` (decision 5) read rows. Drift checks 1, 2, 6 and 7 then check the mirror.
3. **`trade-post-contract`.**
   - Drop `lists.linked_list_id`, `hidden_trade_post.list_id` and `offer.post_list_id`. This is the point of no return.
   - Remove checks 7 to 12 and the legacy SQL from the drift script.
   - Rename the pure modules' `linkedListId` input, and the raw `linkedListId` of `list.find` and `toDraft`.
   - Report snapshots keep their stored field.
4. **Post addresses**, then per-post offer rules, pause, a note and shared lists (phase 1 design, inputs 8 and 9). Shared lists will revisit `postPartnerSql`'s single answer and the `one` relations of decision 4.

## Risks / Trade-offs

- **[Drift is now visible.]** Until now a stale row harmed no one. After this change, a missing or wrong row unpairs a post on Browse, drops a Can swap key, or misses a hide's lead branch.
  → Mitigation:
  - every writer syncs under the lock, and production reads zero on all checks;
  - the drift script runs read-only against production before and after the deploy (Migration Plan);
  - check 7 adds the want-side case the first six miss.
- **[A list in two rows.]** The plain joins in `posts` and `partner_post` would duplicate a post. The scalar helper and the `one` relations give one answer.
  → Mitigation: the planner holds one row per list under the lock. Check 4 reports a violation, and checks 8 and 9 report the duplicated post.
- **[Scalar subqueries per row in `feedListColumns`.]** That is two index probes per list read, on reads of at most a page of lists.
  → Mitigation: the production `EXPLAIN` (Migration Plan step 3) covers the feed statement and the per-list hide predicate. If a list read regresses, it can join `trade_post` instead without changing the helper's meaning.
- **[`postPartnerSql` depends on the caller's alias.]** A caller that aliases `lists` and passes the wrong name fails loudly as SQL, not silently.
  → Mitigation: typecheck cannot catch it, and checks 7 to 12 exercise the helpers, not each call site. So every moved statement is executed once against the local database before production:
  - the read paths, by the browser pass in task 6.3;
  - the three reads that only run inside a job or a write, by a local execution in their own task:
    - `swapPair` through `loadContext`;
    - `postWantedAmong`;
    - `reportedPost`'s `snapshotColumns` select, run on its own.

  Postgres resolves names at parse time, so a run that returns no row still proves the SQL.
- **[`trade-active-hours` edits `feed/query.ts` too.]**
  → Mitigation: neither change touches the other's lines, apart from the import of `leadsPairSql`. Whichever lands second rebases. The `posts` columns that change reads are unchanged.
- **[A worker built from an older commit.]**
  → Mitigation: it reads the link, which stays correct (decision 7). The rollout notes the worker rebuild.

## Migration Plan

No migration. The deploy steps:

1. Locally:
   - implement;
   - run the drift script read-only against the local database (all twelve checks zero);
   - run `bun run check` and `bun run build --filter=web`;
   - do a browser pass on the local dev server.
2. With the owner's go-ahead, run the drift script read-only against production (`PGOPTIONS='-c default_transaction_read_only=on'`, without `.env.local`), from the working tree, before anything ships. All twelve checks must read zero. Check 11 is the first real test of the hide predicate, since the local database has no hides.
3. With the same or a further go-ahead, run `EXPLAIN=1` read-only against production. Compare the legacy and new plans and times; the new plan should be hash joins with no nested loop of `on_trade` against itself. Record both in Assumptions.
4. The owner approves the commit and the push. CI builds the web image, and the owner deploys web and rebuilds and restarts the worker on the VPS.
5. With the owner's go-ahead, run the drift script read-only against production again. Expected: zero on all checks.

Rollback: redeploy the previous web and worker images. No data changes in either direction.

## Assumptions and unverified facts

- **Verified locally, read-only, 2026-11-15:**
  - the legacy and new `posts` agree (381 posts, 56 paired), and so do the pair predicates (89 pairs);
  - `postPartnerSql` (the SQL in decision 1) equals `linked_list_id` for every list;
  - the new `posts` plans as hash joins (2.6 ms legacy, 1.6 ms new);
  - there are 0 hides, so the hide equivalence is untested locally.
- **From the brief, not re-read here:**
  - production has 1,322 rows and zero on all six drift checks;
  - 313 hides by 5 people;
  - 5 pairs with one half on Trade (4 the want half, 1 the lead half);
  - the last deploy was at `54d9209a`.
- **Checked in drizzle-orm 1.0.0-rc.5:** a `one` relation renders `limit 1` (`pg-core/dialect.js:429`) and ignores its alias when `from` and `to` are set (`relations.js:28-38`). Unverified: that the nested config's `orderBy` reaches that subquery; task 5.1 reads the rendered SQL.
- **Assumption:** node-postgres returns `coalesce(int4, int4)` as a JS number, as it does for `int4` columns, so `linkedListId` stays a `number`. Task 4.1 checks it on a local read.
- **Assumption:** production plans the new statements as the local database does. Migration Plan step 3 verifies it.
- **Checked by grep:** no consumer of `on_trade` other than `leadsPairSql` reads `linked_list_id`, including `openspec/changes/trade-active-hours/`. `lists.linkedList` is read only in `services/list/read.ts`.

## As built

Built on 2026-11-15, on top of `2637a7a3`. Departures from the decisions above, and what was run:

- **A wider baseline than task 1.2 asked for.** Before any read moved, a read-only script called `fetchOwnedLists` for every account (2,393), `fetchList` for every have, want and sale list (1,476), `fetchPostCards` and `staffPosts` over all of those lists, and `fetchMyPosts` for every account with one, and wrote the results as JSON. Two runs before the change were byte-identical, and the run after it is byte-identical to them (3.9 MB). That covers `PublicList.linkedList` (356 of them), the `currentUser` lists with no `postLed`, `postWanted` or row id in them, `feedListColumns`, `inPostsOf` and `pairedListOf`. The script ran from a scratch directory inside `apps/worker`, since bun resolves `@repo/*` from the script's own path, and that directory is deleted.
- **`fetchOwnedLists` maps once.** `postLed` and `postWanted` are pulled out in the one existing `map`, beside `userAddress`, rather than in a pass of its own.
- **The relation's SQL** (task 5.1): each one-relation renders `where … order by "d1"."id" asc limit 1`, so the nested `orderBy` is accepted and the `through` fallback is not needed.
- **`postPartnerSql` returns a JS number** (task 4.1): `typeof` is `"number"` for a paired list.
- **Check 12 selects `wantListId` and `leadListId`** on the two relations instead of loading the partner lists; it compares ids only.
- **Local executions:** `postWantedAmong` returns the pair's want slug for the have list 13138 and null for a Buy post; `loadContext` gives `swapPair` true for both halves of that pair and false for two lone lists; `resolveTradeSides`, `partnerListChoices` and `fetchHiddenPosts` run. `reportedPost`'s select and `postListsOf` were not called on their own: they use the same two constructs (`postPartnerSql("lists")` in a select from `lists`, and `postPartnerSql("named")` over an alias) that the runs above and the snapshot execute.
- **Local drift run:** 410 rows, zero on all twelve checks.
- **Local `EXPLAIN=1`:** listed posts take 3.9 ms by the link (Hash Right Anti Join over a Hash Left Join) and 1.8 ms by the rows (Hash Anti Join, Hash Left Join, Hash Right Join, Hash Join; no nested loop). The pair join takes 1.8 ms by the link (Merge Join) and 0.5 ms by the rows (two nested loops over 89 rows, index probes). There are no hides locally, so the hide rule printed no plan.
- **Browser pass** (task 6.3), signed in as a local test account, before and after: Browse, For you, a person page, a post page, `/account/hidden`, a list page for each half of two pairs, the offer builder with its list chooser, and the composer. The page text of all twelve captures is identical and no page logged a console error. Only the Browse screenshots were compared by eye; the rest rest on identical text. Hide post and Unhide were not clicked.
- **Checks:** `bun run check` passes (26 tasks), `bun run build --filter=web` passes, the worker's import-boundary test passes, and `db:generate` finds no schema change.

- **Production, read-only, 2026-11-15, from the working tree before any deploy** (the owner's go-ahead: "yes"): 1,328 rows, and zero on all twelve checks. The hide check ran over real hides for the first time. `EXPLAIN=1`:
  - Listed posts: 6.9 ms by the link, 9.8 ms by the rows. Both are hash joins over a sequential scan of `lists`; the new plan adds two scans of `trade_post` (1,328 rows) and has no nested loop of `on_trade` against itself.
  - The pair join: 4.2 ms by the link (Merge Join), 4.1 ms by the rows (Hash Join, then an index nested loop).
  - The hide rule over every list on Trade, for the person with the most hides (291): 766 ms by the link, 885 ms by the rows. Both are the same Nested Loop Anti Join with a subplan per (list, hide) pair, 472,230 pairs, and about 220 to 320 ms of each run is spent before the first row (JIT, by the look of it; not confirmed). The shape was slow before this change and is about 15% slower after it. For you applies the rule to `partner_lists` only, after its other filters, so a request pays less than this; it is a cost to look at in `trade-post-keys`, where the hide is keyed by post and the subplan goes.

## Open Questions

None that change the approach or the tasks. Two go-aheads are needed and are tasks, not questions: the production drift run, and the production `EXPLAIN`. The order in which this change and `trade-active-hours` land is free (Risks).

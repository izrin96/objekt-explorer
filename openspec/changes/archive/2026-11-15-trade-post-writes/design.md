## Context

See proposal.md for why. Phases 1 to 3 are archived under `openspec/changes/archive/2026-11-15-trade-post-table/`, `-trade-post-reads/` and `-trade-post-hides/`. Today's rules are in `packages/api/docs/trade.md` (Trade posts). These facts shape this change:

- **Every writer works from the link today.**
  - `lockTradeLists` (`services/list/shared.ts`) reads `linked_list_id` in its locked statement, and `planPost`, `postsOf` and `partnerOf` read it from there.
  - `trade.savePost` (`services/trade/post.ts`) clears links with two `UPDATE`s and sets a pair with two more.
  - `writeList` (`services/list/create.ts`) inserts the new list with its link, clears the target's old partner, and sets the target's link.
  - Each then calls `syncPostRows`, which re-reads the person's lists joined to their rows and applies `planPostRows` with the link as the partner.
  - `deleteList` reads the partner as `WHERE linked_list_id = $id`.
  - `list.edit`'s `openToColumns` tests `linked_list_id IS NOT NULL` inside its `UPDATE`, and `openToEdit` reads the raw column from `findOwnedList`, which `list.find` also returns.
- **What a statement sees after waiting for a lock.** Postgres runs at READ COMMITTED here. A statement that waits for a row lock and then proceeds sees the new version of the rows it locks or updates. It reads everything else from the snapshot taken when the statement began (PostgreSQL docs, 13.2.1). Two consequences shape decisions 3 and 5:
  - `lockTradeLists`' `FOR UPDATE` returns only lists that existed when its statement began. A list another writer inserted and committed while it waited is missing from the locked set.
  - A read of `trade_post` inside a statement that waited does not see rows another writer committed during the wait.

  Today's writers are safe from both. Their partner reads and `syncPostRows` are separate statements after the lock, and the guards inside a waiting statement read `linked_list_id` from the row they lock.
- **The foreign keys:**
  - `lists.linked_list_id` is `ON DELETE SET NULL`;
  - `trade_post.lead_list_id` is `ON DELETE CASCADE`;
  - `trade_post.want_list_id` is `ON DELETE SET NULL`.

  Deleting a list therefore clears its partner's link, deletes the row it leads, and empties the row it is the want list of, with no statement from the code.
- **Production, read-only, 2026-11-15 (from the brief):** 1,341 rows, zero on all eleven drift checks, zero non-mutual links. Production runs `ffd37a0b`. Check 7, `postPartnerSql(l) IS DISTINCT FROM l.linked_list_id` over every list, reading zero means the link and the row give every list the same partner today.
- **Local database, read-only, 2026-11-15:** 410 rows, 178 lists with a link, zero on all eleven checks.
  - `localtest2` has no general list, and these have, sale and want lists, all on Trade and unpaired, each leading its own row:

    | List | Type | Row | Note |
    | --- | --- | --- | --- |
    | 13142 `lt2 wants` | want | 1000421 | `match_have` and `match_sale` both true, so a Swap post with "I'd also pay" |
    | 13168 `lt2 spares` | have | 1000303 | |
    | 13169 `lt2 extras` | have | 1000304 | |
    | 13170 `lt2 sale` | sale | 1000305 | `takes_swaps` false |
    | 13173 `lt2 quiet` | have | 1000307 | |

  - `localtest1` has the pair 13140 (have) and 13175 (want), both off Trade, in row 1000302. It also has 13141, 13171 and 13172, on Trade and unpaired in their own rows, and 13174, a want list off Trade and Buying only.
- **The web never sends a link at create.** `listTypePatch` and `copy-draft.ts` set `linkedListId` to null. A list is created or copied linked only through `/rpc` or `/api/v1`, and `writeList` must keep serving that.
- **The worker imports nothing this change edits.** Its `@repo/api` imports reach none of these files:
  - `services/list/shared.ts`, `create.ts`, `edit.ts` and `read.ts`;
  - `lib/trade-post-rows.ts`;
  - `services/trade/post.ts`.

  Those imports are `services/trade/lists`, `feed/query`, `matches/recount`, `list/received`, `list/rules/expand`, `offer/*`, and the pure `lib/` and `schemas/` modules.

## Goals / Non-Goals

**Goals:**

- `trade_post` is the only source of a pairing that any statement decides on. `lists.linked_list_id` is written from it in one place and read only by the drift script.
- Every write leaves the same `lists`, `trade_post` and touched lists as today. That includes a writer that waited for another.
- `trade-post-contract` only deletes and renames.
- A writer's round trips change only as decision 4's table says.

**Non-Goals:**

- Changing the row rule, the planner's delete-and-re-create of rows, or the per-row `UPDATE` statements it issues.
- Removing the whole-row selects of `lists` that carry the column unread (decision 6). They lose it when the column leaves `schema.ts`.

## Decisions

### 1. What "pair" and "unpair" mean, as a pure rule

Today's SQL decides what happens to a list that had another partner:

- **`savePost`, unpair** (`plan.unlink`, which always lists both halves): every list whose id is in the set, or whose link names one, gets null. So each named list and its partner end up with no partner.
- **`savePost`, pair** (`plan.link = [offer, want]`, after the unpair): every list other than the two whose link names either one gets null. Then each of the two names the other. So the offer's old partner and the want list's old partner end up with no partner. They are never paired with each other.
- **`writeList`, created linked to L:** the new list N is inserted naming L. Every list other than N whose link names L gets null, and L names N. So L's old partner ends up with no partner. N, being new, had none.

So the rule is one sentence. **Pair A with B:** A's old partner and B's old partner each lose their partner, then A and B name each other. **Unpair A:** A and its partner both lose their partner. A create linked to L is "pair N with L", where N has no partner. In `savePost` the unpairs come first, then the pair, as today's statements run.

Two pure functions go in `packages/api/src/lib/trade-post-rows.ts`, beside `planPostRows`:

```ts
export type PairChange = {
  /** a have or sale list and a want list, in either order */
  pair?: readonly [number, number] | null;
  /** lists that leave their pair, with their partner */
  unpair?: readonly number[];
};

/**
 * Each list's partner by the rows: a lead's want list, a want list's lead. The lowest row id
 * wins, as `postPartnerSql` reads it; a list the lowest row already placed is left out of a later
 * row, which is the row set `planPostRows` then writes.
 */
export function partnersOf(rows: readonly PostRow[]): Map<number, number>;

/** The partners after a write: each unpair first, then the pair, which first unpairs both lists. */
export function applyPairing(
  partners: ReadonlyMap<number, number>,
  change: PairChange,
): Map<number, number>;
```

`partnersOf` walks the rows by id and skips a lead or a want list that it has already placed, so its map is always symmetric and gives each list at most one partner. `applyPairing` keeps it so.

**Where the tie-breaks overlap, and which one decides.** Today's SQL clears every other list that names either half, so it never leaves a want list named twice. `planPostRows`' "the lower id keeps a want list named twice" only fires on non-mutual links, which today's writers never produce. The backfill guard and check 7 show there are none.

After this change, `applyPairing` decides. Its output is a matching, so `planPostRows`' tie-break never fires on a writer's input. It stays as the planner's own guard, unchanged, since the planner stays the one implementation of the row rule.

`partnersOf` and `postPartnerSql` agree on every list while no list is in two rows (check 4). If one ever is, `postPartnerSql` gives the later row's lead the shared want list, while `partnersOf` gives it no partner. The planner then writes the `partnersOf` state, and the mirror always runs after a row operation (decision 3), so the link follows.

Rejected: keeping the two SQL shapes and running them on a scratch copy of the link. That moves today's rule into the database twice, and it cannot be tested without one.

### 2. `planPostWrite`: one pure plan per write

The whole in-memory part of a write is one pure function, so the server and the differential test (decision 7) run the same code:

```ts
/** A have, sale or want list as a write leaves it, as a statement read or returned it. */
export type TradeListState = { id: number; listType: RowList["listType"]; discoverable: boolean };

export type PostWrite = PairChange & {
  /** lists the write inserted, or whose `discoverable` it set, as its statements returned them */
  written?: readonly TradeListState[];
  /** lists the write deleted; the foreign keys already took them out of the rows and the links */
  removed?: readonly number[];
};

export type PostWritePlan = {
  ops: PostRowOps;
  /** lists still there whose partner the write changed: the ones to `touchList` */
  relinked: number[];
  /** the write asked for a pair or an unpair, or the plan has a row operation */
  mirror: boolean;
};

export function planPostWrite(
  before: { lists: readonly TradeListState[]; rows: readonly PostRow[] },
  write: PostWrite,
): PostWritePlan;
```

It works in five steps:

1. It applies the foreign keys to `before.rows`: it drops a row whose lead is removed, and nulls a removed want list. The model test's `cascade` moves here.
2. It reads the partners twice: `was` from `before.rows`, and `base` from the rows after step 1.
3. It computes `after = applyPairing(base, write)`.
4. It takes the lists: `before.lists` less `removed`, overlaid with `written` by id, sorted by id. It calls `planPostRows(rows, lists)` with `linkedListId: after.get(id) ?? null`.

   The sort keeps today's order (`syncPostRows` reads `ORDER BY lists.id`). `planPostRows` emits inserts in list order, and the identity column numbers a multi-row `INSERT` in that order, so row ids stay what today's build would give.
5. It returns:
   - `relinked`: every list in step 4 whose `was` and `after` partners differ. A deleted list's partner is in it, which is what `deleteList` touches today.
   - `mirror`: true when `write.pair` or `write.unpair` is given, or `ops` holds any delete, update or insert.

`mirror` does not compare partner maps. A planner update can change what `postPartnerSql` returns without changing the map, as in decision 1's list in two rows, where the planner empties the later row's want list.

A write with no pair, no unpair and no row operation changes nothing `postPartnerSql` reads, so it skips the mirror: Take off Trade, Open to and Trade-state saves, and a delete whose foreign keys did all the work. The foreign key has already cleared the link of a deleted list's partner.

`RowList.linkedListId` keeps its name. Its comment changes from "`lists.linked_list_id`" to "the list's partner after the write".

### 3. `lockPosts` and `writePosts`: where it runs, and the mirror

Both go in `services/list/shared.ts`, beside `lockTradeLists`, which every writer already imports. They replace `syncPostRows`.

```ts
/** A list as `lockTradeLists` returns it: what `PlanList` holds but the partner. */
export type LockedList = Omit<PlanList, "linkedListId">;

/** Unchanged, except that it no longer selects `linked_list_id`. `anonymizeUser` keeps calling it. */
export async function lockTradeLists(tx: Tx, userId: string): Promise<LockedList[]>;

export type LockedPosts = {
  /** the locked lists, each with its partner from `current.rows`: what `planPost` and the refusals read */
  lists: PlanList[];
  /** the person's have, sale and want lists and the rows they lead, read after the lock: what the plan starts from */
  current: { lists: TradeListState[]; rows: PostRow[] };
};

/**
 * `lockTradeLists`, then a fresh read of the person's lists and rows in a statement of its own.
 * The locked statement may have waited for a writer that created a list; this read sees it.
 */
export async function lockPosts(tx: Tx, userId: string): Promise<LockedPosts>;

/** RETURNING columns of a list write, for `PostWrite.written`. */
export const tradeState = { id: lists.id, listType: lists.listType, discoverable: lists.discoverable };

/**
 * Plans the write from `locked.current` (`planPostWrite`), writes the row operations, and writes
 * the mirror when the plan says so. Call it after the list writes. Returns `relinked`. A new writer
 * of a pairing, of `discoverable`, or one that deletes a have, sale or want list goes through it
 * and never writes `linked_list_id`.
 */
export async function writePosts(
  tx: Tx,
  userId: string,
  locked: LockedPosts,
  write: PostWrite,
): Promise<number[]>;
```

**`lockPosts`' second statement** is today's `syncPostRows` read without the link:

```sql
SELECT lists.id, lists.list_type, lists.discoverable, trade_post.id AS row_id, trade_post.want_list_id
FROM lists LEFT JOIN trade_post ON trade_post.lead_list_id = lists.id
WHERE lists.user_id = $1 AND lists.list_type IN ('have', 'want', 'sale')
ORDER BY lists.id
```

From it, `current.lists` holds one entry per list, and `current.rows` holds each row with `leadListId` set to the list. `PlanList.linkedListId` for each locked list is `partnersOf(current.rows).get(id) ?? null`. A locked list's partner may be a list that is not in the locked set, which is what `PlanList` held today too (decision 7). `planPost`, `postsOf`, `postHolding` and every refusal read the locked set, exactly as today. `planPostWrite` reads `current`.

**Why this read is enough.** It begins after `lockTradeLists` has returned, so it sees every list and row committed before then, the one created during the wait included. From then until commit, no other writer can create, change or delete a have, sale or want list or a row of this person. Each such writer first runs `lockTradeLists`, which locks the person's existing lists in id order and so waits on the lists this transaction holds.

A person with no have, sale or want list locks nothing, as today. Two such creates cannot link, since a link names an existing list. Each plans only its own row, and the planner never deletes a row whose lead it did not read.

**The two counter-examples, through this code.**

(a) Two `/rpc` creates by one person, N and then M, each linked to the same want list L:

- N's writer holds the lock, commits N with rows `(N, L)` and the mirror N↔L.
- M's writer waited in `lockTradeLists`. Its locked set lacks N, but its second statement reads N and row `(N, L)`.
  - `partnersOf` gives N↔L.
  - `pairRefusal` checks L from the locked set, as today.
  - The insert returns M.
  - `planPostWrite` with `pair: [M, L]` drops N↔L and sets M↔L.
- `planPostRows`:
  - updates N's row to `(N, null)`, since N already leads it;
  - inserts `(M, L)`;
  - leaves L, whose row was deleted when N paired, without a row.
- The mirror runs and writes N null, L to M, and M to L. `relinked` is {N, L, M}.

That is today's result: N unlinked, L and M paired, rows `(N, null)` and `(M, L)`, and N touched.

(b) `deleteList(L)` waits while N is created linked to L:

- The creator commits N↔L and row `(N, L)`.
- The delete's locked set lacks N, but its second statement reads N and `(N, L)`.
- The delete fires the foreign keys: N's link becomes null, and the row becomes `(N, null)`.
- `planPostWrite` with `removed: [L]` applies the same cascade in memory. N's partner was L and is now none, so N is in `relinked` and gets touched.
- The planner keeps N's row, since N leads it. There is no row operation and no pair, so the mirror is skipped; the foreign key already wrote N's link.

That is today's result: N kept, unlinked, in its own row, and touched.

The differential test (decision 7) runs one write at a time, so it cannot produce a list created during another writer's wait. This case rests on the reasoning above and on today's code reading the same fresh state.

**`writePosts`** applies the operations as `syncPostRows` does: one `DELETE`, one `UPDATE` per changed row, one `INSERT`. Then, when `mirror` is true, it runs:

```sql
UPDATE lists SET linked_list_id = mirror.partner_id
FROM (
  SELECT l.id, ${postPartnerSql("l")} AS partner_id
  FROM lists l
  WHERE l.user_id = ${userId} AND l.list_type IN ('have', 'sale', 'want')
) mirror
WHERE lists.id = mirror.id
  AND lists.linked_list_id IS DISTINCT FROM mirror.partner_id
```

It runs after the row operations in the same transaction, so `postPartnerSql` reads the rows just written. It reads by `user_id`, so it also covers a list created during the wait. Every list it writes is either locked by this transaction or one that no other writer can reach until commit (above).

- Each list of a pair gets the other's id.
- Every other have, sale or want list of the person gets null.
- A list already right is not written.

That is what today's writers leave, so the previous build reads it as its own. Comparing `linked_list_id` there is part of the write; it is the one statement outside the drift script that names the column.

**Settled, with reasons:**

- **`lockTradeLists` does not read the partner in its locked statement.** After a wait, that statement reads `trade_post` from its earlier snapshot, and it lacks lists created during the wait (Context). The archived phase 1 design asked for that read (decision 4). It was never built, and it would have had both flaws.
- **The plan starts from the fresh read, not the locked set.** The locked set can miss a list (counter-example (a)), and today's `syncPostRows` plans from the same fresh read. The refusals stay on the locked set, as today, so they do not change.
- **No re-read after the writes.** The plan's other input is `discoverable`. It comes from the fresh read, overlaid with the writer's own statements through `RETURNING tradeState`, so it is the database's value, not the writer's claim. The foreign keys' effects on rows are applied in step 1 of decision 2, the rule the model test already holds.
- **The mirror is read from the rows in SQL, not from the in-memory map.** The column then mirrors what readers read (`postPartnerSql`), and any pairing or row write repairs a stale value anywhere in the person's lists.

Rejected:

- **Reading the partner inside the locked statement** (see above).
- **Reading `trade_post` by the locked ids.** It misses the row of a list created during the wait (counter-example (a)).
- **Keeping `syncPostRows` with its re-read, and a change argument added.** It costs one statement per write and protects nothing that `RETURNING` and the tested cascade do not. `writePosts` replaces it and keeps its row operations as they are.
- **Writing the mirror from the in-memory map** (`UPDATE … FROM unnest(…)`). It would mirror the plan, not the rows, and the drift script would be the only check that the two agree.
- **Skipping the mirror unless a partner changed in the map.** It misses a planner update that changes `postPartnerSql`'s answer (decision 2).
- **A trigger that keeps the column in step.** The repo has none, and the column goes in the next change.

### 4. Each writer, and its round trips

Paths are under `packages/api/src/`.

| Writer | After |
| --- | --- |
| `trade.savePost` (`services/trade/post.ts`) | `lockPosts`, then `planPost(locked.lists, choice)` with the same refusals. The on, `saleSwaps` and off writes are unchanged, except that on and off add `.returning(tradeState)`. Then `writePosts(tx, userId, locked, { pair: plan.link, unpair: plan.unlink, written })`. The four link statements go. It touches its own writes and `relinked` |
| `trade.takeDownPost` (same file) | `lockPosts`, then `postsOf(locked.lists)`. The off `UPDATE` adds `.returning(tradeState)`, then `writePosts(…, { written })` |
| `writeList` for `list.create` and `list.copy` (`services/list/create.ts`) | `lockPosts` for a have, sale or want list (none for a general list, as today). `pairRefusal` runs on the target in `locked.lists`, as today. The insert drops `linkedListId` and returns `tradeState`. The partner's `tradeColumns(true)` returns `tradeState` too. Then `writePosts(…, { pair: linkedListId === null ? null : [inserted.id, linkedListId], written })`. The clear and the set of the target's link go. `relinked` holds the new list whenever it links, so `changed` is `[...new Set([inserted.id, ...relinked])]`; `touchListWith` would dedupe anyway (`new Set`), but the returned value then says what it means |
| `deleteList` (`services/list/edit.ts`) | A have, sale or want list: `lockPosts`, the delete, then `writePosts(…, { removed: [list.id] })`, and it touches `relinked` (its old partner), else bumps the trade version as today. A general list: the delete alone, since it has no pair and no row |
| `anonymizeUser` (`services/account/anonymize.ts`) | Unchanged: `lockTradeLists` for the lock, then the delete. The rows go through `lead_list_id`'s CASCADE, and the links through SET NULL among lists that all go. Nothing is left to plan or mirror |

**Why the touched lists stay the same.** Today `savePost` touches the rows its link `UPDATE`s return, plus its on, `saleSwaps` and off lists.

- The unpair's rows are the named lists and their partners, all of which change.
- The stale clear's rows are the two halves' old partners, which drop to null.
- The two halves themselves are picked, so they are among the on lists.

So today's touched set equals the on, `saleSwaps` and off lists plus `relinked`. For `writeList`, today's `[N, L, …L's old partner]` equals `[N, …relinked]`. The differential test asserts both (decision 7).

**Round trips.** These count statements inside the transaction; BEGIN, COMMIT and the `touchList` after commit are unchanged.

- "read" is `syncPostRows`' read today, and `lockPosts`' second statement after.
- r is the row operations.
- "mirror" is the mirror `UPDATE` (decision 2).

| Writer | Today | After | Change |
| --- | --- | --- | --- |
| `savePost`, no pairing change (re-save, kind or Open to change, a lone list posted) | lock, n on, sale?, off?, read, r | lock, read, n on, sale?, off?, r, mirror if r > 0 | 0; +1 when the plan writes a row (a list on Trade with no row yet gets one) |
| `savePost`, unpair only ("No list", "Unpair and use it" with no new pair) | lock, unlink, …, read, r | lock, read, …, r, mirror | 0 |
| `savePost`, a new pair (with or without unpair) | lock, [unlink], stale, set, set, …, read, r | lock, read, …, r, mirror | −2 (−3 with unpair) |
| `savePost`, the same pair saved again | lock, stale, set, set, …, read, r | lock, read, …, r, mirror | −2 |
| `takeDownPost` | lock, off, read, r | lock, read, off, r, mirror if r > 0 | 0 (rows stay through Take off Trade); +1 if it repairs a row |
| `writeList`, have, sale or want, no link | lock, slug, insert, read, r | lock, read, slug, insert, r, mirror if r > 0 | 0; +1 when the new list gets a row (created on Trade, which only `/rpc` asks for) |
| `writeList`, linked | lock, slug, insert, clear, set, partner on?, read, r | lock, read, slug, insert, partner on?, r, mirror | −1 |
| `writeList`, general | slug, insert | slug, insert | 0 |
| `deleteList`, have, sale or want | find; lock, partner, delete, read, r | find; lock, read, delete, r, mirror if r > 0 | −1; 0 when the plan writes a row (a deleted lead's want list on Trade gets its own) |
| `deleteList`, general | find; partner, delete (in a transaction) | find; delete (no transaction) | −1 statement, and no BEGIN or COMMIT |
| `anonymizeUser` | lock, delete | lock, delete | 0 |
| `list.edit`, saving Buying only on an off-Trade want list | find ∥ profile; update | find ∥ profile; BEGIN, lock, update, COMMIT | +3 (decision 5) |
| `list.edit`, any other edit; `list.find` | — | — | 0 |

`findOwnedList` reads the partner through relations in its one statement (decision 5), so `list.find`, `list.edit`, `list.copy` and `list.delete` gain no round trip.

### 5. Every write-path read of the link, moved

Items 15 to 21 of `trade-post-reads` decision 5, and the rest found by grepping `packages/api/src/services` for `linkedListId`, `linked_list_id` and `findOwnedList`:

| # | Path | Function | Reads today | Reads after |
| --- | --- | --- | --- | --- |
| 15 | `services/list/shared.ts` | `lockTradeLists` → `PlanList` for `planPost`, `postsOf`, `postHolding`, `partnerOf` | `linked_list_id` in the locked `SELECT` | Nothing of the pairing. `lockPosts` fills `linkedListId` from `partnersOf` over its fresh read |
| 16 | `services/list/shared.ts` | `syncPostRows` → `planPostRows` | `linked_list_id`, re-read with the rows | Deleted. `writePosts` → `planPostWrite` over `lockPosts`' fresh read, with the write's change applied |
| 17 | `services/list/edit.ts` | `openToColumns`' `CASE` | `lists.linked_list_id IS NOT NULL` | `${postPartnerSql("lists")} IS NOT NULL` (below) |
| 18 | `services/list/edit.ts` → `schemas/open-to.ts` | `editList` → `openToEdit` | the raw column from `findOwnedList`'s whole row | `findOwnedList`'s `linkedListId`, from the row (below) |
| 19 | `services/list/edit.ts` | `deleteList`'s partner, for `touchList` | `SELECT id FROM lists WHERE linked_list_id = $id` | `relinked` from `writePosts`, from `lockPosts`' fresh read |
| 20 | `services/list/create.ts` | `writeList`'s insert, stale-link clear and target write | writes the link, and `WHERE linked_list_id = L AND id <> N` | Deleted. `pair: [N, L]` in `applyPairing`, and the mirror |
| 21 | `services/trade/post.ts` | `savePost`'s unlink, stale clear and two sets | `WHERE id IN (…) OR linked_list_id IN (…)`, and `linked_list_id IN (o, w) AND id NOT IN (o, w)` | Deleted. `applyPairing`, and the mirror |
| — | `services/list/read.ts` | `findOwnedList`, behind `list.find`, `editList`, `deleteList`, `list.copy` / `copyPreview` / `slugPreview` and the entry and rule routers | the whole row, column included; `list.find` returns it raw | The same row, with `linkedListId` overwritten from the row (below) |
| — | `services/list/create.ts` | `checkLinkedList`, `prepareList` | the target's type and flags, and the request's `linkedListId`; never the column | Unchanged |
| — | `services/account/anonymize.ts` | `anonymizeUser` | the column, in `lockTradeLists`' locked `SELECT`, unused | The lock only |
| — | `services/trade/post.ts`, `services/list/create.ts` | the only writers of the column | six statements (`savePost`'s unlink, stale clear and two sets; `writeList`'s reverse clear and target set) and `writeList`'s insert | None. `writePosts`' mirror is the only writer, besides the foreign key's SET NULL |

**`findOwnedList`.** It reads the whole row with `postLed` and `postWanted` added, as drift check 12 does. It destructures both out, as `findHeldList` does with `userAddress`, and returns the rest with `linkedListId` from them:

```ts
const found = await db.query.lists.findFirst({
  where: { slug, userId },
  with: {
    postLed: { columns: { wantListId: true }, orderBy: { id: "asc" } },
    postWanted: { columns: { leadListId: true }, orderBy: { id: "asc" } },
  },
});
if (!found) throw new ORPCError("NOT_FOUND");
const { postLed, postWanted, ...list } = found;
return { ...list, linkedListId: postLed?.wantListId ?? postWanted?.leadListId ?? null };
```

`list.find` has no `.output()` schema (`routers/list-crud.ts`), so leaving the relations in would send them to every `/rpc` caller and change the web's `StoredList` type. Destructured, `list.find` keeps its keys and values. The web's `toDraft` and `list-form.tsx`'s `paired` are unchanged, and the other callers ignore the field. Task 4.1 compares the JSON keys before and after.

Rejected: a second function for the two callers that need the partner. It splits one owned-list read in two, to save two index probes.

**`openToColumns`.** `openToEdit` writes only to a want list that is off Trade, and the `CASE` keeps the stored flags when `keep` is true. Today's `linked_list_id IS NOT NULL` is true for exactly the want lists that are half of a pair, since links are mutual (check 7). `postPartnerSql("lists") IS NOT NULL` is true for exactly the same lists:

- its first branch is null for a want list, whose own row has no want list (check 5);
- its second branch is the pair's lead.

It renders `lists.id`, which names the `UPDATE`'s target. Task 4.2 checks the rendered SQL.

**The race, and why the lock comes with the move.**

`openToEdit` refuses Buying only for a want list that `findOwnedList` read as paired. The `CASE` is the guard for a pair made after that read. Suppose a `list.create` linked to that want list holds the person's lock when the edit's unlocked `UPDATE` arrives:

- The `UPDATE` waits on the want list's row and then evaluates the row's new version.
- During this phase the pairing transaction also writes that row's `linked_list_id` through the mirror. So a `CASE` left on the column would still see the pair and keep the flags: it would have stayed race-free until the contract.
- A `CASE` that reads `trade_post` evaluates in the snapshot from before the wait. It sees no pair, and would write Buying only onto a pair, which `pairRefusesOpenTo` forbids.

So the lock is needed only because the `CASE` moves to the row now. When `openTo.action === "write"` and `pairRefusesOpenTo(openTo.flags)`, `editList` runs its `UPDATE` in a transaction after `lockTradeLists(tx, userId)`. The `UPDATE` is then a new statement, with a snapshot taken after any writer it waited for.

With any other flags, `keep` is `discoverable` alone, a column of the row, and the edit runs as today without a lock. The lock is the documented one, so it adds no new lock order.

The cost is +3 statements (BEGIN, the lock, COMMIT). One user action pays it: an owner who saves Buying only in the list form of a want list that is off Trade and unpaired. A paired one is refused before the `UPDATE`.

Rejected:

- **Leaving the `CASE` on the mirror until `trade-post-contract`.** It is race-free in this phase, as shown. But it leaves one read of the link behind, against this change's goal, and moves the lock and its reasoning into the change that drops the column, which should only delete.
- **Accepting the race.** It is two tabs within milliseconds, and the reads already treat a Buying only pair as "Swap that would also pay" (`postKindOf`). But it would reopen a state that `pairRefusal` closed.

**`deleteList` and `anonymizeUser` against the foreign keys.** Deleting list L:

- clears its partner's `linked_list_id` (SET NULL);
- deletes the row L leads (CASCADE);
- empties the row L is the want list of (SET NULL).

The code still has to give a partner left alone its own row when it is on Trade, as `syncPostRows` does today, and touch that partner. `planPostWrite` does both: `removed` drives step 1, and the partner is in `relinked`. When the planner inserts that row, the mirror runs too and finds nothing to change.

`anonymizeUser` deletes every list of the person. Every row of theirs is led by one of those lists (check 5), so the CASCADE removes them all, and any link points into the same set. It needs no code, as today.

### 6. The pure modules' `linkedListId`, and what fills it

The name stays until the contract renames it. The server call sites that fill a pure input after this change:

| Pure input | Filled at | From, after this change |
| --- | --- | --- |
| `PlanList.linkedListId` (`planPost`, `postsOf`, `postHolding`, `partnerOf`) | `lockPosts` | `partnersOf(current.rows)`; was the locked column |
| `RowList.linkedListId` (`planPostRows`) | `planPostWrite` | `applyPairing(partnersOf(rows), change)`; was the re-read column |
| `openToEdit`'s `linkedListId` | `findOwnedList` | `postLed` / `postWanted`; was the raw column |
| `groupPosts`, `pairPosts` | `feedListColumns`, `snapshotColumns` | `postPartnerSql`, unchanged since `trade-post-reads` |
| `pickedSides`, `viewerPostOf`, `matchSides` | `resolveTradeSides` | `postPartnerSql`, unchanged |
| `postSnapshot`, and `reportedPost`'s read of the partner snapshot (`named.linkedListId`, `services/moderation/report.ts`) | `snapshotColumns` | `postPartnerSql`, unchanged |
| `groupPosts`, `pickedSides`, `partnerOf` (web) | `PublicList.linkedList` → `toPlanList`, `compare-rule.ts`, `list-post-tags.ts` | the `postLed` / `postWanted` relations, unchanged |

No web module changes, and no schema in `schemas/` changes. `postPartnerSql`'s comment (`services/trade/lists.ts`) names `lists.linked_list_id` only as what it replaced, and stays.

Whole-row selects of `lists` carry the column and never read it: `fetchListWithEntries`, `readList` and `readListForViewer`'s root row, `findHeldList`, and `findOwnedList`, which overwrites it. They lose it when the column leaves `schema.ts`.

The proof that nothing else reads the link has two parts (task 5.1), because neither finds everything:

- the typecheck, with the column taken out of `schema.ts` in the working tree, finds a typed use of the column;
- a grep of `packages/api/src`, `packages/db/src`, `apps/worker/src` and `apps/web/src` for `linked_list_id`, `linkedListId` and `linkedList` finds what the typecheck cannot: a raw-SQL use, and a read through `list.find`'s computed field, such as `list-draft.ts`. Every hit must be in task 5.1's allowed list.

### 7. Proof

**What each proof covers.**

- The pure tests compare the new pure rule (`partnersOf`, `applyPairing`, `planPostWrite`, `planPostRows`) with a hand-written model of today's SQL. Neither side runs SQL.
- So the tests cannot catch:
  - a wrong `.returning()`;
  - a `written` set that misses a statement;
  - `writePosts`' handling of the operations;
  - the mirror SQL;
  - `lockPosts`' query;
  - a writer that waited for another (decision 3).
- Those are proven by executing them: the local write pass runs every writer's SQL against the local database, and checks the links and the rows after each step against what today's code would leave. Before the deploy, the production drift script checks the starting state.

**The differential test** replaces the transitions in `lib/trade-post-rows.model.test.ts`.

Two worlds start empty: **legacy**, which holds the link, and **rows**. Each step picks a person and a write, built the way callers build it, and applies it to both. The write is one of:

- **`savePost`**, with a random `PostChoice`: a kind, have, want and sale slugs (own or null), `alsoPay`, `alsoSwap`, `unpair` and `replaces`. Each world runs the real `planPost` over its own `PlanList`s: legacy with the link, rows with `partnersOf`. The two results must be equal, refusal and slug included, which proves the same refusals in the same order. A refusal writes nothing.
- **`takeDownPost`** of a random own slug, through the real `postsOf` and `postHolding` in each world, which must agree.
- **`writeList`**, for create and copy alike, since `/rpc` copy accepts a link too. It takes a random type (have, sale or want), binding, `discoverable` and Open to, and a link only for have and want, as `prepareList` allows. The link target is a random own list, refused by the real `pairRefusal` exactly as `writeList` refuses under the lock.
- **`deleteList`** of either half of a pair, or of a lone list.
- **Account deletion**, at a low rate.

Legacy applies today's SQL, transcribed as pure functions that live only in the test:

- `savePost`'s unlink, stale clear and two sets, in order, with the on, `saleSwaps` and off writes, and the touched rows each statement returns;
- `writeList`'s insert with the link, reverse clear, target set and partner on;
- the foreign keys on delete;
- then `planPostRows` over the link, as `syncPostRows` does.

Rows applies the same list writes, then `planPostWrite` with the `written` its statements would return. It applies the operations, and when `mirror` is true it sets each list's link from the rows by `postPartnerSql`'s rule (lowest row; a lead's want list, else a want list's lead), transcribed in the test.

After every step, both worlds must have:

- identical lists: link, `discoverable`, Open to and `takes_swaps`;
- identical rows, ids included, since both planners see the same input in the same order;
- identical touched lists.

The existing invariants also hold in the rows world: the posts the rows give equal `groupPosts` over the link, no list is in two rows, owners match, and every list's link equals its `partnersOf` partner.

It runs 1,000 seeded sequences of 40 steps for two people, then asserts that each kind of transition occurred at least 100 times across the runs: post, Take off Trade, pair, unpair, swap the want list, delete a lead, delete a want list, create on Trade, create linked, copy, account deletion. Task 1.3 also breaks `applyPairing` on purpose (an old partner kept) and checks that the test fails.

It runs one write at a time, so it never produces a list created while another writer waited. That case rests on decision 3's reasoning and on the deploy-window argument below.

**What stays of the model test.**

- The healing test stays as it is: it tests `planPostRows` alone, from corrupted rows over a link, and the planner is unchanged.
- The posts-equality check and the invariants stay, inside the differential run.
- The old `step` goes. It was a loose model of the link writes, and the transcription replaces it.

**The unit table** (`trade-post-rows.test.ts`) gains cases:

- `partnersOf`: a pair, a Buy post, a lone lead, and a list in two rows, where the lowest row wins;
- `applyPairing`:
  - pair two lists that each have a partner;
  - pair the same pair again (no change);
  - unpair a list, and unpair a list with no partner;
  - a create linked to a paired list;
- `planPostWrite`:
  - `relinked` and `mirror` for each of the above;
  - a removed lead (its row is gone with no operation, and the partner on Trade gets a row, so `mirror` is true);
  - a removed want list (no operation, so `mirror` is false);
  - a list in two rows, where the only change is the planner emptying the later row (`mirror` true);
  - `written` overriding a list's `discoverable`.

**Deploy window, both orders.**

- **I:** each list's link equals its partner by `partnersOf` of its rows.
- **R:** the rows are what `planPostRows` gives over that pairing and `discoverable`.

Production holds both: check 7 and checks 1 to 6.

**The moment a writer acts on.** Take a writer of either build, and let S be the committed state when its `lockTradeLists` returns. From then until it commits, no other writer changes this person's have, sale or want lists or rows; each waits on the lock (decision 3). Both builds act on S:

- **Old build.**
  - Its locked statement returns the locked lists' latest columns, the link included: S for those lists. It lacks a list created during the wait, so `planPost` runs over the same locked set as the new build.
  - Its unlink, stale clear, set and `syncPostRows` are fresh statements, so they read S plus its own writes, the new list included.
- **New build.**
  - `planPost` runs over the locked set with partners from `lockPosts`' fresh read of S. Those are equal to the old build's link by I, even for a locked list whose partner was created during the wait.
  - The plan starts from that same read of S.

**From an S with I and R, the old and the new writer reach the same state, and it holds I and R:**

- **`savePost`.** `planPost` gets equal input, so it returns the same plan. Old's SQL gives link′ over every list of S. New's `applyPairing` over `partnersOf(S)` gives the same partners (the differential test checks this transition). `planPostRows` then gets the same lists, in the same order, with the same partners, so both builds write the same rows. The mirror sets link′ from them.
- **`takeDownPost`.** It writes the same `discoverable`. Neither build changes a pair, so both plan the same rows.
- **`writeList`.** As `savePost`, with `pair: [N, L]`. When L's old partner was created during the wait (counter-example (a)), old's stale clear finds it by a fresh `WHERE`, and new's fresh read finds it.
- **`deleteList`.** The foreign keys act the same under both builds. Old's partner read and re-read are fresh, and new's fresh read is S; the inputs are equal by I. Counter-example (b) is this case.
- **`anonymizeUser`.** It is unchanged.
- **`list.edit`'s Open to.** Old reads the column and new reads the row, equal by I, and neither writes the pairing. The new build's Buying only branch takes the lock first, so it acts on the S after any writer it waited for.

Writers of both builds take the same `lockTradeLists` lock, so each acts on the S its predecessor committed. Each step maps an I and R state to the same next state whichever build takes it, so any interleaving, in either order, gives the state either build alone would.

**The drift script.** Checks 1, 2, 6, 7, 8, 9, 10 and the relations check (11) compare the rows with `linked_list_id`. They now check the mirror, unchanged. No check is added:

- check 7 says every list's link equals its partner by the row;
- check 4 makes that partner mutual;
- together they are the mirror's whole contract (pair halves name each other, null otherwise).

Only the header comment changes. It now says the writers write the rows and mirror the link, and that the link checks go with the column. After this change those checks catch a wrong mirror, not a wrong row (Risks).

**Local write pass**, as the local test accounts, with the owner's approval of its rows (tasks 7.1 to 7.3). It is the executed proof, covering every writer's SQL and every path the pure tests cannot reach:

- creates linked through `/rpc`, one of them to a list that is already paired (the stale-clear path);
- a copy linked through `/rpc`;
- a pair made in the composer, a swap of the want list through "Unpair and use it", and an unpair by "No list";
- Take off Trade, and posting again;
- deletes of a pair's have list and of a pair's want list;
- `list.edit` refusing Buying only on a paired off-Trade want list, and saving Buying only on an unpaired one, which runs the locked branch.

After every write step, the local drift script reads zero, and a read-only query prints `linked_list_id` and the row of every have, sale and want list of the account. Its output must equal the values task 7.3 states for that step, which are what today's code would leave. The pass ends with the starting state restored.

### 8. Deploy and rollback

There is no migration and no schema change. One deploy: CI builds the web image on push, and the owner deploys it. The worker runs none of the changed code (Context). Rebuilding it in the same rollout is harmless and not needed. The drift script runs from the working tree.

Rollback is a redeploy of the previous web image, at any time. It reads the link, which the mirror keeps exactly as its own writers leave it, and it re-derives rows from that link, which gives the rows this build wrote (I and R). There is no point of no return.

The post-deploy check is the drift script, read-only against production, with the owner's go-ahead. All eleven counts must be zero. Check 7 is the mirror itself, and checks 1 to 6 are the rows against it.

### 9. Docs

- **`packages/api/docs/trade.md`:**
  - Trade posts:
    - the rows are the write side's source too;
    - every writer of a pairing, of `discoverable`, or that deletes a have, sale or want list takes `lockPosts` and hands its change to `writePosts`; a new such writer does the same and never writes `linked_list_id`;
    - `lockPosts` reads the person's lists and rows fresh after the lock, and why;
    - `planPostWrite` and `applyPairing` are the pure rule, `partnersOf` the writers' partner, and the mirror the only write of the column;
    - `list.edit`'s Buying only branch takes the lock, and why.

    The sentences saying writers write the link, and that the reads inside write paths stay on it, go.
  - Can swap (Mutual), line 10: `partner_post` "pairs a listed list with its `linked_list_id`" has been stale since `trade-post-reads`. It now pairs through the row (`postPairsSql`).
- **`packages/api/docs/lists.md`** (Lists):
  - "`writeList` when it links" has been wrong since `trade-post-table`, which made it lock every have, want and sale create;
  - "A change to a link" becomes a change to a pairing;
  - add `list.edit`'s Buying only branch to the lock's takers.
- **`packages/db/AGENTS.md`** (Trade posts): writers write the rows through `writePosts`, and `lists.linked_list_id` is a mirror written from them and read only by the drift script, until `trade-post-contract`.
- **The `tradePost` doc comment** in `packages/db/src/schema.ts`: the source of a post's pairing for reads and writers, written through `writePosts`, mirrored onto `lists.linked_list_id`. Comment only.
- **`apps/worker/AGENTS.md`** (Trade post drift): the link checks now check the mirror, so they no longer catch a wrong row.
- **`packages/api/AGENTS.md`, `apps/web/AGENTS.md` and the root `AGENTS.md`:** unchanged; none of their conventions moves.

## Inputs for later phases

1. **`trade-post-contract`:**
   - Delete the mirror write: `mirrorLinksSql`, the `mirror` flag and its tests.
   - Remove `linkedListId` from `lists` in `schema.ts`, with its index `lists_linked_list_id_idx` and its foreign key. Drop the column with an `IF EXISTS` custom migration (`drizzle-kit generate --custom`), written after the column leaves `schema.ts`, as `packages/db/AGENTS.md` describes. This is the point of no return: the previous build can no longer be redeployed.
   - In the drift script, remove checks 1, 2, 6 and 7 to 11, the legacy SQL (`legacyLeadsPair`, `legacyPostsCte`, `legacyPairs`), and the `EXPLAIN=1` link and hide fragments (`previousHidesOf`, `anchorOnly`).
   - Rename the pure modules' `linkedListId` (`PlanList`, `RowList`, `ListRef`, `TradeListRef`, `TradeFeedList`, `trade-rank`'s list, `openToEdit`'s input) and the `list.find` field. `createListInputSchema.linkedListId` keeps its name or gains a `z.preprocess` alias, so an open tab's `/rpc` call still validates (`packages/api/AGENTS.md`).
   - Report snapshots keep their stored `linkedListId` field.
   - Task 5.1's grep and its typecheck run without the column are the contract's first step.
2. **Post addresses:**
   - Stable row ids: the planner updates a row instead of deleting and re-creating it.
   - `lead_list_id` loses `NOT NULL` and becomes SET NULL.
   - `post_id` on hides and offers, with the notes in the archived `trade-post-hides` design (Inputs for later phases, 3): `offer.post_id` SET NULL never CASCADE; offers and hides naming a list in no row; `acrossPosts`; the two-deploy or fallback rollout.
   - `planPostWrite` is where a row's identity across a pair change is decided.
3. **Shared lists.** `partnersOf` and `applyPairing` assume one partner per list, as `postPartnerSql` and `planPostRows` do. One list in several rows replaces the partner map with rows as the unit of change, and hides need `post_id` first (`trade-post-hides`, Inputs 4).

## Risks / Trade-offs

- **[Repair now runs the other way.]**
  - Today a stale row is rebuilt from the link on the person's next write.
  - After this change the rows win. The mirror overwrites the link from them, so a row that is already wrong becomes permanent.
  - Drift checks 1, 2, 6 and 7 compare the mirror with the rows, so after that person's next write they stop seeing it.

  → Mitigation: the gate is the production drift run before the deploy (task 8.1), which must read zero on all eleven checks. That run is the last moment the link can still correct the rows. A count above zero stops the rollout, and the rows are repaired from the link, by the current build or by hand with the owner, before this change ships.
- **[The write path's core is rewritten.]** A mistake here changes posts for everyone who writes.
  → Mitigation:
  - the differential test compares the pure rule with today's, with refusals and touched lists;
  - the local write pass executes every writer's SQL, checking the drift script and the link and rows after every step;
  - the production drift script runs before and after the deploy.
- **[A writer that waited for another is covered by reasoning, not a test.]**
  → Mitigation: decision 3 walks both known cases through the code. The plan reads the same fresh state that today's `syncPostRows` reads.
- **[`RETURNING` and the fresh read are the planner's only sources for `discoverable`.]** A writer that sets `discoverable` and leaves its statement out of `written` would plan from the value read before it.
  → Mitigation:
  - every such statement is listed in decision 4;
  - the write pass covers each writer;
  - drift check 3 reports a list on Trade with no row;
  - the doc tells a new writer to pass its statements.
- **[`partnersOf` and `postPartnerSql` disagree on a list in two rows.]**
  → Mitigation: check 4 is zero on production. The planner writes the `partnersOf` state, and the mirror follows, since a row operation always runs it.
- **[`list.edit`'s Buying only branch now waits for the person's lock.]**
  → Mitigation: the lock is held only for the length of a Trade write, the branch is rare, and every other edit runs as today.
- **[The mirror runs a scalar subquery per list.]** That is about four index probes for each of a person's have, sale and want lists (29 at most on production), once per pairing or row write.
- **[`trade-active-hours` is open.]** It touches `feed/query.ts` only, which this change does not edit.

## Migration Plan

No migration. In order:

1. Locally: build groups 1 to 6 of the tasks; run `bun run check` and `bun run build --filter=web`.
2. With the owner's approval of its rows, the local write pass (tasks 7.1 to 7.3).
3. With the owner's go-ahead, the drift script read-only against production from the working tree. All eleven checks must read zero. This is the gate in Risks: the last moment the link can still correct the rows.
4. The owner approves the commit and push, and deploys the web image. The worker may be left as it is.
5. With a further go-ahead, the drift script read-only against production. All eleven checks must read zero.

Rollback: redeploy the previous web image, at any time (decision 8).

## Assumptions and unverified facts

- **From the PostgreSQL documentation, not run here:** at READ COMMITTED, a statement that waited for a row lock re-evaluates the rows it locks or updates at their new versions. It reads other rows from its own starting snapshot, so it neither sees rows another transaction inserted nor sees updates to rows it does not lock (13.2.1: "it can see the effects of concurrent updating commands on the same rows it is trying to update, but it does not see effects of those commands on other rows"). Decisions 3 and 5 rest on it. Showing it locally would take two writing sessions, and each local row needs the owner's approval; it is not planned.
- **From the brief, not re-run:** production's 1,341 rows, zero drift and zero non-mutual links.
- **Read locally, read-only, 2026-11-15:** 410 rows, 178 links, and the local test accounts' lists in Context.
- **To check in task 4.2:** that drizzle renders `postPartnerSql("lists")` inside `list.edit`'s `UPDATE … SET` with `lists.id` naming the target, by `.toSQL()`.
- **To check in task 4.1:** that `findOwnedList`'s whole-row `findFirst` with `postLed` and `postWanted` renders one statement with `limit 1` and `order by id` per relation, as check 12's does.
- **Assumed:** drizzle's `.returning({ id, listType, discoverable })` on an `UPDATE` returns the updated values, and an empty array when nothing matched. The write pass exercises it.

## As built

Built on 2026-11-15, on top of `2bd2b71c`. What was run, and the departures from the decisions and tasks above:

- **The pure rule** (`partnersOf`, `applyPairing`, `planPostWrite`) is as decisions 1 and 2 give it. 36 unit cases pass.
- **The differential test** holds over 1,000 seeded runs of 40 writes: equal refusals, lists, rows with ids, and touched lists after every write. Transitions that went through: 5,625 posts, 1,560 Take off Trade, 687 new pairs, 319 unpairs, 112 want-list swaps, 221 deletes of a pair's lead, 198 of a pair's want list, 2,886 creates on Trade, 559 creates linked, 147 of them to a list that was already paired, 379 account deletions. Departures from task 1.3:
  - there is no separate "copy" transition: `list.copy` goes through `writeList` with the same inputs as a create, so the test has one write for both, and counts "created linked to a paired list" in its place;
  - the generator aims at new pairs and want-list swaps (a Swap post of a have list with a want list it is not paired with, preferring one off Trade), since a list in another post is refused and chance alone gave 8 swaps;
  - the healing test now picks its writes with the same generator and applies them through the legacy model, since the old `step` is gone.
- **Breaking it on purpose:** with `applyPairing` not unpairing the second list, the differential test and four unit cases fail. With the create path's stale clear left out of the legacy model, both model tests fail. With `savePost`'s stale clear left out of the legacy model, nothing fails: `planPost` already puts every list a pair displaces into `plan.unlink` (or refuses without `unpair`), so that statement never changed a row for an input `planPost` lets through. It was a guard, and `applyPairing` keeps the guard.
- **Services:** `lockPosts`, `writePosts`, `tradeState` and the writers are as decisions 3 and 4 give them. `writePosts` takes `written` with a `ListType` and drops a general list itself, since `RETURNING tradeState` is typed with all four list types. `deleteList` returns early for a general list. `lockTradeLists` no longer selects the link, and `syncPostRows` is gone.
- **`findOwnedList`** (task 4.1): its JSON for 13140, 13175 and 13141 is byte-identical before and after (22 keys each, `linkedListId` 13175, 13140 and null, no `postLed` or `postWanted`).
- **Not done as the tasks say, and left to the write pass:** task 2.1's local executions of `lockPosts`' read and the mirror, and task 4.2's `.toSQL()` and read-only run of `editList`'s `UPDATE`. A `SELECT … FOR UPDATE` and an `UPDATE` cannot run on a read-only connection past their plan, so these statements are first executed for real in group 7. What stands in for them now: typecheck, and drift check 7, whose SQL is the mirror's comparison and reads zero locally.
- **The grep** (task 5.1) finds the link named only in the files the task allows; `services/trade/post.ts` and `services/list/edit.ts` have no hit.
- **The typecheck with the column taken out of `schema.ts`** fails in two places only, both in `apps/worker/src/script/trade-post-drift.ts` (the relations check's `columns: { linkedListId: true }` and the comparison that reads it). The column and its index were put back by hand; the only diff left in `schema.ts` is the `tradePost` doc comment.
- **Checks:** `bun run check` passes (26 tasks), `bun run build --filter=web` passes, the worker's import-boundary test passes, `db:generate` finds no schema change, and the local drift script reads zero on all eleven checks.
- **Local starting state** (task 7.1), read-only: as the task expects. W `1000421: 13142→–`, H1 `1000303`, H2 `1000304`, S `1000305`, H3 `1000307`, all on Trade and unlinked; 13140 and 13175 off Trade, linked, in `1000302: 13140→13175`; no list's link differs from its row partner.

- **Approvals** (the owner, 2026-11-15, "yes"): the local rows of the write pass, and the read-only production drift run.
- **Production gate** (task 8.1), read-only, from the working tree before any deploy: 1,346 rows, zero on all eleven checks.
- **The local write pass** (task 7.3) ran every writer for real against the local database. **Departure:** it called the service functions the routers call (`prepareList` and `createList`, `planCopy` and `writeCopy`, `editList`, `deleteList`, `savePost`, `takeDownPost`) from a scratch script, not the web through a browser. The routers and the web are unchanged by this change, the script can assert every list after every step, and the last browser pass lost a third of its steps to the composer. So the composer's own clicks were not exercised; the statements were. The script refused to start unless both the database and Redis were local, and is deleted.
  After each of the 22 steps it compared every have, sale and want list of both accounts (Trade state, link, Open to, the row it leads, the row it is the want list of) with the step's expected values, required every list the step did not name to be unchanged, and required four counts to be zero over the whole database: a link that differs from its row partner, a link that is not mutual, a list on Trade in no row, a list in two rows. All 22 held:
  - (a) a want list N created linked to `lt2 extras`: paired, `1000304: 13169→N`, N off Trade with no row of its own;
  - (b) a want list N2 created linked to `lt2 extras`, which was paired: N lost its partner and was touched, `1000304: 13169→N2`;
  - (c) N2 copied as a have list H4 linked to N: a new row `H4→N`;
  - (c′) Buying only on N, which is paired: refused with `list_pair_buying_only`, nothing written;
  - (d) H4 deleted: N unpaired and touched, no row;
  - (e) Take off Trade `lt2 spares`: off Trade, `1000303` kept;
  - (f) `lt2 spares` paired with `lt2 wants`: `1000303: 13168→13142`, and the Buy post's row `1000421` gone;
  - (g) the pair's want list swapped for N2 with `unpair`: `1000303: 13168→N2`, `lt2 extras` alone in `1000304` and touched, `lt2 wants` off Trade in no row;
  - (h) N2 copied as a want list C with no link: off Trade, no row;
  - (i) Buying only saved on C, the locked branch of `list.edit`: `match_have` false, `match_sale` true;
  - (j) the pair unpaired by a Swap post of `lt2 spares` alone: `1000303: 13168→–`, N2 off Trade in no row;
  - (k) `lt2 wants` posted alone: a new row `1000423`;
  - (l) `lt2 extras` paired with N2 from its lone post: `1000304: 13169→N2`;
  - (m) N2 deleted: `1000304: 13169→–`, `lt2 extras` unpaired and touched;
  - (n) N and C deleted;
  - (o) `localtest1`'s off-Trade pair posted: both on Trade, still `1000302: 13140→13175`;
  - (p) taken off Trade again: both off, still paired, row kept.
  The full local drift script then read zero on all eleven checks.
- **Local data after the pass**, against the starting state: every list has the Trade state, link, Open to and `takes_swaps` it had. `lt2 wants` leads a new row (`1000423`, was `1000421`). `updated_at` moved on 13140, 13142, 13168, 13169 and 13175, and `bumped_at` on 13140 and 13175. The four lists the pass created are gone.
- **CI:** the first push (`4f2ad06c`) failed its checks, so `:latest` did not move. The differential test took 11.8 s on the runner against bun's 5 s default; it takes 0.65 s locally. Both long tests got a 60 s timeout (`b5c5965c`), and that run passed.
- **Production after the deploy** (task 8.2), read-only, 2026-11-15 05:50 UTC: 1,346 rows, zero on all eleven checks. The run came about a minute after the image was built, and no `trade_post` row had been created since, so it shows the deploy broke nothing at rest. It does not show a write by the new code on production.
- **Production, second run**, read-only, 2026-11-15 06:10 UTC, about 20 minutes after the deploy: 1,344 rows, zero on all eleven checks. Two rows were removed since the deploy, 15 have, sale or want lists had `updated_at` moved (8 of them linked), and no row was created. So the new code removed rows on production and the mirror agreed afterwards; a row created by the new code, and a pair or unpair, were not seen in this window (`updated_at` also moves on writes that touch no post).
- **Production, third run**, read-only, 2026-11-15 06:29 UTC, after the archive: 1,345 rows, zero on all eleven checks. One row had been created since the deploy, and it holds a pair, so the new code has now created a row with a pair on production, as well as removed rows, and the mirror agreed each time.
- **Two writers of one person at once**, run after the archive, 2026-11-15, against the local database through the service functions (the scratch script is deleted). Five rounds held the person's list lock, queued two writers behind it in a fixed order and let go, so the second writer's locking statement began before the first one's new list existed: a create that pairs then a take-down; two creates pairing the same have list; a create that pairs then a delete of the old partner; a save that pairs then a create pairing the same have list; a create that pairs then a save that unpairs. Then 40 rounds of up to three writers at once with no lock held (89 writes done, 31 refused by the post rules). After every round four counts over the whole database were zero: a link that differs from its row partner, a link that is not mutual, a list on Trade in no row, a list in two rows. No writer failed with anything but a refusal, so no deadlock. The local data ended as it began, row ids aside, and the full local drift script read zero on all eleven checks. Not shown: that the rounds would fail without the fresh read after the lock, since no build without it was run.

## Open Questions

None that change the approach or the tasks. The owner's approvals, for the local rows and for each production run, are tasks.

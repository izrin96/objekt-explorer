## Context

See proposal.md for why. This is change 1 of 7 in the shared-lists chain the owner set on 2026-11-16: `trade-post-state` → `trade-post-hides-by-row` → `trade-post-planner-shared` → `trade-post-reads-by-row` → `post-id-inputs` → `offer-reads-post-id` → `shared-lists`. The binding decision for this change is the owner's decision 3: on Trade, `bumped_at` and the idle rule, a want side's Open to, and a sale side's `takes_swaps` are per post. Paths below are under `packages/api/src/` unless they say otherwise. Line numbers are from the worktree at `6567a9c1`.

**The state today, all on `lists`** (`packages/db/src/schema.ts`):

| Column | Line | Meaning |
| --- | --- | --- |
| `discoverable boolean NOT NULL DEFAULT false` | 101 | on Trade |
| `match_sale boolean NOT NULL DEFAULT true` | 103 | a want list buys |
| `match_have boolean NOT NULL DEFAULT true` | 105 | a want list swaps |
| `takes_swaps boolean NOT NULL DEFAULT false` | 107 | a sale list also swaps |
| `bumped_at timestamptz NULL` | 111 | last bump; with `updated_at`, the idle rule |

- **Checks:** `lists_open_to_something` (`match_sale OR match_have`, :132) and `lists_takes_swaps_sale_only` (:133).
- **Partial indexes:** `lists_trade_discoverable_idx` (`list_type` WHERE `list_type IN ('have','want') AND discoverable`, :126-128) and `lists_trade_feed_idx` (`bumped_at DESC, id` WHERE `discoverable`, :129-131).

**A post is built from its lists' state.** `postsCte` (`services/trade/feed/query.ts:16-48`):

- It takes every `discoverable` matchable list as `on_trade`.
- It folds a want list into the list offering swaps that its `trade_post` row pairs it with, only when both are in `on_trade` (`:42-43`).
- It drops a want list that a listed lead folds in (`:44-47`).
- A post's bump is `coalesce(greatest(a.bumped_at, p.bumped_at), greatest(a.updated_at, p.updated_at))`, truncated to milliseconds (`:36-39`).
- `listedPost` is `greatest(bumped_at, updated_at) > now() - IDLE_DAYS` (`:51`, `IDLE_DAYS = 30` in `lib/trade-rank.ts:21`).

**A row can show one half and not the other.** Today each half carries its own Trade state:

- **Lead on, want off.** `planPost` keeps a pair when a Swap post holds one list, "its partner staying where it is" (`schemas/trade-post.ts`, `planPost` doc comment). So a have list posted alone keeps its row `(H, W)` with W off Trade. The feed shows H alone.
- **Want on, lead off.** `postRowSql`'s comment says "a want list on Trade can sit in a row led by an off-Trade have list" (`docs/trade.md`, the post id paragraph). The archived offer-post-id design reaches this state in three composer steps (decision 3, case c). The feed shows W alone, as a Buy or Swap post anchored on W.

**Writers of the five columns.** A grep of `packages/api/src`, `packages/lib/src`, `packages/db/src`, `apps/worker/src` and `apps/web/src` for `update(lists)`, `UPDATE lists`, `insert(lists)` and the column names finds these:

- `trade.savePost`: on, `saleSwaps` and off writes (`services/trade/post.ts:41-71`).
- `trade.takeDownPost` (`:81-97`).
- `writeList` for `list.create` and `list.copy`: the insert and the partner's on write (`services/list/create.ts:176-215`).
- `list.edit`: Open to and `takes_swaps` off Trade (`services/list/edit.ts:24-46`, `:96-130`).
- `bumpPerson` (`services/trade/feed/mine.ts:88-114`).
- Deletes: `deleteList` (`edit.ts:137-156`) and `anonymizeUser` (`services/account/anonymize.ts:96`).

`list/received.ts:64` and `list/copy.ts:125` write other columns. The web writes only through these procedures.

**Off Trade, Open to belongs to the list.**

- `show-open-to-off-trade` (archived 2026-11-13) shows a want list's Open to off Trade, and `list.edit`'s `openTo` sets it there.
- `sale-open-to-off-trade` (archived 2026-11-20) does the same for a bound sale list's `takes_swaps`.
- `list.create` and `list.copy` store both (`create.ts:194-195`).
- The composer starts from the list's values: `startForList` uses `alsoSwap: list.takesSwaps` (`schemas/trade-post.ts:453`), and `plan-list.ts` (web) copies `matchHave`, `matchSale` and `takesSwaps`.
- The viewer's own lists count on or off Trade, with their own Open to: `recount.ts:44, 77-79`, `viewer.ts:73-81`, and `candidates.ts:72-85` (`my_want`, `my_have`).
- `list.edit` writes Open to only while the list is off Trade: the `CASE … WHEN discoverable THEN keep` in `openToColumns` and `takesSwapsColumn` (`edit.ts:24-46`).

**`discoverable` also means things a list has as such**, apart from any post:

- a sale list is on the Marketplace (`countedListings`, `services/market/aggregate.ts:31`);
- a have or sale list is one an offer may ask from (`askableOnTrade`, `trade/lists.ts:20`);
- a want list may be named by an offer or the picker (`offer/core.ts:431`, `offer/view.ts:89`, `picker/shared.ts:164, 180, 188, 221`, `picker/theirs.ts:226, 234`, `picker/index.ts:178, 386`, `lib/offer-rules.ts:525`);
- a list can be opened from Trade (`visibleOnTrade`, `trade/feed/shared.ts:21`);
- a chat card resolves (`chat/card-resolve.ts:55`);
- hiding a partner makes sense (`trade/hidden.ts:20, 69`);
- the list page shows On Trade (`list/read.ts:56, 135, 202`, read by `list-header.tsx:96`, `list-rows.tsx:235`, `list-open-to.ts` and `show-matches.ts`);
- the worker's newly discoverable set (`apps/worker/src/job/want-alerts/index.ts:48-51`).

It is not a privacy gate: profiles are public, and no list read filters on it for visibility (`packages/api/AGENTS.md`, Privacy and Trade).

**Production, from earlier read-only runs, not re-run for this change:** 1,363 `trade_post` rows on 2026-11-15 (offer-post-id, As built), and drift checks 1 to 3 at zero.

**Since the mapping pass**, `8bc96eaa` (offer-on-buy-post) changed only offer and picker reads. `partnerListChoices` now reads `trade_post.want_list_id` for `buy` (`picker/theirs.ts:218`). No reader or writer of the five columns changed. Offers can now store a want list as `post_list_id`, per the commit message; nothing here depends on that.

## Goals / Non-Goals

**Goals:**
- Every post's state has a place on its `trade_post` row, per side, and every writer keeps it equal to its lists' state while a list is in at most one row.
- The reads that build posts and match against them read the row. That is the base `trade-post-reads-by-row` builds on.
- No person, open tab, `/api/v1` caller or cache sees a difference. The live build keeps working through every migration.

**Non-Goals:**
- A post whose state differs from its lists. Writers still decide per list (`planPost`'s `on`, `off`, `saleSwaps`).
- Dropping or renaming a `lists` column or index.
- Hides, offers, post-id inputs, the planner's row rule, and `.tsx` or message changes.

## Decisions

### 1. The columns

Added to `trade_post` (`schema.ts:263-287`):

| Column | Type | Holds |
| --- | --- | --- |
| `lead_on_trade` | `boolean NOT NULL DEFAULT false` | the lead list is on Trade in this post |
| `want_on_trade` | `boolean NOT NULL DEFAULT false` | the want list is on Trade in this post; false with no want list |
| `lead_bumped_at` | `timestamptz NULL` | the lead's bump in this post |
| `want_bumped_at` | `timestamptz NULL` | the want list's bump in this post; null with no want list |
| `match_have` | `boolean NOT NULL DEFAULT true` | the post's want side swaps |
| `match_sale` | `boolean NOT NULL DEFAULT true` | the post's want side buys |
| `takes_swaps` | `boolean NOT NULL DEFAULT false` | the post's sale lead also swaps |

- **The open list.** The post's want side is its want list, or its lead when the lead is a want list (a Buy post, or a lone want list). Call it the row's open list.
- **No open list.** With no open list (a have or sale lead with no want list), `match_have` and `match_sale` hold their defaults, and nothing reads them.
- **`takes_swaps`** is true only when the lead is a sale list that takes swaps.
- **Check `trade_post_open_to_something`:** `match_have OR match_sale`, the twin of `lists_open_to_something`.
- **Names.** The three Open to columns keep the `lists` names, so a reader that switches sources keeps its column names (`TAG_WHERE`, `byOpenToSql` and `offerMatchesWantSql` read `match_have`, `match_sale` and `takes_swaps` by name; `lib/trade-sql.ts`, `trade/lists.ts:31-32`). The on-Trade column is `on_trade`, the product's word ("Show on Trade"), rather than `discoverable`.

Refused:

- **One `on_trade` and one `bumped_at` per row.** A row can show one half and not the other (Context), and `postsCte` gives such a post the shown half's bump. One flag would change the feed for those rows.
- **A slot table `trade_post_list(post_id, list_id, side, …)`.** A row has exactly two slots, so columns need no join. A slot table is the shape only if a post ever holds more than two lists.
- **A CHECK tying the want side's state to `want_list_id`** (`want_list_id IS NOT NULL OR NOT want_on_trade`). `want_list_id` is `ON DELETE SET NULL`, and Postgres checks a table's CHECK constraints on the row its referential action updates. `anonymizeUser` deletes lists without going through `writePosts` (`anonymize.ts:96`), so a deleted want list whose row survives the statement would fail the delete. The drift script checks this instead (decision 9).
- **A CHECK that `takes_swaps` is true only for a sale lead.** A CHECK cannot read the lead's `list_type`. The drift script checks it.

### 2. What stays on `lists`

| Column | Fate | Why |
| --- | --- | --- |
| `match_have`, `match_sale`, `takes_swaps` | Stay for good, as the list's own Open to | Off Trade, at create, the composer's start value, and the viewer's own side all read the list (Context). `lists_open_to_something` and `lists_takes_swaps_sale_only` stay. |
| `discoverable` | Stays in this change and is still written by the writers | It has list-level readers (Context). Its later fate, kept as the list's "on Trade in some post" or replaced by an `EXISTS` over the rows, is owner question 1. |
| `bumped_at` | Stays and is still written; leaves in `trade-post-state-contract` | `personBumpedAt` (`services/list/shared.ts:25-27`) and `lastBumpOf` (`mine.ts:79-85`) are per person, and stay on `lists` here (decision 8). |
| `updated_at` | Stays for good | It is the list's content time (`touchList`), and edits to a list's entries reach every post that holds it. So the idle rule is half the post's (`bumped_at`) and half the list's (`updated_at`). |

### 3. The invariant, and which half of it the drift script checks

While no list is in two rows (drift check 2), let R be a row, L its lead, W its want list (or none), and O its open list (W, or L when L is a want list, or none). **State equation E:**

- `R.lead_on_trade = L.discoverable`, `R.lead_bumped_at = L.bumped_at`
- `R.want_on_trade = coalesce(W.discoverable, false)`, `R.want_bumped_at = W.bumped_at` (null with no W)
- when O is on Trade: `R.match_have = O.match_have`, `R.match_sale = O.match_sale`
- when L is a sale list on Trade: `R.takes_swaps = L.takes_swaps`; when L is not a sale list: `R.takes_swaps = false`

Open to and `takes_swaps` are bound only on sides that are on Trade, and that is the one place E is weaker than "the row always equals its lists":

- `list.edit` writes them only off Trade (Context).
- Every way onto Trade goes through `writePosts` (decision 4), which sets them from the list.
- So an off-Trade edit leaves the row's copy stale until that person's next post write, and no reader reads an off-Trade side's Open to (decision 6).

Refused: making `list.edit` write the row too. That needs `lockTradeLists` on every off-Trade Open to save, because an unlocked row write can race a post writer, and it costs +3 statements (BEGIN, the lock, COMMIT), plus one for the row write, on a common form save. It would buy only a value nothing reads.

### 4. Writers: each row's state is derived in the pure planner

`planPostWrite` (`lib/trade-post-rows.ts:197-237`) already knows, after a write, every list's Trade state and the full row set. It gains the rest of each list's state and returns each row's state:

```ts
/** A have, sale or want list as a write leaves it, as a statement read or returned it. */
export type TradeListState = {
  id: number;
  listType: RowList["listType"];
  discoverable: boolean;
  bumpedAt: string | null;
  matchHave: boolean;
  matchSale: boolean;
  takesSwaps: boolean;
};

/** A post's own Trade state, per side; `trade_post`'s state columns. */
export type PostState = {
  leadOnTrade: boolean;
  leadBumpedAt: string | null;
  wantOnTrade: boolean;
  wantBumpedAt: string | null;
  matchHave: boolean;
  matchSale: boolean;
  takesSwaps: boolean;
};

/** The state equation (design decision 3), with off-Trade Open to taken from the list too. */
export function postStateOf(lead: TradeListState, want: TradeListState | null): PostState;
```

- **`postStateOf`:**
  - The two sides come from L and W.
  - `matchHave` and `matchSale` come from the open list, or are `true` with none.
  - `takesSwaps` is `lead.listType === "sale" && lead.takesSwaps`.
  - It sets off-Trade Open to as well, so a write leaves a row equal to its lists in full, and E's weaker half only arises from `list.edit`.
- **The read side.** `PostRow` gains `state: PostState`, read by `lockPosts`' fresh read. That statement adds the row's seven columns and the list's four. `tradeState` (`shared.ts:129-133`), the `RETURNING` of every list write, adds `bumpedAt`, `matchHave`, `matchSale` and `takesSwaps`. A bump time therefore always comes from the database: `tradeColumns(true)` computes it in SQL (`shared.ts:39-48`), and the planner copies the string it returned. It never computes one.
- **The plan.** `planPostWrite` applies `ops` to `before.rows` in memory, giving the rows after the write. Then:
  - each insert carries `state: postStateOf(…)` for its lists;
  - a new `ops.states: { id: PostId; state: PostState }[]` lists every surviving row whose computed state differs from its stored `state`, rows the plan updates included.
- **Pairing and touched lists are unchanged.** `planPostRows` (`:42-92`), `relead` (`:95-115`), `applyPairing` and `relinked` do not change.
- **`writePosts`** (`shared.ts:146-172`) writes:
  - the deletes and lead/want updates as today;
  - then `ops.states` in one `UPDATE trade_post SET … FROM unnest(…)` (the batch write `packages/api/AGENTS.md` names);
  - then the inserts with their state columns.

Writers that must pass more through `written`:

- **`savePost`'s `saleSwaps` `UPDATE`** (`post.ts:51-57`) gains `.returning(tradeState)` and joins `written`. Today it is not returned, because the planner did not need `takes_swaps`.
- The `on` and `off` writes, `takeDownPost`, `writeList`'s insert and its partner's on write already return `tradeState`, which only widens.
- `deleteList` passes `removed`, as today.

Refused:

- **One SQL statement at the end of `writePosts` that sets every row of the person from `lists`.** It needs no planner change, but no pure test could check it. The pure rule is the repo's way: the model test can assert E after every random write (decision 10), and `trade-post-planner-shared` needs per-row state as a planner output anyway.
- **A trigger on `lists`.** The repo has none, and `trade-post-writes` refused one for the same reason.

**Round trips.**

| Writer | Today | After | Change |
| --- | --- | --- | --- |
| `savePost`, Take off Trade, `writeList` (have, sale or want), `deleteList` | lock, read, list writes, r | the same, plus one state `UPDATE` when `ops.states` is non-empty | +1 when a row's state changes (going on or off Trade, an Open to change); 0 otherwise. A new row carries its state in its insert. |
| `bumpPerson` | 1 statement | BEGIN, lock, 1 statement, COMMIT | +3 (decision 5) |
| `list.edit`, `list.find`, every read | — | — | 0 |

### 5. `bumpPerson` takes the person's list lock

Today `bumpPerson` is one unlocked `UPDATE lists … RETURNING` (`mine.ts:88-114`), safe through EvalPlanQual. After this change it runs in a transaction:

1. `lockTradeLists(tx, userId)`.
2. One statement, the same `UPDATE lists` as a data-modifying CTE, with an `UPDATE trade_post` that sets `lead_bumped_at` or `want_bumped_at` from the CTE's `RETURNING id, bumped_at` for the person's rows holding a bumped list, then `SELECT bumped_at::text FROM bumped`. It is raw SQL through `tx.execute`, as today's statement is.

**Why the lock.** Without it, a `savePost` that holds the person's lists and inserts a row would make the bump's `UPDATE lists` wait and then proceed. But the statement's `trade_post` half reads rows from the snapshot taken before that wait, so it would miss the new row, and that row's side would keep the pre-bump time. Under the lock, the statement starts after any post writer has committed. `personBumpedAt` and the cooldown are unchanged.

Refused: a second, unlocked statement, which is the same race; and accepting the race as self-healing at the person's next post write, which is not worth it for +3 statements on a once-a-day action.

### 6. The rows a write creates, re-leads, merges, splits or deletes

Each row's state is a function of the lists in it after the write (decision 4), so the row rule needs no case of its own:

| Planner case (`trade-post-rows.ts`) | Row | State it gets |
| --- | --- | --- |
| New row (`inserts`): a list put on Trade with no row, a pair made, the freed want list of a split | new id | `postStateOf(lead, want)` of its lists |
| Re-led, id kept (`relead`, `:95-115`; a deleted lead's want list taking over, `deleteList`) | same id | the new lead's state, and the want side's (none after a takeover) |
| Merge, want list's row kept (`:79-84`) | the want list's id | the have or sale list's state as lead, and the want list's own |
| Merge, lead's row kept | the lead's id | the lead's own state, and the joining want list's |
| Want list swapped or dropped | same id | the new want list's state, or none |
| Deleted (`deletes`) | gone | — |
| Take off Trade (no row operation) | same id | both sides off; bumps and Open to unchanged |

So a list carries its own state into whatever row it lands in. That is today's behaviour, where the state never left the list. Change 3 of the chain decides what a post keeps when lists move between posts that can differ.

### 7. Readers that switch to the row (deploy B)

There are two helpers in `services/trade/lists.ts`, which is env-free (the worker imports it).

**`onTradeSql`** is the body of `postsCte`'s `on_trade`. It returns one row per list side that is on Trade:

```sql
SELECT l.id, l.user_id, l.list_type,
  CASE WHEN l.list_type = 'want' THEN tp.match_sale ELSE l.match_sale END AS match_sale,
  CASE WHEN l.list_type = 'want' THEN tp.match_have ELSE l.match_have END AS match_have,
  CASE WHEN l.list_type = 'sale' THEN tp.takes_swaps ELSE l.takes_swaps END AS takes_swaps,
  side.bumped_at, l.updated_at, l.created_at
FROM trade_post tp
CROSS JOIN LATERAL (VALUES
  (tp.lead_list_id, tp.lead_on_trade, tp.lead_bumped_at),
  (tp.want_list_id, tp.want_on_trade, tp.want_bumped_at)
) side(list_id, on_trade, bumped_at)
JOIN lists l ON l.id = side.list_id
WHERE side.on_trade AND (matchable l)
```

A want list in a row is always the row's open list (the lead, or `want_list_id`, check 3 of the drift script), so `tp.match_*` is its Open to. A sale list is only ever a lead.

**`postStateSql(alias, field)`** gives a list's value for `feedListColumns`. It reads the side of the row `postRowSql` names (the lowest row the list leads, else the lowest it is the want list of):

- `bumpedAt` is the side's bump when the list is in a row, else the list's own;
- `matchHave` and `matchSale` are the row's for a want list whose side is on Trade (a want list in a row is always its open list), else the list's own;
- `takesSwaps` is the row's for a sale list whose side is on Trade (a sale list is only ever a lead), else the list's own.

This is `onTradeSql`'s type rule. Without it, a have or sale lead would take its want list's Open to, and a want list in a sale-led row would read `takes_swaps` true, where its own is always false (`lists_takes_swaps_sale_only`). The fallback keeps lists read off Trade (staff posts, chat post cards) exactly as today, including after an off-Trade `list.edit` (decision 3).

| Reader | Today | After |
| --- | --- | --- |
| `postsCte` `on_trade` (`feed/query.ts:17-22`): every feed read, `counts.ts:26`, `hidden.ts:92`, `candidates.ts:69-71`, the worker's `pairs.ts:46-47` | `lists WHERE discoverable` | `onTradeSql`; the rest of `postsCte` and `listedCte` unchanged |
| `feedListColumns` (`feed/entries.ts:19-38`): `posts.ts:102`, `mine.ts:25`, `feed/shared.ts:30, 47`, `post-cards.ts:45, 162` | `lists.matchSale`, `matchHave`, `takesSwaps`, `bumpedAt` | `postStateSql("lists", …)` for those four; the other columns unchanged |
| `fetchOwnTradeLists` (`mine.ts:23-28`) | `discoverable = true` | the list has a side on Trade (`EXISTS` over its rows) |
| `candidates.ts` `partner_lists` (`:87-97`) | `lists l WHERE l.discoverable …` with `l.match_*` and `l.takes_swaps` | `FROM on_trade l`, the CTE already in its `WITH`, so the partner's Open to is the post's |
| Worker `want-alerts/pairs.ts` `cand` (`:49-58`) | `JOIN lists l … WHERE l.discoverable` with `l.match_*` and `l.takes_swaps` | `JOIN on_trade l`. The pair's other side (`wl`, `ol`), the recipient's own lists, stays on `lists`. |

**Why each returns what it returned.** Given drift checks 1 (every on-Trade list is in a row), 2 (no list in two rows) and the two new checks (E), `onTradeSql` returns exactly the rows `lists WHERE discoverable AND matchable` returned, with the same values. By the same checks, and by its type rule, `postStateSql` returns each list's own values. So every feed page, count, cursor, candidate set, match count, alert pair and cached value is the same. The cached shapes do not change (decision 11). Task 10.3 proves it by a byte comparison.

### 8. Readers that stay on `lists`

| Reader | Why it stays |
| --- | --- |
| Every list-level `discoverable` reader in Context (Marketplace, offers and picker, `visibleOnTrade`, chat cards, `hidePartner`, the list page, the worker's newly discoverable set) | It asks about the list, not a post. With at most one post per list, "on Trade" and "on Trade in its post" are one value. Owner question 1 decides what this means later. |
| The viewer's own Open to and `takes_swaps` (`recount.ts:44, 77-79`, `viewer.ts:73-81`, `candidates.ts:72-85`, `want-alerts/context.ts:22-23, 33-34`, the `wl` and `ol` sides of `pairs.ts`) | The viewer's lists count on or off Trade, with the list's own Open to (`show-open-to-off-trade`). The viewer side becomes per post only in `trade-post-reads-by-row`. |
| `personBumpedAt`, `lastBumpOf`, `PublicList.bumpedAt` (`read.ts:140, 206`) | Per person or per list. `trade-post-state-contract` moves the first two to the rows. |
| `fetchHiddenPosts`' link `CASE` (`hidden.ts:128-129`) | `trade-post-hides-by-row`, written in parallel, rewrites this read to return the row. Leaving it avoids a conflict. |
| `openToColumns`, `takesSwapsColumn` (`edit.ts:24-46`), `resolveDiscoverable` | They are write guards on the list's own value. |
| `report.ts:73-80` (the report snapshot), `report-post.ts:21-25` | A snapshot of the reported lists, list-level. `trade-post-reads-by-row` takes the post's view. |

### 9. The drift script

These go into `CHECKS` and must read zero after the reconcile (decision 12):

5. **"a row whose Trade state or bump differs from its lists (row ids)":**

   ```sql
   SELECT tp.id FROM trade_post tp
   JOIN lists o ON o.id = tp.lead_list_id
   LEFT JOIN lists w ON w.id = tp.want_list_id
   WHERE tp.lead_on_trade <> o.discoverable
      OR tp.lead_bumped_at IS DISTINCT FROM o.bumped_at
      OR tp.want_on_trade <> coalesce(w.discoverable, false)
      OR tp.want_bumped_at IS DISTINCT FROM w.bumped_at
   ```

6. **"a row whose Open to or takes_swaps differs from its lists on Trade (row ids)":**
   - the open list is on Trade and either Open to differs;
   - or the lead is a sale list on Trade and `takes_swaps` differs;
   - or the lead is not a sale list and `takes_swaps` is true.

Check 5 also covers a want side left on by a want list deleted outside `writePosts` (`w` null, `want_on_trade` true). The header comment says that checks 5 and 6 hold only while a list is in at most one row, and that `trade-post-planner-shared` rewrites them.

### 10. Tests: pure modules only

- **`trade-post-rows.test.ts`.**
  - `postStateOf`: a have lead alone, a pair, a Buy post, a sale lead with and without swaps, and a want side off Trade.
  - `planPostWrite`'s `states` and insert state for each row of the table in decision 6, and for no change (empty `states`).
- **`trade-post-rows.model.test.ts`.**
  - Each model list gains `bumpedAt`, from a step counter that the turn-on and bump writes set, as `tradeColumns` and `bumpPerson` do.
  - Each row in the rows world carries its state.
  - After every write, every row must satisfy E in full (decision 4 sets off-Trade Open to too).
  - The transitions are unchanged. A bump transition is added, at a low rate.
  - Task 1.4 breaks `postStateOf` on purpose and checks that the test fails.
- **`trade-sql.test.ts`** pins `onTradeSql`'s and `postStateSql`'s text, as it pins `postRowSql`'s.

No test touches the database. SQL is proven by local runs (task groups 6 and 10).

### 11. Caches, `/rpc` and `/api/v1`

- **No cached value changes shape or meaning.** The feed's post entries (`trade:post:4`), the rankings (`trade:mutual-people:10`, `trade:mutual-count:9`, `trade:oneway-people:6`, `trade:person:10`) and the people order (`trade:people-order:3`) hold the same values (decision 7). So no key moves. Any task that changes a cached field instead bumps its key, per `docs/trade.md`, Cache versions.
- **Inputs and outputs.** No input changes. Every output is computed from equal values, `PublicList` and feed posts on `/api/v1` included.

### 12. Migrations, locks and deploys

**Migration A, `trade_post_state`.** It is generated from `schema.ts` and should hold seven `ADD COLUMN`s and one `ADD CONSTRAINT … CHECK`. Three things are added by hand:

1. At the top, the `lock_timeout` line of `20261115125616_drop_linked_list_id`, with its comment.
2. At the end, the backfill: an `UPDATE trade_post tp SET <the seven columns> FROM trade_post r JOIN lists o … LEFT JOIN lists w … WHERE tp.id = r.id`, with values by `postStateOf`'s rule, written as SQL. It uses the same rule as check 5 and check 6, but in full.
3. A comment on the backfill: the build that is live when it runs keeps writing `lists` only, so the reconcile re-runs it.

| Statement | `trade_post` | `lists` | Work |
| --- | --- | --- | --- |
| 7 × `ADD COLUMN`, constant defaults | ACCESS EXCLUSIVE | none | catalog only, no table rewrite (PostgreSQL 11 and later) |
| `ADD CONSTRAINT … CHECK` | held | none | scans about 1,400 rows |
| backfill `UPDATE` | held, row locks | plain reads, no locks | about 1,400 rows |

- **No deadlock with the live build.** Its writers lock `lists` rows and then write `trade_post`; `deleteList` writes `trade_post` before its `DELETE` of the list (`edit.ts:145-151`). The migration's first statement takes `trade_post` while it holds nothing, so it waits for any writer already holding `trade_post` rows to commit; that writer needs nothing the migration holds. After that the migration only reads `lists` (ACCESS SHARE, which no row lock or `DELETE` blocks), so it waits on nothing a writer holds, and writers that reach `trade_post` wait for it.
- **Readers wait.** Feed and match readers of `trade_post` queue for the sub-second transaction. `lock_timeout` stops the migration from queueing them behind a long transaction.

**Migration B, `trade_post_state_reconcile`.** It is a custom migration (`drizzle-kit generate --custom`, `packages/db/AGENTS.md`) and holds:

1. the `lock_timeout` line;
2. `LOCK TABLE lists IN EXCLUSIVE MODE`;
3. migration A's backfill again.

**Why EXCLUSIVE, not SHARE.** The lock must freeze the `lists` values the `UPDATE` reads: deploy A's writers commit list and row changes together, and an `UPDATE … FROM lists` that waited on a row lock could write values from before that commit. SHARE would deadlock:

- `deleteList` holds `lists` rows `FOR UPDATE` (ROW SHARE on the table) and has written its `trade_post` rows;
- SHARE does not conflict with ROW SHARE, so the migration gets it;
- `deleteList`'s `DELETE` then needs ROW EXCLUSIVE and waits on the migration, while the migration's `UPDATE trade_post` waits on `deleteList`'s rows.

Taking `trade_post` first instead deadlocks against `savePost`, which writes `lists` before `trade_post`.

EXCLUSIVE conflicts with ROW SHARE. Every writer of `trade_post` starts with `lockTradeLists` (`FOR UPDATE`): `writePosts` through `lockPosts`, `anonymizeUser`, and `bumpPerson` after decision 5. So EXCLUSIVE waits for in-flight post writers to commit and stops new ones at their first statement, before they touch `trade_post`. When it is granted, no transaction holds a `trade_post` row lock that a post writer took, and the `UPDATE` waits on nothing. An offer insert's `KEY SHARE` on a `trade_post` row (`offer.post_id`) does not conflict with an `UPDATE` of non-key columns.

The cost: for the sub-second run, EXCLUSIVE also holds every write to `lists` and every foreign-key check against it (`list_entries`, `offer`, `hidden_trade_post` inserts take `KEY SHARE`, which needs ROW SHARE). Plain reads go on. `lock_timeout` (3 s) bounds the wait for in-flight writers.

The reconcile needs no time window, unlike offer-post-id's. While a list is in at most one row, a row's state is a function of its lists, so re-running the backfill is right for every row, whoever wrote it.

**Deploys:**

1. Migration A, then web A. The worker is not rebuilt: it writes none of these columns, and its reads stay on `lists` until B.
2. With the owner's go-ahead, a read-only production drift run. Checks 5 and 6 count the rows of people who have not written since migration A: information, not a failure.
3. Migration B. Then the drift run again: all six checks must read zero. **This is the gate for B,** because from B on, the feed reads the rows.
4. Web B, and worker B, built on the VPS from the same commit, since the worker gets `postsCte` through `@repo/api` (`pairs.ts:2`). Either may come up first, because the rows equal the lists.
5. The drift run once more.

**Rollback:**

- Web B or worker B can go back to A at any time: A reads `lists`, and B still writes them.
- Before migration B, web A can go back to any earlier build.
- After migration B, A is the floor. An older build writes `lists` only, the rows go stale, and nothing re-runs the reconcile. Going lower then needs a new reconcile migration before B is deployed again.

### 13. Indexes

- **No index on `trade_post` for the new columns.** At about 1,400 rows, `onTradeSql` reads every row whatever the index, and lookups by list id use `trade_post_lead_list_id_idx` and `trade_post_want_list_id_idx`. Per the partial-index rule, an index goes in only on EXPLAIN evidence; task 10.5 records the plan.
- **`lists_trade_discoverable_idx` and `lists_trade_feed_idx` stay.** Whether anything uses them after B is checked by EXPLAIN locally (task 10.5) and on production read-only (task 11.3), and the contract change decides their fate from that.

## Risks / Trade-offs

- **[From B on, the feed reads the rows.]** A writer bug that writes a wrong state would change posts for everyone.
  → Mitigations:
  - E is asserted after every random write in the model test;
  - the local write pass runs the drift script after every step;
  - production must read zero on all six checks before B.
- **[Rows written by a build older than A after migration B.]**
  → A is the rollback floor, recorded in the rollout. Checks 5 and 6 show the stale rows.
- **[Off-Trade Open to on a row goes stale after `list.edit`.]**
  → Nothing reads it, `postStateSql` falls back to the list's own, and the next post write repairs it. The contract change must not read it without the owner's answer to question 3.
- **[`bumpPerson` gains a transaction and a lock.]**
  → +3 statements on a once-a-day action, and the same lock every post writer takes, so it adds no new lock order.
- **[Migration B blocks every `lists` write and foreign-key check for its run.]** Sub-second at today's size, with the 3 s `lock_timeout`. If the lock is not granted in time, the migrate transaction rolls back whole and the owner reruns it at a quiet time.
- **[`trade-post-hides-by-row` also migrates `trade_post`.]** If both run `db:generate` from one snapshot, the second snapshot lacks the first change's columns.
  → Task 2.2 generates only after the other change's migration is in the tree, if it landed first, and checks that the snapshot diff holds only this change's columns. Owner question 5.
- **[A cached value written by web A and read by web B.]** They are equal by E (decision 11).

## Migration Plan

As decision 12. In order:

1. Build groups 1 to 5 of the tasks.
2. Prove them locally (group 6).
3. The owner commits.
4. Migration A, web A.
5. Production drift, read-only.
6. Migration B.
7. Production drift: zero on all six checks.
8. Web B and worker B.
9. Production drift.

## Inputs for later phases

- **`trade-post-planner-shared` turns the derivation around.**
  - `planPost` states each row's state from the composer's choice, so a list's two posts can differ.
  - `lists.discoverable` is then derived from the rows (on Trade in some post), or replaced (owner question 1).
  - Checks 5 and 6 become "a list's own flag agrees with its rows".
  - `postStateOf`'s rule becomes "a list moving into a row brings its old row's side state" (decision 6).
- **`trade-post-state-contract`, after that change:**
  - drops `lists.bumped_at` and moves `personBumpedAt` and `lastBumpOf` to the rows;
  - decides `lists_trade_feed_idx` and `lists_trade_discoverable_idx` from tasks 10.5 and 11.3;
  - uses a no-op migration first, then the drop, as `trade-post-contract` and `trade-post-drop-link` did.

  Open to and `takes_swaps` never leave `lists`.
- **`trade-post-reads-by-row`:**
  - builds posts from rows on `onTradeSql`, which already yields one row per side;
  - moves the viewer side (`recount`, `viewer.ts`, `my_want`), `staffPosts`, the report snapshot and `fetchHiddenPosts`' `CASE` to per-post state.
- **`context.ts` reads both lists of a pair from `lists`.** Decision 8's table lists it as reading only the recipient's side, but `loadContext` (`apps/worker/src/job/want-alerts/context.ts`) loads both lists of every pair, so the partner's `sale` (from `takes_swaps`) and `wantsSwaps` (from `match_have`) come from `lists` and `judge` uses them (`lib/want-alert-match.ts`). They agree with the rows while a list is in at most one row; `trade-post-planner-shared` must move the partner half to the row. Found in the group 12 review, 2026-11-20.

## Assumptions and unverified facts

- **From PostgreSQL's documentation, not run here:**
  - `ADD COLUMN … NOT NULL DEFAULT <constant>` changes only the catalog in PostgreSQL 11 and later;
  - CHECK constraints are evaluated on rows that an `ON DELETE SET NULL` action updates (decision 1);
  - a data-modifying CTE's sibling statements see one snapshot and see each other's changes only through `RETURNING` (decision 5).
  - lock-mode conflicts in decision 12: SHARE does not conflict with ROW SHARE, EXCLUSIVE does, and `FOR KEY SHARE` from a foreign-key check needs ROW SHARE;
  - that an `UPDATE … FROM lists` which waited on a `trade_post` row lock can write `lists` values from before the wait, which is why migration B locks `lists` at all.
- **Not re-run:** production's 1,363 rows and drift at zero, from 2026-11-15.
- **Read in code, not executed:**
  - that no writer of the five columns exists beyond Context's list (grep of five source trees);
  - that a timestamp string from a `mode: "string"` column written back as `timestamptz` round-trips exactly (task 6.3 checks it locally).
- **Not checked:** whether `lists_trade_feed_idx` and `lists_trade_discoverable_idx` are used today (tasks 10.5 and 11.3).

## Open Questions

Answered by the owner on 2026-11-20: every recommendation below is taken. That means (a) for questions 1 and 2, yes for 3 and 4, and the regenerate rule for 5.

1. **`lists.discoverable` after the chain.** (a) It stays as the list's "on Trade in some post", derived from the rows by `writePosts`. (b) It is replaced by an `EXISTS` over the rows in about 20 readers, with new partial indexes on `trade_post`. **Recommend (a):** its readers ask about the list (the Marketplace, offers, chat cards, the list page), and one writer keeps it under the person's lock.
2. **Reader switch now or in change 4.** (a) As written: two deploys, with the reader switch here and a byte-identical proof. (b) Only migration A and deploy A here. The reconcile moves into `trade-post-reads-by-row`'s migration and the switch into its rewrite, so this change is one deploy. **Recommend (a):** change 4 then only changes how posts are built, and a failure in either change points at one cause.
3. **Off-Trade Open to on a row.** Accept that a row's copy follows `list.edit` only at the next post write (decision 3)? **Recommend yes.** When a taken-down post is posted again, the composer writes Open to from the list anyway.
4. **`bumpPerson` under the lock (+3 statements, decision 5).** **Recommend yes.**
5. **Migration order with `trade-post-hides-by-row`.** **Recommend:** whichever change is applied first generates first, and the second regenerates its migration on top, with no hand-merged snapshots.

## As built

Part A, groups 1 to 5, built on 2026-11-20 from `6567a9c1`, uncommitted.

- **Task 1.4, the model test against broken rules.** The model test asserts equation E written out by hand, apart from `postStateOf`, so a broken rule cannot pass by changing both sides.
  - `wantOnTrade` left true with no want list (`want?.discoverable ?? true`): fails at seed 1, step 6.
  - `matchHave` taken from the lead (`lead.matchHave`): **passes.** It cannot be seen. A have or sale list's Open to is always both (`resolveOpenTo`), and a pair's want list is never Buying only (`pairRefusal`), so a have- or sale-led row's want side always swaps, as its lead does. The mutant is equivalent in every state the writers can reach.
  - `matchSale` taken from the lead (`lead.matchSale`), the observable twin: fails at seed 2, step 4. So does taking both from the lead.
  - The unit test kills that survivor. Its pair case gives the want list `matchHave: false` and `matchSale: false` beside a lead with both true, so a rule reading either flag from the lead fails there. That state is reachable only in a pure test.
  - Restored, the model test passes. Over 1,000 runs, every transition reaches its floor of 100. The lowest is `swapWant` at 113, and the new `bump` transition reaches 664.
- **`PostRow.state` is required.** The model's legacy world keeps rows without state and passes them to the pairing functions through a cast. The unit test's `row()` gives the column defaults.
- **`planPostWrite` returns `PostWriteOps`**, a type of its own (`PostRowOps` with `state` on each insert, plus `states`), so `planPostRows` and `relead` are unchanged.
- **Migration A is `20261120072416_trade_post_state`.** Its `lock_timeout` comment names `trade_post` in place of `lists`, since `trade_post` is the table this migration queues readers behind. The line itself is unchanged.

- **Task 5.1.** `bun run check` passes (27 tasks; `@repo/api` lint keeps one warning that was already there, in `serial-anchored.ts`), and so does `bun run build --filter=web`. The grep for `lead_on_trade|leadOnTrade|want_on_trade|wantOnTrade` finds only the planner and its two tests, `lockPosts` and `writePosts` in `services/list/shared.ts`, and the drift script. No reader yet.
- **Not yet run against a database:** `lockPosts`' nested read, the states `UPDATE … FROM unnest`, the bump CTE, the backfill and checks 5 and 6. Group 6 is their first run. `lockPosts` relies on Drizzle returning `row: null` for a list that leads no row; drizzle-orm 1.0.0-rc.5 does this when every column of a left-joined nested object is null (`utils.js`, the result mapper).
- **Task 6.1, local migrate and drift (2026-11-20, approved by the owner).** `.env.local` pointed `DATABASE_URL` at `localhost`. `db:migrate` applied `20261120072416_trade_post_state` (migrations applied successfully, exit 0). The read-only drift run read 411 rows in `trade_post`, all six checks at 0 and both notes at 0 ("in step", exit 0).
- **Tasks 6.2 to 6.4, the local write pass (2026-11-20, approved by the owner).** The dev server ran on `.env.local`, where `DATABASE_URL` and `REDIS_URL` both point at `localhost`, on port 3200 (`SITE_URL`'s port). `browser-use` drove it in two isolated contexts of the automation Chrome, one for `localtest1` and one for `localtest2`. Each signed in through `fetch('/api/auth/sign-in/email')` from a loaded page, so no form was submitted and no credential reached a URL or the dev-server log; a grep of the log afterwards found none. Each write was a `fetch` to the `/rpc` procedure the composer, list form and Bump button call (`trade.savePost`, `trade.takeDownPost`, `trade.bump`, `list.create`, `list.edit`, `list.delete`), from the signed-in page, not clicks through the composer UI.
  - **6.2, the record.** The two accounts' 15 have, sale and want lists (Trade state, Open to, `takes_swaps`, `bumped_at`, `updated_at`), their 10 `trade_post` rows with all seven state columns, and the offers and hides that point at them, were saved as JSON outside the repo before any write. Offers point only at localtest2's rows 1000303 and 1000304, which no step re-ids.
  - **6.3, the steps.** After each one, the read-only drift run gave **0 on all six checks**, and the row query showed each row's state equal to its lists', bumps to the microsecond:
    1. Swap pair (spares 2 + lt1 paired wants, already paired off Trade): row 1000302 both sides on, both bumps equal to the lists' `2026-11-20 07:52:02.070469+00`. The bump time is now: localtest1's last bump was more than 24 hours old.
    2. Sell with Also open to swaps (lt1 sale off + lt1 sale wants): row 1000461 on with `takes_swaps` true and `match_sale` false (Swaps only), and the turn-on took the bump from step 1 (the 24-hour rule). Then the edit to Sell only (`unpair`): the `saleSwaps` write set `takes_swaps` false on the row; the dropped want list went off with no row.
    3. Buy, Buying only (lt1 off trade): new row 1000463, `match_have` false.
    4. Swapping the Swap post's want list for a new list (`tps want`, 13404): row 1000302 kept its id with the new want list. The dropped want list goes off and gets no row: `planPost` unlinks a list an edit drops and takes it off Trade, so this edit is a swap, not a split. The split with a new row came from editing the Swap post into a Buy post of its want list: the want list got new row 1000464 (Buying only), and 1000302 kept the have list alone, off. Take off, then the Swap post again, merged them back into 1000302 (neither was on Trade before the write, so the lead's row stays) and deleted 1000464.
    5. Take off Trade: 1000302 both sides off, bumps and Open to kept. Posted again without "also pay": back on, with `match_sale` false on the row.
    6. A lone have list paired with an off-Trade want list (take off, then a Swap post of spares 2 alone): 1000302 lead on, want off, the want side's bump kept.
    7. Bump: localtest1 was refused `trade_bump_too_soon` (its turn-ons set its last bump today, the refusal path unchanged). localtest2's bump set `bumped_at` on its seven lists and both sides of its paired rows 1000303 and 1000304 to `2026-11-20 07:54:07.095672+00`, equal to the lists'.
    8. Open to saved through `list.edit` on `tps want`, off Trade and paired: the list's `match_sale` went to true, and row 1000302 kept `match_sale` false. Drift read 0: check 6 skips off-Trade sides (decision 3).
    9. The takeover: `list.create` of an unbound have list (`tps have`) paired with `tps want` made row 1000465 (lead off, want off): an unbound have list cannot go on Trade, so the create does not turn its partner on. That write also re-derived row 1000302's state from its lists. A Swap post of `tps want` alone put the want side on, with the lead off: "want on, lead off". Deleting `tps have` let `tps want` take over row 1000465 with its own state, keeping the id.
  - **Restore.** Through the app: `tps want` deleted (its row went with it), the Swap pair of spares 2 and lt1 paired wants and the Sell pair re-made and taken off Trade (both back in rows 1000302 and 1000461), and lt1 off trade taken off. Then, in one local SQL transaction, every recorded list's state, `bumped_at` and `updated_at` and every recorded row's state were written back, and the leftover row 1000463 was deleted. The re-read of lists and rows is byte-identical to the record, so are the offer and hide references, and drift reads 0. The two lists the pass created (13404, 13405) are deleted; they had no entries.
  - **6.4, before and after.** Screenshots, and each page's text, before step 1 and after the restore: Browse and For you as localtest1 (My posts is the Your posts strip on Browse), both person pages, and Browse as localtest2. The person page of localtest1 is identical, pixel for pixel. localtest2's Browse text is identical. The rest differ only in what changes between loads:
    - a presence dot ("Online"), since localtest2 was signed in during the after pass;
    - the My trades count badge, which loads after the page;
    - one tile row showing one more tile in place of "+1";
    - the end of localtest1's Browse. The page is virtualized, and the after capture rendered three people and then "No more posts". Scrolling showed sellingselling, lcvelettzr and the others, and `trade.people` as localtest1 returned nine people with no next cursor.

    No post, list, tag, bump label or count changed. Group 10 makes the byte comparison.

- **Rollout A (7.1 and 7.2), 2026-11-20.** Part A was rebased onto main as `2f107ab3` and pushed together with three web fixes (`bff1b816..2f107ab3`). Docker CI/CD run 44703980434 succeeded. The owner ran the migrate, then brought up web A. The worker was not rebuilt. Exact times for the migration and for web A serving were not recorded: drizzle's `created_at` holds the folder's timestamp, not the time the migration was applied. The read-only production drift run after the deploy read 1,556 rows, and all six checks were 0, including checks 5 and 6, so no one wrote in the gap between the migrate and web A. The informational note listed 9 offers on a list that leads a row with no post id (8634, 8660, 8665, 8726, 8753, 8797, 8889, 8934, 9523), the same 9 as before the deploy. At that read, the latest bump on any row (08:27:53 UTC) was earlier than the push. The owner skipped the post-deploy smoke test, so no write by web A had been seen on production.
- **Part B, groups 8 and 9 and task 10.1 (2026-11-20, approved by the owner; uncommitted, on `2f107ab3`).**
  - **10.1, before any group 8 change.** `reads.ts` was run on part A's code, unedited. It refuses to start unless the `DATABASE_URL` and `REDIS_URL` hosts are local. It runs its reads against Redis database 14, which it empties first, so no cache another build or worktree wrote answers a read. It fixes JS `now` (`Date`) at 2026-11-20T12:00Z and writes every object with its keys sorted. Postgres `now()` is not fixed: it moves the 30-day idle cut and the 24-hour bump window. A read-only count on 2026-11-20 (per list, so a post sharing a fresher partner reads later) found no on-Trade list within 3 days past the cut and one within 7 days before it. The nearest goes idle in 5 days 8 hours, so 10.3 must run before about 2026-11-25 16:00 UTC. After that, a diff confined to posts that crossed the idle line is the baseline ageing, not a reader bug.
    - What it reads, as localtest1, localtest2 and signed out: `trade.people`'s first page for each type (all, WTT, WTB, WTS) and, when signed in, for Mutual off, Any and Mutual (`peopleFeed`, input through `peopleInputSchema`); `trade.myPosts`; `fetchTradeCandidates` for each filter (all, mutual, they have, they want), over `resolveTradeSides`; the worker's `fetchPairs` over all entries (97,100 pairs); and the post counts of `atom02-seoyeon-323z`, `binary02-seoyeon-360z` and `divine01-yooyeon-324z`.
    - What is sorted: candidates and pairs are sets, so they are sorted; the people pages keep the order the feed gives, which is part of what is compared.
    - Two runs gave byte-identical files of 21,593,669 bytes (`cmp`). The file is `/private/tmp/claude-501/trade-post-state/reads-before.json`, outside the repo; the script and `normalize.ts` are in `script/` beside it.
    - A read-only preview on part B's code, before migration B, showed one gap. Candidates' `theyHave` and `theyWant` come from `json_agg` with no `ORDER BY`, so a new plan returns the same rows in another order. `reads.ts` now sorts each candidate's arrays as well.
    - Applying that sort to the saved file is equivalent to re-running on part A's code, since order is all it changes. That is `normalize.ts`; `reads-before.raw.json` is the unsorted original.
    - The fixed script is deterministic: two runs on part B's code gave identical files. The normalized preview on part B's code, with the rows as migration A and the writers left them, equals `reads-before.json`. So 10.3 compares `normalize.ts` of `reads-after.json` with `reads-before.json`.
    - `apps/worker/.trade-post-state/` is not out of lint as the header says: worker lint reads it and fails `bun run check` on `reads.ts`. Git shows it as untracked too. The script lives outside the repo and is copied in only to run.
  - **Where the helpers live.** `onTradeRowsSql`, `sideOnTradeSql` and `postStateSql` are in `lib/trade-sql.ts`, so `trade-sql.test.ts` pins their text without importing `services/trade/lists.ts`, whose imports reach `@repo/db`. `lists.ts` exports `onTradeSql = onTradeRowsSql(matchableListSql("l"))`, and the test pins the body with a placeholder for the matchable condition. `fetchOwnTradeLists` filters on `sideOnTradeSql("lists")`, a helper the design did not name.
  - **8.6, what still reads the five list columns** (`packages/api/src` and `apps/worker/src`, tests left out). Every hit is a writer, the drift script, `onTradeSql` and `postsCte`'s own columns, or a reader in decision 8's table:
    - writers: `list/shared.ts`, `list/create.ts`, `list/edit.ts` (with its `openToColumns` and `takesSwapsColumn` guards), `trade/post.ts`, and `bumpPerson`'s statement;
    - per person or per list: `lastBumpOf` (`mine.ts`), `personBumpedAt` (`shared.ts`), `PublicList` and the list page (`list/read.ts`);
    - list-level `discoverable`: `visibleOnTrade` (`feed/shared.ts`), `market/aggregate.ts`, `offer/core.ts`, `offer/view.ts`, `offer/picker/{index,shared,theirs}.ts`, `chat/card-resolve.ts`, `trade/hidden.ts`, and the staff `discoverable` in `staffPosts` (`post-cards.ts`);
    - the viewer's own lists: `matches/recount.ts`, `feed/viewer.ts`, `candidates.ts`' `my_want` and `my_have`, and `want-alerts/context.ts`;
    - `want-alerts/index.ts`' newly discoverable set and `pairs.ts`' `wl` and `ol`;
    - the report snapshot (`moderation/report.ts`);
    - pure modules over values, not columns: `lib/*`, `want-alert-match.ts`, `want-alert-state.ts`.
  - **Migration B is `20261120085525_trade_post_state_reconcile`.** It holds the `lock_timeout` line, with its comment saying writers of `lists` queue behind it; `LOCK TABLE "lists" IN EXCLUSIVE MODE` with the comment of task 9.1; and migration A's `UPDATE` byte for byte. A second `db:generate` reports no schema changes.
  - **The baseline, taken again with the offer picker.** At the coordinator's request, `reads.ts` also reads `offer.suggest` (`suggestOffer`) both ways between localtest1 and localtest2, row and Mutual, without sorting, since its order is what a person sees (below). It was run twice on part A's code, in a scratch worktree of `2f107ab3` outside the repo (`git worktree add --detach`, removed after). The two runs gave byte-identical files of 21,616,061 bytes. That file is now the baseline:
    - `reads-before.json`, sha256 `a1675e0ab467af0d241603d71b46ba983118559b902a27affb520cd7cdc70d17`. `reads-before.raw.json` is the same bytes, since this script already sorts each candidate's arrays and `normalize.ts` changes nothing.
    - `reads-before.v1.json` and `reads-before.v1.raw.json` are the first baseline, with no picker reads.
    - The script's sha256 is `8e3b7481…e868`.
    - One run on part B's code, before migration B, is byte-identical to it (`reads-preview-B.json`), the four picker reads included, in their order.
    - 10.3 compares `reads-after.json` with `reads-before.json`; `normalize.ts` is a no-op on both.
  - **The Redis isolation held.** `reads.ts` and `explain.ts` read through local Redis database **14**, which they empty first; the coordinator accepted that local write. After the runs, database 14 holds only the script's cache keys and database 0, the shared one, 18 others. The first run printed no "emptying" line, so database 14 was empty before it.
  - **The indexer.** `.env.local` points `INDEXER_DATABASE_URL` at production with `default_transaction_read_only=on`, as on the local stack, so the match and picker reads check holdings against it, read-only. A transfer between 10.1 and 10.3 can change a match, so a diff in the holdings that matches rest on is not a reader bug.
  - **The order of a candidate's matches.** `fetchTradeCandidates` builds `they_have` and `they_want` with `json_agg` and no `ORDER BY` (`candidates.ts`, the `grouped` CTE), so their order is the plan's. That was already so before; part B's `on_trade` changes the plan. Where the order goes:
    - **Visible: the offer picker's preselected items.** `recount`'s `groupBySlug` (`lib/trade-rank.ts:145-153`, used at `:232` and `:274`) keeps first-seen order, so the order sets `theyHaveIWant` and `iHaveTheyWant` and each match's `partnerListIds`. `fillMatches` and `matchesThrough` (`lib/offer-prefill.ts:84-125`) filter and keep that order. `suggestOffer` builds `chooseMatchPicks`' input in it (`services/offer/picker/index.ts:277-290`), and `pick` (`lib/offer-prefill.ts:44-49`) takes one copy per match in that order and cuts at `OFFER_SIDE_LIMIT` (200). So the order of the preselected items in Make offer, and which ones a cut past 200 leaves out, follow it. The returned `picks` are not sorted again.
    - **Set-only:** `chooseList` → `oneListOf` (`lib/offer-recipient-rules.ts:289-304`) counts matches per list and breaks ties by the candidate lists' order, which comes from a separate read. `personMatch` sorts both sides by slug (`matches/index.ts:43`). The people pages carry counts, and they were byte-identical.
    - **What was done.** Per the coordinator's first answer (a), `candidates.ts` was left alone at first, and the picker's output for localtest1 and localtest2, both ways, row and Mutual, was compared in order on part A's and part B's code: identical. These are small (2 and 4 items), so a larger picker could still reorder once under part B's plan, as it could under any plan change before.
  - **`they_have` ordered, by the owner's decision of 2026-11-20.** An Opus review of part B returned "proceed", with one finding to fix: `they_have`'s `json_agg` had no `ORDER BY`. The owner decided to order it in part B, accepting a one-time change in the order of Make offer's preselected items (and which fall past `OFFER_SIDE_LIMIT`), then stable for good. `candidates.ts`' `grouped` CTE now aggregates `they_have` `ORDER BY collection_slug, list_id, objekt_id NULLS LAST, trade, sale`.
    - That is the order `they_want` already has. Its `json_agg(DISTINCT jsonb …)` sorts the objects in jsonb order: with equal keys, jsonb compares values key by key in its storage order (shorter keys first), so slug, then list id.
    - Slug first gives the prefill in collection order, as `personMatch` sorts its sides (`matches/index.ts:43`), and `recount`'s `groupBySlug` keeps it.
    - The key covers every field the object emits, so two rows that tie emit identical JSON, and the order is total over what reaches the picker.
    - `they_want` is unchanged. No test pins this SQL.
    - **10.3's picker comparison.** `reads.ts compare <before> <after>` requires every read to be byte-identical, except the four `offer.suggest` reads. Those must be identical, or else hold the same `give` and `get` items with every other field equal, reported as "order only". This one-time order difference is accepted. The candidate reads were already compared as sets (`reads.ts` sorts each candidate's arrays), so the new `ORDER BY` does not move them. Self-test: reversing one picker side passes as "order only"; dropping one pair fails. `script/reads.ts` sha256 `0e081907…3748`.
  - **10.5, the "before" half (part A's code, read-only on the local database, `EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF)`).** Saved as `/private/tmp/claude-501/trade-post-state/explain-before.txt`, by `script/explain.ts`.
    - `postsCte`'s people read (`fetchBumpPeople`, signed out, all types): `on_trade` is a bitmap scan of `lists` through **`lists_trade_feed_idx`** (505 index rows, 439 kept). `trade_post` is read by a sequential scan (411 rows) for the pairing, and by `trade_post_lead_list_id_idx` for the folded-want check (110 loops).
    - The market's `countedListings` (a per-slug count): a bitmap scan of `lists` through **`lists_trade_feed_idx`** too (166 sale lists kept).
    - `lists_trade_discoverable_idx` appears in neither plan.

- **10.2, 10.3 and 10.5's "after" half (2026-11-20, approved by the owner; local only).**
  - **10.2.** `DATABASE_URL` and `REDIS_URL` both pointed at `localhost`. `db:migrate` applied `20261120085525_trade_post_state_reconcile` (migrations applied successfully, exit 0). The read-only drift run then read 411 rows, **0 on all six checks**, both notes 0, "in step".
  - **10.3.** `reads.ts` on part B's code, uncommitted, with `they_have` ordered, gave `reads-after.json`: 21,616,061 bytes, sha256 `a1675e0a…0d17`, the same as `reads-before.json`. `reads.ts compare reads-before.json reads-after.json` reported "in step", with no key order-only, and `cmp` finds the files byte-identical.
    - So every people page, My posts, the candidates, the 97,100 alert pairs, the collection counts and the four offer-picker reads (2 and 4 items, in order) are unchanged.
    - The picker reads kept their order, since the `ORDER BY` the order rule set (slug, then list id) is the order these few items already came in.
    - Both files stay in `/private/tmp/claude-501/trade-post-state/` until the owner has seen the result; delete them after.
  - **10.5, before and after** (`EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF)`, read-only on the local database; `explain-before.txt` on part A's code, `explain-after.txt` on part B's after migration B):
    - **`postsCte`'s people read.** Before, `on_trade` was a bitmap scan of `lists` through `lists_trade_feed_idx` (505 index rows, 439 kept). After, it is a sequential scan of `trade_post` (411 rows), a VALUES scan of its two sides (about 1.07 kept per row), and an index scan of `lists_pkey` per side (441 lookups, 439 kept). `lists_trade_feed_idx` no longer appears. The pairing join and the folded-want check read `trade_post` by sequential scan; the latter used `trade_post_lead_list_id_idx` before and a hash join now.
    - **The market's `countedListings`.** Unchanged, still on `lists`: a bitmap scan through `lists_trade_feed_idx`, 166 sale lists.
    - **`lists_trade_discoverable_idx`** appears in no plan, before or after.
    - **For `trade-post-state-contract`.** After part B, `lists_trade_feed_idx` serves the market (its `discoverable` predicate) and no feed read; `lists_trade_discoverable_idx` serves neither. At 411 rows a sequential scan of `trade_post` is the plan, as decision 13 expected. Production's `EXPLAIN` (11.3) decides.
- **10.4, the local write pass on part B (2026-11-20, approved by the owner; part B's code uncommitted, migration B applied locally).** The setup was as in 6.3: `DATABASE_URL` and `REDIS_URL` both on `localhost`; the dev server on port 3200, started and stopped by this pass; two isolated `browser-use` contexts, each signed in through `fetch('/api/auth/sign-in/email')`. The record taken before step 1 is byte-identical to 6.2's.
  - **How each step ran.** Every write went through the `/rpc` procedure the composer, list form and Bump button call: no write used the composer UI. After each write the read side was loaded in the real UI and read from the page:
    - Browse, as localtest1, with My posts expanded in the pass's own context;
    - For you;
    - localtest1's person page, as localtest1 and as localtest2.
  - **The feed skips a post with no entries** (`assemblePost` returns null, `feed/posts.ts:166`), and most of these fixture lists are empty. So the post a step wrote shows in My posts (`trade.myPosts`, which part B switched to `sideOnTradeSql` and `postStateSql`) and in My posts' count, not in Browse's or the person page's rows. Those pages were checked for not changing, and for localtest2's bump.
  - **The steps.** Drift read **0 on all six checks after every step**:
    1. Swap pair (spares 2 + lt1 paired wants): row 1000302 both sides on. My posts went from "3 listed" to "4 listed", with "WTT WTB · Offering spares 2 · Looking for lt1 paired wants · Would also pay", "Bumped 1 minute ago" and "Next bump in 24 hours".
    2. Sell with swaps, then Sell only:
       - with swaps, "WTS WTT · lt1 sale off · Looking for lt1 sale wants · Also on Market", with no WTB since that want list is Swaps only (`match_sale` false on the row);
       - Sell only, "WTS · lt1 sale off" alone, the row's `takes_swaps` false.
    3. Buy, Buying only: new row 1000466, "WTB · Looking for lt1 off trade", with no WTT (`match_have` false).
    4. The want list swapped for a new `tps want` (13406): "spares 2 · Looking for tps want", and lt1 paired wants left. Then the split into a Buy post (new row 1000467, "WTB · Looking for tps want", spares 2 off and gone from My posts). Then take off and re-pair: merged back into 1000302 and listed again.
    5. Take off Trade: the post left My posts ("5 listed"), and its row kept its bumps and Open to. Posted again without "also pay": "WTT · spares 2 · Looking for tps want", with no WTB and no "Would also pay" (the row's `match_sale` false).
    6. Lead on, want off: "WTT · spares 2" with no "Looking for", the want side's bump kept.
    7. Bump:
       - localtest1 was refused `trade_bump_too_soon`, as before;
       - localtest2's bump set both sides of rows 1000303 and 1000304 to its lists' time;
       - localtest1's Browse, which reads the bump from the rows' sides, changed localtest2's row from "Bumped 4 days ago" to "Bumped now".
    8. Open to saved through `list.edit` on `tps want`, off Trade: the list's `match_sale` went true and the row's stayed false. My posts did not change ("WTT · spares 2", its want side off). Drift read 0, as check 6 skips off-Trade sides.
    9. The takeover:
       - an unbound `tps have` was created, paired with `tps want`, in row 1000468, with the lead off;
       - a Swap post of `tps want` alone gave "want on, lead off", shown as "WTT WTB · Looking for tps want · Would also pay";
       - deleting `tps have` let `tps want` take over row 1000468, which kept its id, with the post unchanged.
  - **Make offer.** As localtest2 on localtest1's person page, Make offer opened the builder on "lt1 idntt wants". It preselected, under You give, DoHyung A26 222Z, SunJae A26 221Z, SunJae A26 222Z, SeongJun Sp26 211Z. That is slug order (`autumn26-dohyung-222z`, `autumn26-sunjae-221z`, `autumn26-sunjae-222z`, `spring26-seongjun-211z`), one list each, the same as `offer.suggest` returned.
    - That side comes from `they_want`. The `they_have`-fed side (You get) cannot be opened in the UI here: localtest2 does not take messages, so localtest1 has no Make offer on its row.
    - Through `offer.suggest`, localtest1 to localtest2, row and Mutual, You get was `autumn26-dohyung-222z`, then `autumn26-sunjae-221z`: slug order, as in the 10.1 baseline.
  - **Restore.** Through the app: `tps want` deleted, the two pairs re-made and taken off, lt1 off trade taken off. Then the local SQL restore of the recorded state, `bumped_at` and `updated_at`, and row states; it deleted the leftover row 1000466.
    - The re-read of lists and rows is byte-identical to the record, and so are the offer and hide references. Drift reads 0.
    - The UI read after the restore matches the baseline: both person pages are identical, For you differs only by a presence dot, and My posts is back to "3 listed · Bumped 5 days ago".
  - **No credential leaked.** No password, email or sign-in GET appears in the dev-server log, and none was submitted through a form.
- **10.6.** `bun run check` passes (27 of 27 tasks; every suite 0 fail; `@repo/api` lint keeps one warning that was already there, in `serial-anchored.ts`), and so do `bun run build --filter=web` and `bunx oxfmt --check`.
- **12.1, the agent docs (2026-11-20, approved by the owner).**
  - `packages/db/AGENTS.md`, Trade posts, now says:
    - each row holds its sides' Trade state and bumps and the post's Open to and `takes_swaps`, kept equal to its lists while a list is in at most one row, and read by the reads that build posts, with a pointer to `packages/api/docs/trade.md`;
    - which two migrations did it;
    - in bold, that no web or worker build older than `2f107ab3` may run once `trade_post_state_reconcile` has run.
  - `apps/worker/AGENTS.md`, Want alerts: a partner list's state comes from `on_trade`, and the recipient's own lists read `lists`.
  - `packages/api/AGENTS.md`, `apps/web/AGENTS.md` and the root `AGENTS.md`, checked against parts A (`2f107ab3`) and B: none of their conventions changed. Both parts keep to the existing ones:
    - round trips: `bumpPerson`'s lock and the states `UPDATE … FROM unnest`;
    - the worker import boundary;
    - pure tests;
    - no `/rpc` or cache-key change;
    - no web code at all.

    The api file's domain-docs table does not list `lib/trade-post-rows.ts` beside the other trade `lib/` files, a gap from before this change, left as it is.
  - `bun run lint --filter=@repo/db` and `bunx oxfmt --check` pass.

## Context

See proposal.md for why. This is change 3 of the shared-lists chain the owner set on 2026-11-16:

`trade-post-state` → `trade-post-hides-by-row` → **this change** → `trade-post-state-contract` → `trade-post-reads-by-row` → `post-id-inputs` → `offer-reads-post-id` → `shared-lists`.

The owner's decisions of 2026-11-16 bind it:
- hides follow the row;
- want lists and have or sale lists may both be shared;
- a post's Trade state is per post;
- one open offer per pair of people stays;
- no post history;
- Bump stays per person;
- no caps on posts.

Paths are under `packages/api/src/` unless they say otherwise. Line numbers are from the worktree at `70c82fb3`, where main is the same commit.

**The planner plans a person's whole row set from their lists** (`lib/trade-post-rows.ts`):

- `planPostRows` (`:65-116`) keeps each lead's lowest row and deletes the rest (`:73-77`). It gives each have or sale list one want list from its partner and lets the lower id keep a want list two lists name (`:79-90`). A list leads a row when it is linked, on Trade, or already leads one (`:95-98`). Every row left over goes (`:113`).
- `relead` (`:119-139`) turns an insert that shares a list with a deleted row into an update, so a post keeps its id. `movesOf` (`:146-175`) sends a hide to "the surviving row now holding that lead", found with one `.find` (`:168-169`).
- `planPostWrite` (`:305-367`) applies the pairing to `partnersOf` the rows (`:322-323`, one partner per list, lowest row first, `:199-211`). It reads each list's Trade state from the list writes the writer made (`written`, `:328`). It then derives every row's state from its lists with `postStateOf` (`:252-263`, `:341-353`).

So a list in two rows has nowhere to stand. Any write by its owner would delete a second row it leads (`:75`), or strip it from a second row as a want list (`:87`). This is true even for a write that never names it, such as deleting another list or taking another post off Trade.

**The writers** all go through `lockPosts` and `writePosts` (`services/list/shared.ts:99-137`, `:215-246`):

- `trade.savePost` (`services/trade/post.ts:26-80`) runs `planPost` (`schemas/trade-post.ts:246-339`) over the locked lists. It writes `tradeColumns(true)` and the Open to flags on every picked list (`:41-49`), `takes_swaps` (`:51-59`) and `tradeColumns(false)` on the dropped lists (`:61-69`), then hands `pair`, `unpair` and `written` to `writePosts` (`:71-75`).
- `trade.takeDownPost` (`post.ts:83-99`) writes `tradeColumns(false)` on the post's members.
- `writeList` (`services/list/create.ts:152-224`) inserts the list with `discoverable` and `bumped_at` (`:193`, `:197`). It turns the partner on with `tradeColumns(true)` (`:205-216`), and pairing takes the target from its old partner (`:218-222`).
- `deleteList` (`services/list/edit.ts:137-156`) calls `writePosts` with `removed` before the delete.
- `bumpPerson` (`services/trade/feed/mine.ts:94-139`) bumps the person's lists on Trade and every side of every row that holds them, under `lockTradeLists`.

`tradeColumns` (`shared.ts:40-50`) is the one place a list goes on or off Trade. Turning a list on from off counts as a bump, through `turnOnBumpedAt` (`:34-37`).

**`planPost` refuses a list that is in another post** (`trade_post_list_in_post`, `schemas/trade-post.ts:289-291` and `:305-307`). Drift check 2 (`apps/worker/src/script/trade-post-drift.ts:53-58`) has read zero on production at every rollout. So no list is in two rows today, and every reader still assumes it is not:
- `postPartnerSql` (`services/trade/lists.ts:53-59`) and `postRowSql` (`lib/trade-sql.ts:41-44`);
- `postsCte`'s lead join (`services/trade/feed/query.ts:39`);
- `partner_post` (`services/trade/matches/candidates.ts:96-102`);
- the hide set form (`coveredListsSql`).

**Edit post's swap and drop make a new row.** Edit post swapping H for H2 in post (H, W):
- `planPost` puts H in `off`, unlinks (W, H) (`schemas/trade-post.ts:297-300`) and links (H2, W) (`:336`).
- `planPostRows` keeps H's row for H alone (`trade-post-rows.ts:98`, update at `:109`) and inserts (H2, W) at `:108`.

Dropping H (a Swap post becomes a Buy post of W) inserts W's row the same way. The edited post loses its id, and so does a hide on it. `trade-post-hides-by-row` accepted that until this change (its design, Owner confirmations 4 and Risks). `offer.post_id` is written once, at offer create (`services/offer/index.ts:362-365`), and nothing reads it yet: a grep of `packages/api/src`, `packages/db/src`, `apps/worker/src` and `apps/web/src` finds only that write, its index and the drift script.

**Want alerts** read the partner's post state from the row in `cand` (`apps/worker/src/job/want-alerts/pairs.ts:47-57`). But `loadContext` (`job/want-alerts/context.ts:15-38`) loads both lists of every pair from `lists`, and `judge` (`apps/worker/src/lib/want-alert-match.ts:101-122`) reads the partner's `sale` (forward, `:117`) and `wantsSwaps` (reverse, `:120`) from them. `trade-post-state` recorded this under Inputs for later phases and assigned it here.

**Owner answers already given:**
- `trade-post-state` question 1 (a): `lists.discoverable` stays, as "on Trade in some post", derived from the rows by `writePosts`.
- `trade-post-state` decision 6: "a list moving into a row brings its old row's side state".

## Goals / Non-Goals

**Goals:**
- A write changes only the rows it is about. Any write leaves a list's other rows as they are, so the write side holds a list in several rows.
- Every write that production can make today gives the same rows, list states and touched lists as today, except Edit post's swap and drop, which keep the edited row. The model test proves this with no exceptions: it freezes today's `planPostRows`, `relead` and `movesOf` for the differential, and per-row states are proven against the expectation model E (`checkStates`).
- A post's Trade state is the write's, and `lists.discoverable` and `bumped_at` follow from the rows.
- The previous build can run against the rows this build writes, and the reverse.

**Non-Goals:**
- Lifting `planPost`'s refusal, or deciding how the composer adds a list that is already in a post (`shared-lists`). Readers stay as they are (`trade-post-reads-by-row`).
- `bumpPerson`, `personBumpedAt`, `lastBumpOf` and the `lists` indexes (`trade-post-state-contract`, decision 12).
- Any schema change or migration (decision 11).

## Decisions

### 1. A write plans its own rows, by today's rules

`planPostWrite` stops planning the whole set. It finds the rows the write is about, its **component** (decision 2), and runs today's rules over those rows only: `partnersOf`, `applyPairing`, `planPostRows` with `relead`, and `movesOf`. Every other row is left as it is, state included.

Within a component, every list is in at most one row, so today's rules apply unchanged. Over a world with one row per list, the component holds every row today's whole-set plan would change. The plan is therefore the same, except where whole-set planning repairs rows that no write names. That repair goes (Risks).

The rules stay in `lib/trade-post-rows.ts`, which stays pure. The new entry is built as `planPostChange` (input `PostChange`) beside `planPostWrite`, so every task keeps the services compiling; group 4 of the tasks moves the writers to it and deletes `planPostWrite`, `PostWrite` and `postStateOf`. This design says `planPostWrite` for the entry either way. `planPostRows` gains the `post` rule of decision 3, and nothing else in it changes. `relead`, `movesOf`, `partnersOf` and `applyPairing` keep their text.

Rejected:
- **Keeping whole-set planning.** It deletes or strips a second row of any list the moment its owner writes anything. That is the bug this change exists to remove.
- **A new row-driven algorithm**, where each writer states its row operations. It would restate merges, takeovers, re-leads and splits from scratch. Today's rules are proven by the model test and two production rollouts, and the component keeps them.
- **A slot table** (`trade_post_list`). It was refused in `trade-post-state` decision 1, and nothing here needs more than two lists per post.

### 2. The component: which rows a write is about

`componentOf(rows, write)` is pure, in `lib/trade-post-rows.ts`. Its seeds are:

| Write | Rows |
| --- | --- |
| `write.post.row` (Edit post, Take off Trade) | that row |
| each list the write names (in `pair`, `unpair` or `sides`) | its row in `write.post.row` if it is there; otherwise its row by `postRowOf` (the lowest row it leads, else the lowest it is the want list of, `:178-185`) |
| `write.newPost` (decision 6) | none: the post goes into a row of its own |
| `write.removed` | every row holding the removed list, **each as its own component** |

A component then holds those rows and every list in them, plus the named lists that are in no row (a created list, a list going on Trade).

- **The one-row rule, checked.** If a list sits in two rows of one component, `planPostWrite` throws `a list in two rows of one write`. Production cannot reach that while check 2 reads zero (Risks).
- **Removed lists, row by row.** A deleted list in rows R1 and R2 is planned as {R1} and then {R2}, each by today's rule: re-led to its want list when that is on Trade, deleted otherwise (`deleteList`'s takeover).
- **The state each component reads.** A list is "on" in it when the write's side intent says so (decision 4). Otherwise, it is on when its side in the component's row was on before. `live` (the D2 merge rule, `:102`) is the lists with a side on in the component before the write.
- **The output.** `relinked` is the lists of the component whose partner changed. The ops of all components are concatenated.

Over today's data this gives the rows of the named lists. For each writer:
- `savePost`: the picked and dropped lists, the pair and the unpaired lists.
- `takeDownPost`: the post's row.
- `writeList`: the pair target's row.
- `deleteList`: the deleted list's row.

Their other lists sit in those rows, so the component is closed.

Rejected:
- **Every row holding a named list.** For a shared list that pulls its other posts into the write, which is what must not happen.
- **Refusing writes from a person whose rows have drifted, instead of throwing.** That is the same failure with more code. A throw rolls the transaction back, and check 2 names the list.

### 3. Edit post keeps its row

`planPost` returns two new fields:
- `replaced`, the anchor list id of the post it edits (`old.anchor.id`, or null);
- `lead`, the list that leads the post's row after the save. That is the picked have or sale list. Failing that, it is the picked want list's partner, when the kind keeps the pair (`keepsPair`) and the save does not unlink it. Failing both, it is the picked want list.

`savePost` turns them into `post: { row: postRowOf(rows, replaced), lead }`.

In `planPostRows`, the rule is: when the post's row R leads a list X that is neither `lead` nor `lead`'s want list after the write, R goes to `lead`. Before the main loop:
1. Take R from X in `kept` and give it to `lead`. If `lead` already led another row, that row joins the deletes.
2. In the loop, the update (`:109`) is pushed when the row's lead or its want list differs from the list's, not only its want list, and it writes `leadListId` when the lead differs. A swap that keeps W changes only the lead.
3. The "already leads a row" test (`:98`) reads the leads before the write, not `kept`. So X still leads a row: it gets a new one, holding its partner if the save left it paired.
4. The `live` branch (`:102`) is skipped when `lead`'s kept row is R.

| Edit | Today | After |
| --- | --- | --- |
| Swap H for H2 in (H, W) | R = (H) off; new (H2, W) | R = (H2, W); new (H) off |
| Drop H: Buy post of W | R = (H) off; new (W) | R = (W); new (H) off |
| Sell (S, W) into Swap (H, W) | R = (S) off; new (H, W) | R = (H, W); new (S) off |
| Swap with W on and H off, into Swap (H2, W) | R = (H) off; new (H2, W) | R = (H2, W); new (H) off |
| Swap of H alone with W parked off, into Swap of H2 alone | R = (H, W) off; new (H2) | R = (H2); new (H, W) off |
| Buy post W into Swap (H, W) | R kept, re-led (`relead` or D2) | unchanged |
| Swap W for W2 in (H, W) | R kept | unchanged |
| H2 led a parked row P | P = (H2, W); R = (H) | R = (H2, W); P deleted, its hides moved to R; new (H) off |

- **Same rows.** In each case today's rows and these rows hold the same lists. Only the ids differ, and the differential compares rows without ids. So the frozen `planPostRows` and this one agree with no exceptions (decision 10).
- **The hide stays on R.** `movesOf` finds no survivor that holds X, since X is in an insert, so the hide stays on R, which survives. A hide on P moves to R (P is deleted, and R holds its lead).
- **`offer.post_id` stays on R.** An offer whose `post_id` is R now names the edited post, whose lead is H2. Drift note 1 counts it ("an offer on a post now led by another list"). Nothing reads `post_id`, and `offer-reads-post-id` decides what such an offer shows (Inputs).

Rejected:
- **No row for the displaced lead.** Today a lead keeps a row once it has one (`:98`). Dropping that here would make the differential need an exception, and an older build's next write would make the row again. The extra row is off Trade and shows nowhere, as every taken-down post's row does today.
- **Inferring the edited row in the planner.** The planner sees lists, not the post a person opened. `replaces` already names it, and `savePostInputSchema` (`schemas/trade.ts:315-326`) stays as it is.

### 4. Each row's state comes from the write

The writers stop deciding state per list. A write passes **side intents**:

```ts
/** What a write sets on a list's side, in the row the write puts it in. */
export type SideIntent = {
  listId: number;
  on: boolean;
  /** the post's want-side Open to, when the list is its open list */
  matchHave?: boolean;
  matchSale?: boolean;
  /** a sale lead's `takes_swaps` */
  takesSwaps?: boolean;
};
```

`planPostWrite`'s input gains `bumpAt`, the person's turn-on bump time. `lockPosts`' fresh read selects it once, as `turnOnBumpedAt(userId)` (`shared.ts:34-37`), after the lock, so it sees every committed bump.

Today each turn-on in a transaction computes the same value:
- the first turn-on takes the person's last bump when it is under 24 hours old, and `now()` otherwise;
- every later one then sees the same last bump, or that `now()`.

So one value read up front is the value each `tradeColumns(true)` would have written. It is selected as `::text`, as `mine.ts:83` and `:124` read bump times, so the string the planner copies round-trips exactly.

**`rowStateOf`, the rule.** It replaces `postStateOf`. For each side of each row in a component after the write, holding list L:

1. **L has an intent.** `on` comes from it. The bump is kept when L's side in the component was on before the write; otherwise it is `bumpAt` when the intent turns it on, else the old side's bump, else the list's. Open to and `takes_swaps` come from the intent where it gives them. Otherwise, a side the intent turns on from off takes the list's own, and any other side (staying on, staying off, or turning off) follows rule 2.
2. **L had a side in the component before**, in any row or slot. It brings that side's `on` and bump. Open to comes from that row when L was its open list, else from the list. `takes_swaps` comes from that row when L was its sale lead, else from the list.
3. **L had no side** (a created list, or a list entering rows). Its side is off, with the list's bump, Open to and `takes_swaps`.

As today: with no want list, `want_on_trade` is false and `want_bumped_at` null; with no open list, `match_have` and `match_sale` are true; `takes_swaps` is false unless the lead is a sale list.

**What the writers pass:**

| Writer | Intents |
| --- | --- |
| `savePost` | `on: true` for each list in `plan.on`, with the want list's flags. The sale list's `takesSwaps` comes from `plan.saleSwaps`. `on: false` for each list in `plan.off`. |
| `takeDownPost` | `on: false` for the post's members, with `post: { row }` |
| `writeList` | `on: true` for the created list when it is created on Trade, and for the partner it turns on |
| `deleteList` | none |

- **Equal to today.** While a list is in one row, its side always equals the list (equation E, `trade-post-state` decision 3), and the composer writes the list's Open to and the row's from the same flags. So rule 2 gives what `postStateOf` gives, except an off-Trade Open to that `list.edit` changed. Today's next write by the person copies that into every such row; this rule leaves the row's value while the side stays off. No read takes an off-Trade side's Open to (`postStateSql` falls back to the list's own), and check 6 skips off-Trade sides, as it does today.
- **A stale value never goes live.** `list.edit` can leave an off side's Open to behind its list (`trade-post-state` As built, step 8: the row kept `match_sale` false beside a list with true). A turn-on with no Open to in its intent, such as `writeList` turning a partner on, takes the list's own value (rule 1), as `postStateOf` does today.
- **The list's own Open to stays written.** `savePost` keeps writing a picked want list's `match_have` and `match_sale`, and `takes_swaps` for a Sell post. They are the list's values off Trade, the composer's start value (`startForList`, `schemas/trade-post.ts:420-459`) and the viewer's own lists.

Rejected:
- **Keeping `postStateOf` over the lists.** With a list in two posts, the list's one flag can't say which post is on, and a second post's turn-on would keep the first post's bump.
- **Using the list writes as the intents** (today's `written`). This has the same flaw: `tradeColumns(true)` keeps a bump when the list is already on in another post.

### 5. `lists.discoverable` and `bumped_at` are derived by `writePosts`

`planPostWrite` returns `ops.lists: { id, discoverable, bumpedAt }[]`. It holds each list of every component, and the created list, whose summary differs from the stored one; a list whose summary equals the stored one is left out, so the batch runs only when a summary changed (Round trips). A removed list is never in it, since `deleteList` deletes it right after. For each list:
- `discoverable` is "some side of the list is on, in any row of the person after the write". It is false for a list in no row.
- `bumpedAt` is the latest bump of its sides when it is in a row, and unchanged otherwise. Bumps are compared as Postgres `timestamptz` text output (`::text`, ISO form with a fixed-width offset). Those strings sort in time order, so the planner may compare them as strings. The model test's clock must therefore sort as a string too.

`writePosts` writes them last, in one `UPDATE lists … FROM unnest(…)`. The order becomes:
1. moves;
2. deletes;
3. updates;
4. states;
5. inserts;
6. lists.

The list rows are already held `FOR UPDATE` by `lockTradeLists`, so the write adds no lock.

- **Equal to today.** With one row per list, a list's one side is its state. A turn-on sets the side's bump to `bumpAt`, which is what `tradeColumns(true)` set the list to. `bumpPerson` sets both, as now. So nothing a reader of `lists` sees changes: the Marketplace, offers and the picker, chat cards, the list page, `visibleOnTrade`, `personBumpedAt`, `lastBumpOf`, and the worker's newly discoverable set (`apps/worker/src/job/want-alerts/index.ts:48-51`, which keys on `discoverable`).
- **`updated_at` is not touched.** `lists.updated_at` has no `$onUpdate` (`packages/db/src/schema.ts:108-110`). Only `touchList` moves it, after commit, as today.
- **The writers stop writing `discoverable` and `bumped_at`.** `tradeColumns` loses its last callers (`post.ts:44,64,92`, `create.ts:212`) and goes. `writeList`'s insert keeps setting both (`create.ts:193`, `:197`), because the list has to exist before its row; its summary then equals the insert, and no write follows.

**Round trips:**

| Writer | Today | After |
| --- | --- | --- |
| `savePost` | one `UPDATE lists` per picked list, plus `saleSwaps`, plus one for `off`, then the row writes | one `UPDATE` for the picked want list's Open to (when there is one), plus `saleSwaps`, then the row writes, plus one `lists` batch when a summary changed: fewer or equal |
| `takeDownPost` | one `UPDATE lists`, then the state write | the state write, then one `lists` batch: equal |
| `writeList` | insert, the partner's `UPDATE`, then the row writes | insert, then the row writes, then the batch: equal |
| `deleteList`, `bumpPerson`, `list.edit`, every read | — | unchanged |

Rejected:
- **(b), an `EXISTS` over the rows in about 20 readers.** The owner chose (a) (`trade-post-state`, Open Question 1).
- **Writers keep writing the list, and the planner corrects it.** That is two writes to one row per write, and two rules for one value.

### 6. Shared lists in the planner

The planner's input gains `newPost?: boolean`: the composer's post goes into a row of its own, with no component but the lists it names.

- **Posting a list in a second post adds a row.** `newPost` with lead L (already in R1) and want W makes a new row (L, W) with the intents' state. R1 is not in the component, so it is not split, merged or re-led.
- **Dropping a shared list from one post leaves the other.** Edit post on R2 (`post.row`) that drops L takes L out of R2 only, because L's seed is its row in `post.row` (decision 2). R1 keeps L, on or off as it was.
- **Take off Trade of one post** turns off the sides of that row only.
- **Deleting a shared list** plans each of its rows on its own (decision 2).
- **The summary** (decision 5) reads every row, so L stays `discoverable` while any post shows it.

`planPost` keeps its refusals, so `trade.savePost` never sends `newPost`, and production never makes a second row for a list. `shared-lists` lifts the refusal and adds the input that names a new post.

Rejected:
- **Lifting the refusal now.** Readers would show a shared list wrongly (`postPartnerSql`, `postsCte`'s lead join, the hide set form), and `trade-post-reads-by-row` is the change that fixes them.
- **Leaving the planner one-row until `shared-lists`.** Then that change would carry the planner rewrite, the readers' last step and the UI at once.

### 7. Hide moves with shared lists

`movesOf` runs per component (decision 1), over that component's rows and ops. Its holder search (`:168-169`) can then only find a row of the write. That makes `hides-by-row`'s rule ("a hide follows the lead") exact for a list in several rows: the hide follows its lead into the row the write puts it in.

| Write | The hide on R |
| --- | --- |
| A new post with a list that is in R (`newPost`) | stays on R; the new post is not hidden |
| Edit post on R that swaps or drops a list, shared or not | stays on R (decision 3) |
| Edit post on another post that drops a list shared with R | stays on R; R is not in the write |
| Take off Trade of one of a list's posts | stays on its row |
| Delete a list in R and R2 | per row: stays on a re-led row, and ends with a deleted one |
| Merge into R' of a list whose other row is R | R is not in the component; stays |
| Merge, takeover, D1 and D2 inside one component | as `hides-by-row` decision 2 |

**One narrowing of `hides-by-row`'s rule 2.** That rule says a hide stays on the lead's row after a split, so a hidden want list shows again. An Edit post that drops the have list used to be such a split. Under decision 3 it is not: the edited post keeps its row and its hide, now led by the want list, and the dropped have list goes to a parked row. A split by pairing the want list elsewhere, or an edit that takes the want list out, still leaves the hide with the have or sale list. The delta spec says so, and Open Question 3 asks the owner to confirm it.

Rejected:
- **Following the list into every row that holds it.** One hide would cover posts the person never hid. The owner chose "hides follow the row".

### 8. Want alerts read the partner's state from its post

`cand` (`apps/worker/src/job/want-alerts/pairs.ts:47-57`) reads `on_trade`, which is the post's row. `fetchPairs` returns two more columns per pair, both from `c`, the new entry's list, which is always the partner (`pairs.ts:83`):
- `partner_sale` (`c.list_type = 'sale' AND NOT c.takes_swaps`);
- `partner_wants_swaps` (`c.list_type = 'want' AND c.match_have`).

`AlertPair` (`apps/worker/src/lib/want-alert-match.ts:29-37`) gains `partnerSale` and `partnerWantsSwaps`. `judge` reads the partner's `sale` (forward) and `wantsSwaps` (reverse) from the group's first pair. It keeps reading the recipient's from `AlertList`. `loadContext` is unchanged: the recipient's half, `swapPair` included, stays on `lists` until `trade-post-reads-by-row`.

- **Equal to today.** While a list is in one row, its on-Trade side's Open to equals the list's. New check 6 holds that (decision 9).
- **A group is one partner list,** so its pairs share the flags while that list is in one row. With a list in two rows, `cand` would yield the entry twice. `trade-post-reads-by-row` rewrites `cand` per row (Inputs).

Rejected:
- **Moving it to `trade-post-reads-by-row`,** which needs no worker change here. `trade-post-state` assigned it to this change, and its smallest form is two columns that `cand` already has.

### 9. Drift

Must be zero (`CHECKS`):
- **Check 2 stays as it is**, a failing check. Readers still assume one row per list (Context), and `planPost` still refuses. `hides-by-row` named it the guard until the readers move (its Risks). The header says that `shared-lists` turns it into a note. That departs from the brief, which said check 2 can no longer be an error (Open Question 5).
- **Check 5, rewritten: "a list whose Trade state or bump disagrees with its rows (list ids)".**

  ```sql
  WITH sides AS (
    SELECT s.list_id, bool_or(s.on_trade) AS on_trade, max(s.bumped_at) AS bumped_at
    FROM trade_post tp
    CROSS JOIN LATERAL (VALUES
      (tp.lead_list_id, tp.lead_on_trade, tp.lead_bumped_at),
      (tp.want_list_id, tp.want_on_trade, tp.want_bumped_at)
    ) s(list_id, on_trade, bumped_at)
    WHERE s.list_id IS NOT NULL
    GROUP BY s.list_id)
  SELECT l.id FROM lists l LEFT JOIN sides ON sides.list_id = l.id
  WHERE l.list_type IN ('have', 'sale', 'want')
    AND (l.discoverable <> coalesce(sides.on_trade, false)
      OR (sides.list_id IS NOT NULL AND l.bumped_at IS DISTINCT FROM sides.bumped_at))
  ```
- **Check 6, rewritten: "a row whose Open to or takes_swaps breaks a post rule (row ids)".** A row fails when:
  - (a) it holds a want side's state with no want list (`want_list_id IS NULL AND (want_on_trade OR want_bumped_at IS NOT NULL)`), which today's check 5 caught;
  - (b) its lead is not a sale list and `takes_swaps` is true;
  - (c) for a list in exactly one row whose side is on, the row's Open to (its open list) or `takes_swaps` (its sale lead) differs from the list's. Want alerts' recipient half, staff posts, the report snapshot and `postStateSql`'s fallback still read a list's Open to as its post's (decision 8, Inputs), and this guards them until `trade-post-reads-by-row`.
- **No weaker on today's data.** With one row per list, new check 5 is old check 5 read from the list's end. New check 6 is old check 6 plus (a). Group 8 runs the old script from `70c82fb3` beside the new one after every local step, and both run before the production deploy (Migration Plan).
- **The header** says that checks 5 and 6 hold whatever rows a list is in, apart from 6c.
- **Note 1's comment** gains "or Edit post swapped or dropped the post's have or sale list". After the deploy it may count offers on edited posts: information, not drift.

Rejected:
- **Dropping check 6.** (c) is the only guard for the readers that still read a list's Open to as its post's.
- **Turning check 2 into a note now.** It would hide exactly the state the readers can't show.

### 10. Tests: pure modules only

**Freeze the reference first** (task 1.1). `legacySync` (`lib/trade-post-rows.model.test.ts:296-298`) calls the live `planPostRows`. Rewriting the planner would therefore make the differential compare the engine with itself. So today's `planPostRows`, `relead` and `movesOf` are copied verbatim into the model test as `frozenPlanPostRows` and its helpers, before any planner edit, and `legacy` runs on the copy.

The test freezes `planPostRows`, `relead` and `movesOf` verbatim, for the differential and the rollback-floor proof. Today's `planPostWrite` and `postStateOf` are removed, not frozen. Per-row states are proven against the expectation model E (`checkStates`).

**`trade-post-rows.model.test.ts`:**
- **The differential** (`:717-736`): `legacy` (frozen) against `byRows` (the new `planPostWrite`) over the same random writes. Lists, rows without ids, outcomes and touched lists must be equal, **with no exceptions**, Edit post included (decision 3's table holds the same lists). `byRows`' writers pass intents and `bumpAt` (the step's `clock`), and its lists take `discoverable` and `bumpedAt` from `ops.lists`, never from `tradeWrites`.
- **Equation E in full** (`checkStates`, `:690-707`) still holds after every write. The model has no `list.edit`, so off-Trade Open to never lags. If it fails only on an off-Trade side, relax it to the on-Trade half, as check 6 is, and record the case in As built.
- **The edited row kept.** For every `post` write that went through with `replaces` naming a post on Trade, the row `postRowOf` gave the edited anchor before the write must hold the write's `lead` after it. A new count, `editLead` (Edit post whose lead changed), needs a floor of 100. If the random writes can't reach it at 1,000 runs, use the rule `hides-by-row` used: drop the floor to what every run reliably reaches, at least 1, and record the count.
- **The rollback floor.** After every write of the rows world, `frozenPlanPostRows` over its rows and lists (partners by `partnerByRows`) must return no deletes, updates or inserts. That is what the previous build does on its next write.
- **`checkMoves`** (`:141-186`) stays as it is in the differential.
- **The healing test** (`:800-821`) goes. It ran the legacy planner only, and whole-set repair is gone.

**A shared run, new**, a second `test` in the model test file, over 1,000 seeded runs of 40 writes, with two people:
- The writes are `pickWrite`'s writes, plus:
  - `share`: `planPostWrite` with `newPost`, for a list on Trade in a post and, now and then, a want list of the same person;
  - `dropRow`: Edit post on a named row that drops one of its lists;
  - `downRow`: Take off Trade of a named row.
- Writes that would put a list twice in one component are not generated (decision 2), and one unit test covers the throw.
- No write makes a want list both a Buy post's lead and another row's want list (Open Question 4).
- **After every write it asserts:**
  1. every row outside the write's component is unchanged, state included;
  2. a list leaves a row only when the write unpaired, dropped, paired away or removed it in that row;
  3. check 3's shape: each row holds its owner's lists, and a want-led row holds no want list;
  4. `discoverable` and `bumpedAt` of every list equal decision 5's summary over all rows;
  5. the moves: each `from` once, each `to` surviving, no id both a `from` and a `to`, and no simulated hide on a deleted row;
  6. a hide on a row the write did not delete stays there unless a move of that write names it.
- It counts `share`, `dropRow`, `downRow`, a delete of a list in two rows, and a merge whose list is shared, each with a floor set from a first measured run (at least 1 per run kind), and the counts go in As built.

**Mutation checks** (task 2.7), each made once and restored:
- seed every row of a named list into the component: assertion 1 fails;
- take a moving list's state from the list: E or the shared run's summary fails;
- skip the `post` rule: the edited-row check fails;
- summary from the first side only: assertion 4 fails.

**`trade-post-rows.test.ts`:**
- decision 3's table, one case per row;
- `componentOf` per writer;
- `rowStateOf` rules 1 to 3, including a turn-on over a row whose Open to lags its list;
- the summary;
- decision 6's paths;
- decision 7's table;
- the throw.

**`schemas/trade-post.test.ts`:** `planPost`'s `replaced` and `lead` for each kind, including the pair kept with only the want list picked.

**`apps/worker/src/lib/want-alert-match.test.ts`:** `judge` reads the partner's flags from the pair and the recipient's from the list, both directions.

No test touches a database. SQL is proven by the local runs (group 8).

### 11. No migration

None is needed:
- **No column, check or index changes.** `lists.discoverable` stays (owner answer (a)), and the row state columns exist since `trade_post_state`.
- **No unique index to drop.** Neither `trade_post` list column was ever unique (`packages/db/src/schema.ts:264`). One row per list rests on the lock, the planner and check 2.
- **Drift stays a script**, not a constraint. A trigger or exclusion constraint on "one row per list" would block `shared-lists`.
- **No index for the new reads.** The `lists` summary write is an `UPDATE … FROM unnest` by primary key. `bumpAt` is one scalar `max(bumped_at)` over the person's lists through `lists_user_id_idx`. Both run once per write. So no `EXPLAIN` gate is set: no read on a request path changes.

**Builds:**
- **Web and worker may run in any combination of this build and the previous one** (`70c82fb3`).
  - An old worker reads the partner's flags from `lists`, which equal the row's (check 6c).
  - A new worker beside an old web reads them from the row, which the old web keeps equal.
  - An old web's planner plans nothing over the rows this build writes (the rollback floor of decision 10). Its `postStateOf` copies off-Trade Open to into rows, which is harmless.
- **Rollback:** the previous web and worker images, `70c82fb3`. The floor set by the earlier changes still holds: web no lower than `2f107ab3` (`trade-post-state`), and `1a062e41` or later to keep hide moves (`hides-by-row`). This change adds no floor.

### 12. What stays for `trade-post-state-contract`

That change drops `lists.bumped_at`, moves `personBumpedAt` and `lastBumpOf` to the rows, and decides `lists_trade_feed_idx` and `lists_trade_discoverable_idx`. None of it is needed to write rows per post. `bumped_at` is derived here (decision 5), which makes the drop a reader change. It stays separate, as planned.

- `bumpPerson` stays as it is. It bumps every side of every row that holds a list on Trade, off sides included. With one row per list that is today's behaviour. With shared lists it also refreshes an off post's side, which its next turn-on would set anyway.
- The contract change moves the bump to the rows' on sides (Inputs).

## Risks / Trade-offs

- **[Whole-set repair goes]** A row a missed writer or an old build left wrong is no longer repaired by the person's next write.
  - → Production drift reads zero on checks 1 to 7 at every rollout, and checks 5 and 6 now also catch a list whose flag disagrees with its rows.
  - → `writePosts` is still the only writer of rows, and the healing property was never needed in production.
- **[A person whose rows drift into a list in two rows can't write]** The throw of decision 2 rolls back every post write that touches that list.
  - → Check 2 must read zero before the deploy (task 9.1).
  - → Today's planner would have silently deleted a row instead. A failing write shows the drift in Sentry.
- **[A wrong component]** If a writer names too few lists, a row it should change is left alone. The pair target's old partner is the case most likely to be missed.
  - → The differential compares whole worlds with no exceptions, over every write path, with every transition at its floor.
  - → The staged comparison (task 8.3) runs every path against today's build on the local database.
- **[`lists.discoverable` derived wrongly]** The Marketplace, offers, the list page and want alerts read it.
  - → The model asserts the summary after every write, check 5 compares it with the rows, and the staged comparison reads every list's `discoverable` and `bumped_at` to the microsecond.
- **[Row state wrong after a move]** The feed reads row state since `trade-post-state` part B.
  - → E in full after every differential write, and check 6.
- **[Edit post's displaced lead gets a parked row]** It is a row with nothing on Trade, as every taken-down post leaves today.
  - → It keeps the differential exact. `shared-lists` may drop it once the frozen reference no longer binds (Open Question 6).
- **[An offer on a deleted parked row loses its post id]** In decision 3's last table row, the parked row P is deleted where today it survives as (H2, W). `offer.post_id` is `ON DELETE SET NULL`, so an offer made on P loses its post id, and drift note 2 counts it. Merges already do this today. Drift note 3 (hides whose `list_id` is no longer in their row) also rises on such edits; it's information only.
- **[`offer.post_id` names the edited post after a swap]** An offer on (H, W) now names (H2, W).
  - → Nothing reads `post_id` (Context). Note 1 counts these offers, and `offer-reads-post-id` decides what such an offer shows.
- **[The worker's unhide after an edit]** `recordRun` deletes the hide of the entry list's row. After a swap, an entry H2's owner adds can bring back the hide on R, as it would on any re-led row today.
  - → This is the row rule of `hides-by-row`, unchanged.
- **[Two changes edit `trade-post-rows.ts`]** `trade-post-state-contract` may start before this one lands.
  - → Contract work does not touch the planner (decision 12). If both are open, this one lands first.

## Migration Plan

No migration (decision 11). In order:

1. Build groups 1 to 7, and prove them locally (group 8).
2. The owner commits and pushes. CI passes and moves `:latest`. Nothing is deployed yet.
3. **With a go-ahead, read-only on production, right before web comes up:**
   - the drift script from `70c82fb3` (checks 1 to 7) at zero;
   - the new script, checks 1 to 7 at zero;
   - the baseline counts: rows, lists on Trade, and note 1's offers.

   Any other number stops the rollout.
4. The owner brings up web, and rebuilds and brings up the worker from the same commit on the VPS, in either order. Record both times.
5. **With a go-ahead, read-only:**
   - the new drift script, checks 1 to 7 at zero;
   - note 1's count against step 3 (a rise is offers on edited posts, information);
   - rows and lists on Trade against step 3, with any difference explained by writes since.
6. **Rollback:** the previous images, `70c82fb3`, at any time (decision 11).

## Inputs for later phases

- **`trade-post-state-contract`:**
  - `bumpPerson` should bump only sides on Trade;
  - `personBumpedAt` and `lastBumpOf` become `max` over the rows' sides, which decision 5 keeps equal to `lists.bumped_at`.
- **`trade-post-reads-by-row`:**
  - want alerts' `cand` yields one row per side, so it must group a shared list's entries per row;
  - `context.ts`' recipient half and `swapPair` move to the recipient's post;
  - check 6c can go once no reader takes a list's Open to as its post's.
- **`post-id-inputs`:** `trade.savePost` may take the edited post's id beside `replaces`. `planPost`'s `replaced` and decision 3's `post` already carry a row.
- **`offer-reads-post-id`:** an offer whose `post_id` row is now led by another list may be on an edited post (decision 3), not only on a merged or taken-over one. Note 1 counts both.
- **`shared-lists`:**
  - lift `trade_post_list_in_post` in `planPost` and `rowBlock`;
  - send `newPost` for a new post;
  - decide which row a pairing at list create names when its target is in several rows (`postRowOf`'s lowest row until then);
  - turn check 2 into a note;
  - decide whether Edit post's displaced lead still needs a parked row (Open Question 6);
  - make `planPost`'s partner read row-aware, by the edited post's row: it reads one partner per list (`partnersOf`, the lowest row), so with a list in several rows the composer can name another row's want list as an unpaired Buy post. Then turn the shared run's edited-row check back on (`trade-post-rows.model.test.ts`, the `post && !shared` condition in `byRows`).

## Assumptions and unverified facts

- **Read in code, not run:**
  - that every row today's whole-set plan changes for a write sits in that write's component (decision 2), which the differential checks;
  - that one `turnOnBumpedAt` read after the lock equals every `tradeColumns(true)` in the same transaction (decision 4);
  - that nothing reads `offer.post_id`: a grep of `packages/api/src`, `packages/db/src`, `apps/web/src` and `apps/worker/src` finds its write (`services/offer/index.ts:362-365`), its index (`packages/db/src/schema.ts:524`) and the drift script.
- **Not re-read for this change:** production's row count (1,564 at `hides-by-row`'s 8.4) and drift at zero. Task 9.1 reads them.
- **From the archived designs:** the owner's answers to `trade-post-state` Open Questions 1 to 5, and `hides-by-row`'s Owner confirmations 1 to 8.

## Open Questions

Each is a default this design builds to. Overturning one changes a task. Answered by the owner on 2026-11-21: all ten recommendations stand. Questions 1 and 10 are recorded for `shared-lists` to build on.

1. **"Also in" instead of disabling a list that is already in a post.** The planner's `newPost` (decision 6) is what a composer showing "Also in" would send. No input changes here; `shared-lists` adds one. **Recommend "Also in".**
2. **Dropping a shared list from one post leaves the other.** Built so (decisions 2 and 6). **Recommend yes.**
3. **Edit post keeps its row id when it swaps or drops the have or sale list,** and the hide and `postId` stay with it (decision 3). This narrows `hides-by-row`'s owner rule 2: an Edit post that drops the have list of a hidden pair now keeps the Buy post hidden, where today the Buy post shows (decision 7). **Recommend yes.**
4. **A want list is never a Buy post and a Swap post's want side at once.** Offer reads already treat a want list in any row's want side as no Buy post (`services/offer/core.ts:434`). The shared run never makes it, and `shared-lists`' `planPost` refuses it. **Recommend yes.**
5. **Check 2 stays a failing check until `shared-lists`,** not "no longer an error" as the brief has it (decision 9). **Recommend keeping it.** Readers can't show a shared list until `trade-post-reads-by-row`.
6. **A parked row for the lead an Edit post displaces** (decision 3), not no row. **Recommend the parked row:** it keeps the proof exact, and it is what a taken-down post leaves today.
7. **Whole-set repair goes** (Risks). **Recommend accepting it.** Drift reads zero, and checks 5 and 6 now look from the list's end too.
8. **`offer.post_id` stays on the edited post after a swap** (decision 3). **Recommend yes.** It is the post the offer was made on, and `offer-reads-post-id` decides what the card shows. An offer on a parked row that an Edit post deletes is the exception (decision 3's last table row): its `post_id` becomes null, and drift note 2 counts it (Risks).

9. **Scope of the kept row id on Edit post.** Decision 3 keeps the row whenever the edited row's lead is neither the new lead nor its want list. So it also keeps the row when a Buy post swaps its want list, when an edit replaces both lists, and when a Sell post becomes a Buy post. The owner's ask named only swapping or dropping the have or sale list. **Recommend keeping the wider rule.** An Edit post is the same post to its owner, so its id, its URL and its hides stay. The delta spec already says "whichever of its lists". Note that a viewer who hid the post keeps it hidden after an edit that changes every list.
10. **Bump of a list entering a second post (for `shared-lists`).** A list already on Trade in one post that goes into a second post takes the person's bump time, so the new post may sort as freshly bumped. **Recommend accepting it,** since bump stays per person. Nothing in this change sends a second post, so it is recorded for `shared-lists` to confirm.

## As built

Recorded by the worker that applied groups 1 to 7 (2026-11-21), on the worktree at `70c82fb3` plus this change.

- **1.1, the frozen reference.** `frozenPlanPostRows`, `frozenRelead` and `frozenMovesOf` (with the private `RowWrites` type) are copied verbatim into `trade-post-rows.model.test.ts`; `legacySync` calls the frozen planner. The rollback floor (`checkRollbackFloor`) runs after every differential write, for both people, and held on today's planner before any planner edit, with `trade-post-rows.ts` unchanged.
- **Bump strings.** `lists.bumped_at` and the `trade_post` bump columns are `timestamp(…, { mode: "string", withTimezone: true })`. Drizzle 1.0.0-rc.5's node-postgres session returns `timestamptz` as Postgres' own text output (its type parser is a no-op, and the `timestamptz:string` codec only casts arrays), the same text a `::text` select gives. So the stored bumps the planner reads and the `::text` `bumpAt` are one format. The summary still compares them by time, not as strings (review fix, below): text from sessions with different time zones carries different offsets.
- **3.5, the differential.** It passes with no exception: lists, rows without ids, outcomes and touched lists equal `legacy`'s over 1,000 runs of 40 writes, Edit post included. `checkStates` asserts E in full and needed **no** off-Trade relaxation. `checkMoves` and the rollback floor run on every write. The model clock is `timestamptz` text, one minute per step from 2026-01-01 UTC (`stepTime`), so text order and time order agree. Counts at seed 1 to 1,000 (`COUNTS=1`): post 5347, takeDown 1511, pair 631, unpair 305, swapWant 113, deleteLead 207, deleteWant 191, createOnTrade 2916, createLinked 593, createLinkedToPaired 141, account 376, bump 664; releads 1499; moves D1 0, D2 248, D3 40, takeover 2. D2 was 96 under the old planner. All 248 come from `post` writes that name `post` (measured once by write kind); the rise is Edit post handing a deleted parked row's hide to the edited row (decision 3's last table row), which `checkMoves` classes as D2 since the target's lead changed. **`editLead` (Edit post whose row took a new lead): 864**, floor 100. The healing test and `corrupt` are deleted.
- **3.4, unit cases for decision 7's table.** One case per row, with two sharing a case: "Edit post on another post that drops a list shared with R" is the drop case (an edit of R3 dropping a list shared with R1: no move from R3, no op on R1), and a separate case swaps a shared list out of R3. "Merge, takeover, D1 and D2 inside one component" is covered by the merge case (a D3 move inside the component) and the existing `planPostRows` move tests.
- **3.6, the shared run.** A second `test` in the model file: 1,000 seeded runs of 40 writes over two people, about 35% of them `share`, `dropRow` or `downRow` (built as `PostChange`s and planned straight through `writePosts`) and the rest `pickWrite`'s writes through `byRows`. The six assertions run after every write (1, 2, 5 and 6 in `checkShared`, inside `writePosts`; 3 and 4 in `checkWorld`); assertion 4 also checks that the latest bump by string is the latest by time, over the model clock. The run reads decision 2 through its own rule (`writeComponents` in the test, written apart from `componentOf` as `partnerByRows` is apart from `partnersOf`): assertion 1 takes the write's component from it, and a write it finds holding a list in two rows of one component is not generated (refused before planning; 4 over the run). A planner throw on any other write fails the run. A write that leaves a want list leading a row while it is another row's want list (Open Question 4) is rolled back and skipped (19 over the run). Counts with `COUNTS=1`: share 2651, dropRow 376, downRow 1778, a delete of a list in two rows 471, a merge into a row holding a shared list 36. Floors at about half: 1000, 150, 800, 200 and 15. Run time 0.77 s locally (the differential 0.81 s; the whole file 1.65 s).
  - Assertion 2, as built, lets a list leave a row when the write unpaired, paired or removed it or turned its side off, or did so to the list beside it in that row (a merge or split moves both lists of a row: the D2 merge deletes the lead's row, taking its old want list out with it), or when the row is the one an Edit post's `post.lead` led and the edited row now holds the list. The last clause is decision 3's last table row: the parked row P that the new lead led is deleted and its lists move into the edited row, which none of "unpaired, dropped, paired away or removed" names. A first run failed there (seed 10, and seed 135 step 11 for P holding a pair), and decision 3 makes that move on purpose. Both clauses go beyond decision 10's wording and are asked of the coordinator. A throwaway mutation (an Edit post whose lead stays put stripping its row's want list) trips assertion 2 in the shared run, and the differential.
  - Both clauses, and the edited-row check's scope below, were accepted by the coordinator on 2026-11-21.
  - The differential's edited-row check (decision 10) does not run in the shared run, whose six assertions do not include it: with a have list in several rows, `planPost` reads one partner per list (the lowest row's, `partnersOf`), so a composer write can name the want list of a later row as an unpaired Buy post, and the plan leaves that row as it is. Only `trade-post-reads-by-row` and `shared-lists` make the composer read shared lists.
- **3.7, mutations** (each applied once to `trade-post-rows.ts`, then the file restored byte for byte from a copy):
  1. `componentOf` seeding every row of a named list: fails the shared run (the planner throws `a list in two rows of one write` on a write the test's own rule calls one row per list), `componentOf` "a list in post.row and in another row", and `planPostChange` "Edit post on one post dropping a shared list…" and "Take off Trade of one of a list's posts…". A first version of the shared run took its component from `componentOf` itself and skipped every throw, so this mutation then failed only the merge floor; the run now uses its own rule.
  2. `rowStateOf` rule 2 reading the list instead of the old side: fails four `rowStateOf` cases ("a want side turned on…", "a list moving from a Buy post's lead…", "a sale lead moving rows…", "a row with no want list…"). Decision 10 expected E or the shared run's summary to fail; neither does, since in both a side always equals its list here, so only the unit cases catch it.
  3. `planPostRows` ignoring `post`: fails the differential's edited-row check (on its first Edit post into a Buy post) and the decision 3 unit cases.
  4. The summary reading only the first side: fails the shared run's assertion 4 (seed 1 step 30, a list's bump) and three `planPostChange` shared cases.
  5. Rule 1 taking a turned-on side's Open to from the old row: fails `rowStateOf` "a want side turned on with no Open to, over a lagging row". The differential cannot catch it: there a side's Open to always equals its list's.
- **4.1, `bumpAt` with no list.** `lockPosts`' fresh read selects `(turnOnBumpedAt(userId))::text` once (an uncorrelated subquery, so an InitPlan) beside its list join, so a person with no have, sale or want list gets no row and `bumpAt` is null. `LockedPosts.current.bumpAt` is `string | null`, and `writePosts` passes the planner `bumpAt ?? created.bumpedAt ?? ""`: with no such list only a list create can run, and its insert computed `turnOnBumpedAt` in the same transaction, where `now()` is fixed, so the value is the same. No extra round trip and no change to the statement's shape.
- **Run against the local database in group 8:** the 4.1 and 4.2 SQL (`writeLists`, the `bumpAt` select, `writePosts`' new order ending in the `lists` batch, the writers' intents), 5.1's two new `fetchPairs` columns, and 6.1's checks 5 and 6. Group 8 below records the runs.
- **4.3.** `planPostWrite`, `PostWrite`, `PostWriteOps`, `PostWritePlan` and `postStateOf` are gone, and `PostChangeOps` is written out in full. The `planPostWrite` unit tests moved onto `planPostChange` (rows stored in step with their lists, writers' `written` replaced by intents); two were dropped because what they tested is gone: "a list in two rows: the planner empties the later row" (now the throw, tested on `componentOf`) and "a stale row is repaired by any write of the person" (now "a write leaves a row it does not name as it is, stale or not"). The `postStateOf` cases went with it; `rowStateOf` has its own. `tradeColumns` is gone from `services/list/shared.ts`.
- **4.4.** `bun run --filter=@repo/db db:generate`: "No schema changes, nothing to migrate", and no file appeared under `packages/db/migrations`.
- **5.1.** `fetchPairs` takes `partner_sale` and `partner_wants_swaps` from `c` in both branches of `pairs`. `judge` reads the partner's `sale` (forward) and `wantsSwaps` (reverse) from the group's first pair and the recipient's from `AlertList`; `context.ts` is unchanged. Three new cases: a forward Sell only post under Can swap whose list reads Sell or swap, a reverse Buying only want post whose list reads open to swaps (both fail under the old `judge`), and a forward recipient that buys only, whose flag still comes from its list.
- **7.1.** From the root: `bun run check` exit 0 (27 of 27 tasks), `bun run build --filter=web` exit 0, `bunx oxfmt --check` exit 0 (1,635 files). The grep for `planPostWrite`, `postStateOf`, `written:` and `tradeColumns(` in `packages/api/src` and `apps/worker/src` hits the model test twice (the legacy world's `turnOn` comment names `tradeColumns(true)`, and the frozen copy's verbatim comment names `planPostWrite`) and `written:` in `apps/worker/src/job/confirmed-serials.ts` and `populate-serial.ts`, unrelated serial-job fields that the task's list of allowed hits does not name. `services/offer/trades.ts`' local is named `tradeColumns =`, so the `(` pattern does not hit it.
- **Numbering in the artifacts.** tasks.md 3.3's "until 4.5" means 4.3, design decision 10's "task 2.7" means 3.7, and Risks' "task 9.1" means 9.2.
- **Deviations from the brief's working rules.** `test-driven-development` and `bun-runtime` were not loaded (the tests were written beside each slice, and `bun test` used as the repo does). `bun run build --filter=web` ran after groups 1, 3 and 4 and at 7.1, not after every task; lint and typecheck ran after every task. Want alerts' rechecks store entry ids and re-read them through `fetchPairs` (`job/want-alerts/index.ts:112-118`), so no stored pair lacks the new flags. No writer of `lists.discoverable` or `bumped_at` is left outside `writeList`'s insert, `writeLists` and `bumpPerson` (grep of `packages/api/src/services` and `apps/worker/src`).
- **Review fix: the latest bump by time.** The summary in `planPostChange` picked a list's latest bump by comparing the texts, which breaks when two bumps carry different UTC offsets (`2026-03-29 01:30:00+01` sorts after `2026-03-29 01:10:00+00` but is twenty minutes earlier). It now compares by `Date.parse` (`laterBump`), falling back to the texts within one millisecond, since `Date.parse` drops microseconds and texts of one offset order them; the winning text is written as it was read. A unit case ("the latest bump is the latest in time, whatever each text's UTC offset") holds two sides with those two bumps and expects the `+00` one. The model clock moved from `0001:0000` to `timestamptz` text, which `Date.parse` reads; every count and floor of both model runs is unchanged. tasks.md 8.3 gained step (n) and 9.2 a read-only `SHOW TimeZone` (expected `UTC`), to be recorded here when run.
- **Group 8, the local proof (2026-11-21).** The owner approved the local rows on `localtest1@local.invalid` and `localtest2@local.invalid` by name. Everything ran on the local database and Redis. Every script refused unless the hosts of `DATABASE_URL` and `REDIS_URL` were `localhost` or `127.0.0.1` (`guard.ts`, a wrapper that checks before it imports the script, so no client exists earlier). The scripts and outputs are in `/private/tmp/claude-501/planner-shared/`.
  - **8.1.** `record.json` (read-only, `record.sql`) holds 15 lists (7 of localtest2, 8 of localtest1), 10 `trade_post` rows (7 state columns, plus `created_at`), 0 hides and 51 offers (29 with a `post_id`). A restore built from it (`gen_restore.py` → `restore.sql`, one transaction) was proved on the untouched database first: the re-read was byte-identical. A `pg_dump --data-only` of the six tables was kept as a safety net and not needed.
  - **8.2.** The old drift script (`70c82fb3`) and the new one, copied into `apps/worker/.planner-shared/` and run read-only: both read 0 on checks 1 to 7, and 0 on the three notes. The copies were removed.
  - **8.3, `paths.ts`.** It runs as localtest2 through `savePost`, `takeDownPost`, `prepareList` with `createList`, `planCopy` with `writeCopy`, `deleteList`, `bumpPerson` and `editList`, with localtest1's hides through `hidePost` (each asserted to land). Any refusal stops the run. It uses the fixture lists and lists it creates with fixed names (`ps …`), and it deletes only lists it created. Its steps, each a separate snapshot:
    - (a) a new Swap post of two created lists;
    - (b) Edit post swapping its have list;
    - (c) Edit post into a Buy post;
    - (d1, d2) `lt2 sale` as Sell with Also open to swaps, then Sell only;
    - (e1, e2) `lt2 extras` and `lt2 wants extras` taken off Trade, then a Buy post of the want list with unpair;
    - (f1, f2) Take off Trade of `lt2 spares`'s post, then post it again;
    - (g1 to g3) D3: `lt2 wants` made a want-only Swap post, hidden with `lt2 quiet`'s post, taken off Trade, then joined by `lt2 quiet`'s live post;
    - (g4 to g6) D2: the pair taken off, `lt2 wants` posted as a Buy post with unpair (a want-only Swap post keeps its pair), hidden, then `lt2 quiet`, off Trade, edited into it;
    - (h1 to h3) takeover: `lt2 spares` taken off with `lt2 wants spares` posted alone (still paired), then `lt2 spares` paired with unpair into the live Buy post of `ps want a`;
    - (i1, i2) `list.create` of a have list on Trade linked to the paired `lt2 wants`, and `list.copy` of `lt2 wants spares` as a want list on Trade (unbound, so no holdings read);
    - (j1 to j3) `deleteList` of that have list with its want list on Trade, then of a created off-Trade pair's lead;
    - (k) Bump;
    - (l1 to l3) `lt2 wants extras` taken off Trade, Open to Swaps only saved through `list.edit`, then a write on `lt2 sale`'s post;
    - (m1 to m3) `ps want a`'s pair taken off, Open to Both saved, then a have list created on Trade linked to it;
    - (n0 to n3) the person's bumps newer than a fixed `2026-11-21 03:30:00.123456+00` set to it, a want list created on Trade linked to off-Trade `ps have a`, the bumps of the last 24 hours set to a fixed `2026-11-19 12:00:00.654321+00`, then a want list created linked to off-Trade `ps have b`.

    Lists are labelled by name, created lists' slugs as `<created>`, rows `R1…` in order of first appearance (new rows of one step ordered by their lists' names), offers' `post_id` by row label, and every timestamp the run wrote by its step. Each step asserted that it wrote at most one distinct bump time: the person's last bump when that was under 24 hours old, else a time after the step began. Both builds passed every step.
    - Old build: a detached scratch worktree at `70c82fb3` (`setup-worktree.sh`, whose `.env.local` hosts were checked to be local), `before.json`. Then `restore.sh`, re-read byte-identical. Then the new code, `after.json`. Then `git worktree remove`.
    - **Deviation: (k) and (n) set-backs.** `bumpPerson` refuses while any of the person's bumps is under 24 hours old, and step (a) already stamps `now()`. So (k0) set the bumps of the last 25 hours back to the fixed 2026-11-19 value on both builds, and changed `lists.bumped_at` and the rows' bump columns together in one transaction. (n) uses fixed literals with non-zero microseconds, so the under case compares in raw values across builds.
    - **Result, step by step.** Lists and offers: no difference at any step (a) to (n). Rows and hides:
      - (a): identical.
      - (b) and (c): the allowed difference. The edited row keeps its label and `created_at` and holds the new lead. The displaced lead is in the newly labelled off row. localtest1's hide stays on the edited row, where the old build left it on the displaced lead's row.
      - (c): in the old build, the edit had left the post unhidden, so the scripted `hidePost` before (c) made a second hide (on `ps have b`'s row). In the new build the post was still hidden and the call was a no-op. lt1 sees the same thing (the post hidden), and the new build holds one hide, on the edited row. The coordinator ruled it the allowed carry-forward.
      - (d) to (k): nothing but that carry-forward.
      - (h3) on: the takeover's moved hide merged into the edited row's hide from (b). It has the same `post_id` and `created_at` on both builds. `hidden_trade_post.list_id` reads `ps have a` (new) against `lt2 spares` (old). Nothing reads `list_id`: `services/trade/hidden.ts`, want alerts' `unhidePosts` (`hidesOfSql`) and the `70c82fb3` rollback build all go by `post_id`. The coordinator ruled it the allowed carry-forward.
      - (l3) on: the allowed Open to difference. The off-Trade row of `lt2 wants extras` keeps Buying only (`match_have` false), where the old build copied the list's Swaps only into it on the person's first write.
      - (m): the turned-on side is identical on both builds, with the list's own Open to (Both).
      - (n), raw. Under 24 hours, both lists and both row sides hold `2026-11-21 03:30:00.123456+00` on both builds, to the microsecond. Over 24 hours, both lists and both row sides hold the new list's own `created_at`, its transaction's `now()`, on each build. Two runs cannot share a `now()`.
    - The diffs: `diff.txt` (by label) and `diff-content.txt` (rows keyed by their lists).
  - **8.4.** During the new-code run, both drift scripts ran read-only after every step: 0 on checks 1 to 7 every time. Note 1 (an offer on a post now led by another list) read 0 after (b) and (c). It read 17 from (h3) on: the takeover handed row 1000303, which 17 offers name, to `lt2 wants spares`. Note 3 (hides a pre-`hidden_trade_post_by_row` build reads differently) read 1 from (b) on and 2 from (i1) on. Both notes are information.
  - **8.5.** `check-pairs.ts` ran `fetchPairs(sql\`true\`, "entry", null)` and `loadContext` on every pair, read-only. **97,100 pairs** (280 forward, 96,820 reverse) over 31 partner lists: every `partnerSale` and `partnerWantsSwaps` equals the `sale` and `wantsSwaps` that `loadContext` gives the partner list (the new entry's list). 0 mismatches; 212 pairs carry `partnerSale`, 957 `partnerWantsSwaps`. **Deviation:** `INDEXER_DATABASE_URL` in `.env.local` is not local, and the local `indexer_local` has no `objekt` table. So `@repo/db/indexer` was replaced, for this run only, by a Bun preload plugin that answers every query with no rows. The plugin was proved to take effect, and `loadContext`'s holdings read does not bear on the two flags.
  - **8.6, the browser pass.** **To rule on:** the `.env.local` this pass ran on points `INDEXER_DATABASE_URL` at a non-local host, the same host as the root `.env`'s indexer (the URLs differ in full). So the dev server's Browse and For you holdings reads went to that host, read-only, through the pass. Nothing was written there. It used the dev server from this worktree on port 3200 (`.env.local`) and `browser-use` on the automation Chrome (`BU_CDP_URL` 9333). Each account had its own tab in its own isolated context. Both signed in by `fetch('/api/auth/sign-in/email')` from the loaded page, so no form was submitted and no credential reached a URL or the dev-server log (grep: 0). Every write went through the UI. The new drift script read 0 on checks 1 to 7 after each step:
    - (a) localtest1 chose Hide post in the `⋯` menu of `lt2 spares · lt2 wants spares` on Browse. It left Browse at once, and one hide was stored on row 1000303. `trade.myPosts` gave that post `postId` 1000303.
    - (b) Setup: localtest2 took `lt2 quiet` off Trade from its post menu, since the composer offers only a list in no other live post. localtest2 then opened Edit post, picked `lt2 quiet` as the have list (the composer warned "lt2 spares will be unpaired") and saved.
      - For localtest1, the post stayed off Browse and For you. `/account/hidden` listed it once, as "lt2 quiet · lt2 wants spares".
      - localtest2's `trade.myPosts` shows the edited post at `postId` 1000303.
      - Row 1000303 holds (lt2 quiet, lt2 wants spares), `lt2 spares` is in a new off row (1000515), and `lt2 quiet`'s parked row 1000452 is gone.
      - Note 1 read 17, information.
    - (c) localtest2 edited it into a Buy post of `lt2 wants spares`. It stayed hidden for localtest1 (`/account/hidden`: "lt2 wants spares"), with `postId` 1000303.
    - (d) localtest2 posted `lt2 spares` on its own through New post (row 1000515 on). localtest1 sees it on Browse, and its menu offers Hide post.
    - (e) localtest2 took the Buy post off Trade, then posted it again through New post. It came back as `postId` 1000303, off Browse and For you for localtest1, still hidden (the same hide, `created_at` unchanged).
    - (f) The console was not hooked during (a) to (e). The pages of every step were revisited with a collector of `console.error`, `console.warn`, `error` and `unhandledrejection`. Only "ResizeObserver loop completed with undelivered notifications" appeared (32 times in the dev-server log). It is the browser's layout notice, not an error the app raises. Nothing else was found, on the client or the server. The dev-server log carries the client's unhandled errors (the ResizeObserver lines) but not `console.error`, and `vite.config.ts` sets no console forwarding, so a `console.error` during the live clicks of (a) to (e) went unobserved.
  - **Trial runs.** Before the official old-then-new sequence, `paths.ts` ran twice on the new code to shake out the script. The fixes were that (g5)'s unpair became a Buy post and the raw (n) values are read right after each create. `restore.sh` followed each run, and the re-read was byte-identical.
  - **8.7.** `restore.sh` wrote back `record.json` in one transaction, which removed the lists the runs created and re-inserted row 1000452 under its id. The re-read is byte-identical. Both drift scripts read 0 on checks 1 to 7 and on the notes. `apps/worker/.planner-shared/` is gone, the scratch worktree is removed, the browser contexts are closed and the dev server is stopped. `git status --short` shows only this change's files, and the stash holds 34. The scratch folder stays until the owner has seen the results. It holds `safety.sql` (47 MB, the data-only dump) as well. Outside the record, the restore leaves two Better Auth `session` rows, one each for localtest1 and localtest2, from the two sign-ins.
- **10.1, agent docs** (`writing-for-agents`).
  - `packages/db/AGENTS.md`, Trade posts:
    - writers go through `writePosts` and the pure `planPostChange`;
    - the state columns are "written per row from the write (and by `bumpPerson`, for bumps), with `lists.discoverable` and `bumped_at` derived from the rows";
    - Edit post keeps its row, which takes the new lead, so the post keeps its id and hides, and the list the row led keeps an off-Trade row;
    - the planner holds a list in several rows, and `planPost`'s `trade_post_list_in_post` and drift check 2 keep production at one row per list;
    - the drift line names what checks 5 and 6 read now.
  - `apps/worker/AGENTS.md` (6.2) and `packages/api/docs/trade.md` (4.4) were checked against the code as built and match it:
    - the drift script's checks 2, 5 and 6 and its notes;
    - `partnerSale` and `partnerWantsSwaps` in `pairs.ts`, with `judge` reading the recipient's flags from `context.ts`;
    - `componentOf`'s seeding, its throw and the unused `newPost`;
    - `rowStateOf`'s rules and `writeLists`;
    - `writeList`'s insert still setting `discoverable` and `bumped_at`.
  - `packages/api/docs/offers.md` was stale and is updated: its "four cases" where `post_id` and `post_list_id` part ways gains a fifth, Edit post keeping its row with a new lead. The drift script's first note counts the last three.
  - `packages/api/AGENTS.md`, `apps/web/AGENTS.md` and the root `AGENTS.md`: none of their conventions, traps or workflows changed. None names the planner, the row state or Edit post's row. The diff adds no procedure, input, cache key, `.tsx` or message.

## Context

See proposal.md for why. This is change 7 of the shared-lists chain:

`trade-post-state` → `trade-post-hides-by-row` → `trade-post-planner-shared` → `trade-post-state-contract` → `trade-post-reads-by-row` → `post-id-inputs` → **this change** → `shared-lists`.

Paths are under `packages/api/src/` unless they say otherwise. Line numbers are from `cd0aec18`. Its app code equals production web `0b0a4430`, which went live 2026-11-22 at about 09:38 UTC.

**What binds this change.**
- `packages/api/AGENTS.md`: a `/rpc` input that an open tab sends must still validate to the same data.
- The owner, 2026-11-21: public outputs may break, and each break is listed for the owner's yes.
- `post-id-inputs`, Open Question 3, answered yes: a post card and the console follow their post through Edit post.
- `post-id-inputs` decision 1: its fallbacks go "once this build has served a day".

**What is already true.**
- `createOffer` stores `post_list_id`. It also stores `post_id`, the lowest row that list leads, resolved inside the INSERT (`services/offer/index.ts:360-366`).
- Nothing reads `post_id`. `packages/api/docs/offers.md` lists five cases where it and `post_list_id` part ways:
  - (a) the lead list is deleted and the row is re-led to its want list;
  - (b) a merge deletes the row, leaving `post_id` NULL;
  - (c) a merge hands the row to another list;
  - (d) a Buy post gains a have list;
  - (e) Edit post changes the lead.
- With one row per list (`planPost`'s refusal, drift check 2), a list slug names one post. So no rule below changes which objekts an offer may ask for, or which want list it is held to. What changes is the "Offer on" line in cases (a) to (e).
- The offer router is on `/rpc` only (`routers/index.ts:61-108`), so every offer input or output change in this change is non-public.

**Facts from production (2026-11-22, read-only, from the owner's brief).**
- **Note 1: 11 offers.** Each offer's `post_id` row is now led by another list, and the offer's own list still exists. Examples: 8764, 9443, 11229, 11753, 12274, 13303, 13314, 13315, 13373, 13380. Most are case (e).
- **Note 2: 9 offers** whose `post_list_id` leads a row but whose `post_id` is NULL: 8634, 8660, 8665, 8726, 8753, 8797, 8889, 8934 and 9523.
  - The `offer-post-id` archive (commit `52d1db8f`) names only 9523 as made in the window between the migration and the web deploy.
  - The other eight are older offers. Either their list led no row when the 2026-11-16 backfill ran (68 offers were left NULL then), or a later merge set them NULL (case b). The backfill task classifies them before any write.

### Inventory: offer posts

"Now" is `cd0aec18`. "After" is this change.

**Database and writers**

| Where | Now | After |
| --- | --- | --- |
| `packages/db/src/schema.ts:490-501` | `post_list_id` and `post_id`; the comments say `post_id` is "not history" and that nothing reads it | columns unchanged; comments say `post_id` names the post the line reads, and `post_list_id` is the fallback (decision 6) |
| `services/offer/index.ts:360-366` | stores `post_id` as the lowest row `stored` leads | stores the named row when it is the partner's and its lead is `stored`, else the same lowest row; resolved inside the INSERT (decision 3) |
| FK `offer_post_id_trade_post_id_fkey` | `ON DELETE SET NULL` | unchanged (decision 2) |
| The 9 note-2 offers | `post_id` NULL | filled by a one-off approved statement (decision 5) |

**API readers and rules**

| Where | Now | After |
| --- | --- | --- |
| `services/offer/view.ts:44-46`, `:86`, `:114` (`fetchOffers`) | joins `lists pl ON pl.id = o.post_list_id` | `LEFT JOIN trade_post op ON op.id = o.post_id`, then `lists pl ON pl.id = coalesce(op.lead_list_id, o.post_list_id)` (decision 1) |
| `view.ts:207` (`toOfferView`) | `post: { slug, name }` from the list | the same shape, read from the post (decision 1) |
| Callers of `fetchOffers`: `chat/messages.ts:75`, `:112`; `offer/index.ts:492-499`; `trade-view.ts:82`; `trade-history.ts:146` | read `post` | unchanged code; read the new `post` |
| `moderation/report.ts:32` (`excerptOffers`) | reads items only | unchanged |
| `offer/notes.ts` (offer notifications) | carry no post | unchanged |
| `schemas/offer.ts:177-180` (`offer.create` `post`, `wantList`) | slugs | adds `postId`; the slugs are read only without it, for one release (decision 3) |
| `services/offer/core.ts:421-448` (`resolveWantList`, `resolvePostList`) | by slug | add `resolvePostRow(partnerId, postId)`, run in the same `Promise.all` (`index.ts:130-144`); the slug resolvers stay for the legacy fields |
| `lib/offer-recipient-rules.ts:240-262` (`GivesCheck`, `givesRuleOf`) | `{ post: listId }` | `{ post: listId, row?: number }` (decision 4) |
| `services/offer/picker/shared.ts:169-183` (`postWantedAmong`) | the list's partner through `postPartnerSql` | with `row`: that row's `want_list_id` by primary key; without one, as now (decision 4) |
| `schemas/offer.ts:209-219` (`offer.suggest` `post`, `lead`) | slugs | adds `postId`; `post` is legacy for one release; `lead` stays a slug for good, since it breaks a tie among lists (decision 3) |
| `services/offer/picker/index.ts:164`, `:380-405` (`postListsOf`) | the named list and its partner | with `postId`: the row's lead and want lists, under the same `discoverable` and `matchableList` filter (decision 3) |
| `picker/index.ts:294-301`, `:320-330` (the `Suggestion` output) | `postSlug`, `postName`, `wantSlug` | adds `postId`, the post the matches came from; the rest stay for old tabs (decision 3) |
| `services/offer/picker/theirs.ts:207-248` (`partnerListChoices`), `picker/shared.ts:60-62`, `schemas/offer.ts:308-315` (`PartnerList`) | `lists[]`: one per have or sale list on Trade, `want` through `postPartnerSql`; `wantLists[]` | both unchanged, since they are lists; adds `posts[]`, one per row an offer can be on (decision 3) |
| `schemas/offer.ts:241-243` (picker `wantList`, `fromList`) | list slugs | unchanged for good: they narrow by a list's entries, which are the same in every post |
| `lib/offer-prefill.ts:72` (`postSides`), `:101` (`fillMatches`) | lists | unchanged: `postListsOf` still returns the same `PostSides` |
| `apps/worker/src/script/trade-post-drift.ts:24-26`, `:115-128` | notes 1 and 2 | note 1 goes; note 2 stays (decision 7) |

**Web**

| Where | Now | After |
| --- | --- | --- |
| `features/offers/offer-link.ts:12-28` (`OfferStart`), `:40-57` (search), `:62-88` (`offerLink`), `:91-133` (`requestOf`), `:136-138` (`listSlugsOf`) | `matches.post` slug, `?post=` | `postId` beside the slug on the start and in the search, for this release; `?post=` alone still reads; `to`, `start` and `startList` stay lists (decision 9) |
| `features/offers/builder/types.ts:17-44` (`OfferMatches`, `AddedMatches`) | `post`, `postSlug` | add `postId` |
| `features/offers/builder/post-choice.ts:3-121` (`buyPostsOf`, `openPostOf`, `chosenPostOf`, `postProblem`, `offerOnOf`) | posts keyed by slug | keyed by `postKeyOf` (decision 9); `offerOnOf.input` sends `postId` plus the legacy slug |
| `features/offers/builder/form.tsx:117-142`, `:179-205`, `:386-399`, `:530-537` | `chosenPost`, `postSlug` | keyed by post; `postName` and the picker's `post` read the chosen post's lead |
| `features/offers/offer-builder.tsx:133-136` | `added.postSlug` | adds `postId` |
| `features/offers/offer-picker.tsx:189`, `offer-picker-grids.tsx:108-113`, `:327-340` (`useListChoice`, the List choice), `serial-dialog.tsx:81`, `:139`, `:163`, `:313`, `picker-selection.ts:14` | read `lists[]` by slug as lists: names, the List choice, `fromList` | unchanged: `lists[]` stays one entry per list |
| `features/offers/offer-body.tsx:117-121` | "Offer on {post.name}" | unchanged code |
| `features/trade/person-row-view.tsx:120-126` (`offerMatches`) | `post: anchor.list.slug` | adds `postId: focused.id` beside it |
| `features/trade/post-block.tsx:176-181` (objekt ask), `:193-202` (`makeOffer`) | `matches.post: anchor.list.slug` | adds `postId: post.id`; the slug and the lists stay |
| `features/trade/trade-actions.tsx:51` | passes `matches` through | unchanged |
| `features/chat/thread/thread-view.ts:43-50` (`postOfferOf`) | `matches.post: card.post.list.slug` | adds `postId: view.postId` when not null; the slug stays |
| `features/objekt/drawer/market-listing.ts:36` | lists | unchanged |
| `features/trade/offer-loader.ts:90-99` | checks the lists the search names | unchanged: a `postId` addresses nothing, and the server ignores another person's row (decision 9) |

### Inventory: `post-id-inputs`' fallbacks

As that change's As built lists them.

| Where | Now | After |
| --- | --- | --- |
| `schemas/trade.ts:77-108` (`PostRef`, `postRefOf`, `resolvePostRef`) | a ref of `postId` and the legacy id | deleted; the services take a post id |
| `schemas/trade.ts:110-118` (`tradePostInputSchema`) | optional `postId` and `listId`, at least one | `{ postId }`, required |
| `routers/trade.ts:232-250` | `postRefOf(postId, listId)` | passes `postId`; the doc comment loses the old field |
| `services/trade/hide-sql.ts:7-51` (`postRefSql`, `hidePostSql`, `unhidePostSql`) | `CASE WHEN EXISTS …` over both ids, with a list `ELSE` | `posts.post_id = $postId`, and a `DELETE` by `(user_id, post_id)` |
| `services/trade/lists.ts:61-70` (`hidesOfSql`) | used by the unhide legacy branch | deleted; that branch was its last caller |
| `services/trade/hidden.ts:111-150` (`fetchHiddenPosts`) | `postId` and `listId` | `postId` only |
| `schemas/moderation.ts:78-81` | `postId` and `postListId` | `postId`, optional, since a report may name no post |
| `services/moderation/report.ts:86-119`, `:172` (`reportedPost`) | row or list, via `resolvePostRef` and `namedPostsOf` | by row only |
| `services/chat/card-resolve.ts:43-88` (`resolvePostCard`) | a `postId` that names no row is read as absent | it must name a row holding the list, else `invalid_card`; `listSlug` alone still stores no row, for good |
| `schemas/trade.ts:267-270`, `services/trade/feed/posts.ts:183` | feed `postId`, deprecated | removed (**public break**) |
| Web: `features/trade/actions.ts:204`, `hidden-partners-dialog.tsx:202`, `moderation/safety-dialogs.tsx:32`, `:78-79`, `safety-menu.tsx:31`, `:64`, `trade/post-block.tsx:276`, `:383-416`, `person-row-view.tsx:218-222` | send `{ postId, listId }` and `postListId` | send `postId` only |
| Tests: `schemas/trade.test.ts:112-155`; the legacy cases in `lib/report-post.test.ts` and `schemas/chat.test.ts` | the fallbacks | the fallback cases are deleted; tests for the new input shapes take their place |
| Docs: `packages/api/docs/trade.md:51`, `:69`; `docs/chat.md:25`, `:27`; `packages/db/AGENTS.md:20` (Trade posts); `apps/web/docs/trade.md:15` | describe the fallbacks and the reliance on row ids above list ids | those sentences go |

`packages/api/docs/chat.md:23` stays: an excerpt keeps a post card by its list.

### Outputs

| Route | Field | Now | After |
| --- | --- | --- | --- |
| `offer.views`, thread reads, trade page, My trades | `post` | the `post_list_id` list | the post now, else that list (decision 1) |
| `offer.candidates` (whole theirs list) | `posts[]` | none | added: `{ postId, lead, want, buy }` per row |
| `offer.suggest` | `postId` | none | added |
| `trade.hiddenPosts` | `listId` | the lead's id | removed |
| `trade.people`, `GET /api/v1/trade/people` | `posts[].postId` | equal to `id`, deprecated | removed (**public break**) |

## Goals / Non-Goals

**Goals:**
- An offer's post is its `post_id` row, from the builder to the card.
- Every input that names a post an offer is on names it by post id.
- Rollback to `0b0a4430` keeps working, and so do open tabs from `0b0a4430`.
- `post-id-inputs`' one-release fallbacks are gone.

**Non-Goals:**
- See proposal.md.
- Any schema change.
- Any change to a stop-list file (decision 10).

## Decisions

### 1. "Offer on" reads the post as it is now

An offer is on the post its `post_id` names. The line reads that post's lead list as it is now. When the row is gone, it reads the `post_list_id` list. When both are gone, it reads nothing.

**Why.**
- An offer's legs name concrete objekts. Each get item keeps its own list (`offer_item.list_id`, shown as `listSlug`), so the post is context.
- Post cards follow their post the same way (`post-id-inputs`, Open Question 3), and so does the console's report view. An offer that showed a list the post no longer holds would contradict the card above it in the same thread.

**SQL.** One more left join, by primary key:

```sql
LEFT JOIN trade_post op ON op.id = o.post_id
LEFT JOIN lists pl ON pl.id = coalesce(op.lead_list_id, o.post_list_id)
```

`HydratedOffer` and `OfferView.post` keep their shape.

**The five cases, now and after:**

| Case | Now | After |
| --- | --- | --- |
| (a) lead deleted, row re-led to its want list | no line (`post_list_id` NULL) | "Offer on {want list}", the post that survives as a Buy post |
| (b) merge deletes the row | the list | the list (fallback), unchanged |
| (c) merge hands the row to another list | the list | the list that now leads the row |
| (d) Buy post gains a have list | the want list | the have list, the lead of the same post |
| (e) Edit post changes the lead | the old lead | the new lead |
| A post whose only list is deleted | none | none |

**The 11 note-1 offers.**
- After this change, each reads the name of the list that now leads its row.
- Under Open Question 1's alternative, each keeps today's name: its `post_list_id` list, which still exists.
- G1 prints both names and each offer's status, so the owner sees the difference before the deploy.

**Spec.** The requirement changes in `web-trade-offers`. The "Post deleted" scenario now names a post whose only list was deleted, and three scenarios are added.

### 2. `post_id` is written once

No post writer updates `offer.post_id`. A merge that deletes a row sets it NULL (the existing FK), and the line falls back to `post_list_id`.

Rejected: moving offers with hides in `writeMoves` (`services/list/shared.ts:188-201`).
- Hides follow a post's lead through merges, but post cards and report snapshots follow the row id and are never moved. Offers now behave like cards.
- A move would write offer rows under the `lists` and `trade_post` locks the post writers hold. In a takeover (case c) no row is deleted, so no offer row is written today. A move there adds the lock cycles that `offer-post-id` decision 8(b) describes, against `createOffer` and `acceptOffer`.
- The pure model test (`trade-post-rows.model.test.ts`) runs no SQL, so it could not prove the move.

### 3. Offer inputs and outputs by post id

**`offer.create`.**
- It gains `postId: z.number().int().positive().optional()`.
- `resolvePostRow(partnerId, postId)` (`services/offer/core.ts`) reads the row with its lead's type in one statement. It returns null for:
  - another person's row;
  - a row whose lead is not `askableOnTrade`;
  - a row whose lead is a want list that fails `resolveWantList`'s predicate.
- A have or sale lead becomes `post`. A want lead becomes `wantList`.
- The legacy `post` and `wantList` slugs are resolved only when `postId` is absent, with today's code. This keeps the open-tab rule: an old tab's input still means the same thing.
- `resolvePostRow` joins the first `Promise.all` (`index.ts:130-144`), so it costs no round trip.
- Like `resolvePostList`, a missing or foreign row never refuses: the offer is then on whatever post its asks fit.

**Stored `post_id`.** It is resolved inside the INSERT, in place of `index.ts:362-365`:

```sql
coalesce(
  (SELECT tp.id FROM trade_post tp WHERE tp.id = $named AND tp.lead_list_id = $stored),
  (SELECT min(tp.id) FROM trade_post tp WHERE tp.lead_list_id = $stored))
```

- `$named` is `resolvePostRow`'s row, or NULL.
- The INSERT re-checks the row, so a row deleted since the pre-read gives NULL, not a foreign-key error.
- The pure part is `namedRowOf(named, stored)`, unit-tested: the named row only when its lead is `stored`.

**`offer.suggest`.**
- It gains `postId`. `postListsOf` gains a by-row form that returns the row's lead and want lists under today's filter (`discoverable`, `matchableList`). The lead must be among them, as the named list must be today.
- The legacy `post` is read only without `postId`. `lead` stays a slug for good, because the row cut (`chooseList`, `index.ts:310-318`) breaks its tie among lists.
- The output gains `postId`:
  - the named row (`postLists`);
  - `swapPair.theirPostId` for a Can swap pair (already a row);
  - the row `postRowSql` names for the row cut's list (`onePost`) or for You give's want list (`giveWins`).
- `postSlug`, `postName` and `wantSlug` stay for old tabs.

**The theirs list (`partnerListChoices`).**
- `lists[]` and `wantLists[]` stay as they are. They are lists, and the picker reads them as lists: the List choice, names by slug, the serial dialog (inventory).
- It adds `posts[]`, read from the rows in the same statement or one beside it in the same `Promise.all`:
  - one entry per partner `trade_post` row whose lead is `askableOnTrade`, or whose lead is a want list that passes `resolveWantList`'s predicate (a Buy post);
  - each is `{ postId, lead, want, buy }`: the lead's slug, the row's want list's slug while it is a want list on Trade with an entry, else null, and `buy` for a want lead;
  - ordered by lead list id, then row id, which is today's choice order.
- The builder builds its Offer on choices from `posts[]`, taking names and types from `lists[]` and `wantLists[]` by slug (decision 9).
- With one row per list, `posts[]` names today's choices: each `lists[]` entry with its `want`, then each `buy` want list.

**Lists stay lists.**
- `fromList` and the picker's `wantList` narrow the pickers by a list's entries, which are the same in every post.
- `to` addresses a conversation through a list.
- `start` opens You get's picker on a list.

Each stays a slug for good.

**The legacy slug inputs** (`offer.create` `post` and `wantList`, `offer.suggest` `post`, the offer page's `?post=`) go in the first change after this build has served a day: `shared-lists`, or a cleanup before it.

### 4. Only offers with what I want reads the named row

`givesRuleOf` (`lib/offer-recipient-rules.ts:246-262`) gains the named row:
- `check.post` becomes `{ post: listId, row?: number }`;
- `row` is set when `resolvePostRow` named a row whose lead is `onPost`.

`postWantedAmong(listId, row?)` reads `trade_post.want_list_id` by primary key when `row` is set. Otherwise it reads `postPartnerSql`, as now.

With one row per list the two give the same want list. This is the rule `shared-lists` needs, where a have list in two posts has two want lists.

Unit cases in `offer-recipient-rules.test.ts`:
- `row` is set only for the named row;
- a counter that asks nothing new still checks `every`.

### 5. Backfill the 9 note-2 offers: one-off, approved, by ids

**First, read-only:**
- the note-2 query;
- each offer's `created_at`, status and `post_list_id`;
- the row each `post_list_id` leads now (`min(id)`);
- that row's `created_at`.

Classify each as:
- **window**: made between the `offer_post_id` migration and the web deploy;
- **older**: NULL at the 2026-11-16 backfill, or nulled by a merge (b).

The two older causes cannot be told apart from the data. Both get the same rule.

**Then, only with the owner's approval of this exact statement:**

```sql
BEGIN;
SET LOCAL lock_timeout = '3s';
LOCK TABLE trade_post IN SHARE ROW EXCLUSIVE MODE;
UPDATE offer o
SET post_id = (SELECT min(tp.id) FROM trade_post tp WHERE tp.lead_list_id = o.post_list_id)
WHERE o.id = ANY('{<the ids read above>}'::int[])
  AND o.post_id IS NULL
  AND o.post_list_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM trade_post tp WHERE tp.lead_list_id = o.post_list_id)
RETURNING o.id, o.post_id;
COMMIT;
```

- **Expected:** 9 rows, or the count the read returned.
- **It is idempotent:** a second run sets nothing.
- **It writes only the listed ids.**
- **Locks:** `deleteList` locks `trade_post` rows before `offer` rows. So the statement takes `LOCK TABLE trade_post IN SHARE ROW EXCLUSIVE MODE` first, as `20261115164916_offer_post_id` did, and waits on nothing in reverse. Post writers wait for the lock, which is held for one 9-row `UPDATE`. A lock wait ends at the 3 s timeout, and the statement is rerun at a quiet time.

**Why a one-off and not a migration.**
- Decision 1 shows these offers the same list with or without the backfill: their row's lead is their `post_list_id`, by the note's condition. The write only gives them an address, so a later edit of that post moves their line too.
- A migration's open condition would also rewrite whatever merges NULL by then, on every database it ever runs on. It would also cost a migrate image build on the VPS for 9 rows.
- An id-bound statement the owner approves is the narrowest write.

The backfill is not needed for the deploy, and it can run any time after G1.

### 6. `post_list_id` stays

It remains:
- the fallback when a row ended in a merge (b);
- the line for offers from before rows existed (left NULL at the 2026-11-16 backfill);
- what `0b0a4430` reads after a rollback.

`createOffer` keeps writing it. Dropping it would remove the line from those offers (Open Question 2). G1 counts them.

### 7. Drift notes

- **Note 1 goes:** an offer on a post now led by another list is decision 1's intended state.
- **Note 2 stays.** It counts offers that read their post through the fallback while their list leads a row. After decision 5 it reads 0. A later merge or a list that gains a row can raise it, and neither is wrong data.

The header (`trade-post-drift.ts:24-26`) and `apps/worker/AGENTS.md` (Trade post drift) change with it. The script runs from a checkout, so the worker image does not change.

### 8. Removing `post-id-inputs`' fallbacks, in this deploy

The removals share no code with the offer work. They ride the same deploy for three reasons:

**Open tabs.**
- A tab loaded on `0b0a4430` sends `{ postId, listId }` and `{ postId, postListId }`. The new schemas strip the old key and read `postId`. Its Hidden list reads `listId` from `trade.hiddenPosts` only to send it back; without it, the tab sends `{ postId }`, which validates.
- A tab loaded before `0b0a4430` sends `{ listId }` alone to Hide post and Unhide, which then fail validation until it reloads. Its Report this post… sends `postListId` alone, which the new schema strips: the report is filed, with no post snapshot. That build was replaced on 2026-11-22. G1 checks that `0b0a4430` has served a day before this deploys, as `post-id-inputs` promised.

**Rollback.**
- To `0b0a4430`: this build's tabs send `postId` alone, which `0b0a4430` accepts (`postId` and `listId` are both optional there, at least one required; report's `postId` is optional).
- `0129b5c4` requires `listId`, so the web rollback floor becomes `0b0a4430`. The database floor stays at `8b05487c`.

**Size.** The removals are one group of tasks (group 5) with their own checks.

A separate change was considered. It would add a deploy and a G1 for code that is only deleted, and it would buy nothing: both parts share one gate and one floor.

**Public break:** `GET /api/v1/trade/people` `posts[].postId`, deprecated since `0b0a4430`. The api-openapi requirement changes, and the document loses the field.

### 9. Web: the builder keys posts by id

**Choices.**
- A choice is `{ postId, slug, name, type, want, buy }`, built from `posts[]`, with `name` and `type` from `lists[]` and `wantLists[]` by the lead's slug.
- Without `posts[]` (a server from before, after a rollback), choices are built as now from `lists[]` and `buyPostsOf(wantLists)`, with `postId` null.
- `postKeyOf(choice)` is `postId ?? slug`, so the builder keys its choices either way.
- `openPostOf` takes `startPost` and `matchesPost` (post ids) before the slug inputs it reads today.
- `chosenPostOf`, `offerOnOf` and the select's value take keys.
- `postProblem` compares a pick's `listSlug` with the chosen post's lead slug, which is what it compares now.
- `offerOnOf.input` is `{ postId, post }` or `{ postId, wantList }`. The slug is there for a rollback.

**Starts.**
- `OfferStart` gains `postId`, the post the builder starts from, and keeps `matches.post`, the post's lead slug, for this release. With `match=post`, the matches are that post's.
- The search carries both `postId` and `post` for this release. `requestOf` passes `startPost`, and the matches carry `postId` and `post`, so `offer.suggest` reads the slug after a rollback to `0b0a4430`.
- A reopened URL with `?post=` alone starts where it did.
- The callers in the inventory pass `post.id`, `focused.id` or the card view's `postId`.
- `offer-loader.ts` needs no new check: a `postId` addresses nothing (`to` does), `openPostOf` ignores an id among no choice, and the server ignores another person's row.

**Labels.** No string changes in en, ko or ja. With one row per list, no two choices share a lead. Two choices with the same name appear only in this change's hand-made test of a list in two rows. Labelling that case is `shared-lists`' job.

**Tests.** `post-choice.test.ts` and `offer-link.test.ts`. Their cases:
- choices keyed by id;
- a key with no `postId`;
- `openPostOf` from `startPost` and `matchesPost`;
- `offerOnOf` sending both shapes;
- `requestOf` and `offerLink` round-tripping `postId`;
- the legacy `?post=`.

The implementer loads `vercel-react-best-practices` before the first `.tsx` edit. A repo hook (`require-react-skill.ts`) holds the edit until they do.

### 10. Reads whose SQL changes, and G1

**Stop list.** No hot Trade read changes. The implementer stops and asks if the diff touches any of:
- `services/trade/feed/query.ts`;
- `services/trade/matches/candidates.ts`;
- `services/trade/feed/counts.ts`;
- the worker's `job/want-alerts/pairs.ts` or `context.ts`.

**What changes:**

| Read | Frequency | G1 |
| --- | --- | --- |
| `fetchOffers` (`view.ts:73-117`): every thread page with offers, `offer.views`, the trade page, My trades | hot | timed, old against new |
| `partnerListChoices` (`theirs.ts:207-248`): every builder open | frequent | timed |
| `postListsOf` by row (`picker/index.ts:380-405`): a builder opened with a post's matches | frequent | timed |
| `resolvePostRow`, `postWantedAmong` by row, the INSERT's `post_id` subquery: one each per send | send only | plan only |
| `hidePostSql`'s `SELECT`, `unhidePostSql` (simpler than before) | per click | `SELECT` timed; `DELETE` plan only |

**G1 reuses `post-id-inputs`' harness.** It takes `explain-lib.ts` and `G1-RUN.md`'s shape from `/private/tmp/claude-501/post-id-inputs/`:
- read-only refusal;
- `EXPLAIN (ANALYZE, BUFFERS)` under a 60 s `statement_timeout`;
- a plain `EXPLAIN` past the timeout;
- the CTE and rescan report;
- one warm-up, then three runs per build.

The old build is `0b0a4430`, in a fresh throwaway worktree outside the repo.

**Inputs:**
- the three conversations with the most offers: their newest page;
- the 50 newest offers of the user with the most;
- the three partners with the most rows on Trade, for `partnerListChoices` and `postListsOf` on their largest row.

**Stop if:**
- a new read's warm median is over 1.5 times the old one;
- a rescanned node is a CTE estimated at 1 row;
- a drift check is non-zero.

`hidePostSql` reads `postsCte`, so the 1-row rule applies to it. The other reads have no CTE.

### 11. Proof, kept light

**Pure tests:**
- `namedRowOf`;
- `givesRuleOf` with a row;
- the web's `post-choice` and `offer-link`;
- the narrowed input schemas, including old-tab inputs of `0b0a4430` and of the build before it.

**Checks:** `bun run check`, `bun run build --filter=web`, `bunx oxfmt --check`.

**Drift**, read-only, before and after the deploy.

**One local browser pass** (task 6.3).

**G1 and G2.**

No frozen reference, differential or mutation testing.

## Risks / Trade-offs

- **[The line changes for offers on edited posts]**
  - Decision 1 changes it in cases (a), (c), (d) and (e).
  - G1 prints the 11 note-1 offers both ways.
  - Open Question 1 is the switch.
- **[A tab from before `0b0a4430`]**
  - Hide post and Unhide fail until it reloads.
  - Report this post… files the report without the post.
  - Gated on `0b0a4430` having served a day.
- **[New tabs after a rollback to `0b0a4430`]**
  - Offer inputs carry the slugs too.
  - `postKeyOf` keys choices without `postId`.
  - Hide, unhide and report send `postId`, which that build reads.
- **[Old tabs after the deploy]**
  - Offer inputs without `postId` are read by slug, as today.
  - The new outputs' added fields are ignored.
  - `offer.views`' `post` keeps its shape.
- **[`fetchOffers` slower]** One primary-key join. G1 times it on the heaviest threads.
- **[A merge drops an offer's row]** The line falls back to `post_list_id` (decision 2), which therefore stays.
- **[The backfill]**
  - A production write of 9 rows.
  - It runs only after a read-only classification and the owner's approval of the exact statement.
  - Lock waits end at 3 s.

## Migration Plan

1. Build groups 1 to 5 in the `shared-lists-orca` worktree, then do the local proof (group 6).
2. The owner commits and pushes. CI passes.
3. **G1** (task 7.1), production, read-only, with a go-ahead:
   - the old drift script at 0 on checks 1 to 8;
   - the gate, the counts and the note-1 table;
   - the timing.
4. The owner brings up web from the pushed commit. No migrate, and no worker rebuild.
5. **G2** (task 7.3), read-only:
   - the new drift script at 0, with note 1 gone and note 2 unchanged;
   - the owner opens a thread with offers, the offer page from a post, and Hidden on Trade;
   - Sentry shows no new issue for an hour.
6. **Backfill** (task 7.4), only with the owner's approval of the statement: the classification first, then the write, then note 2 at 0.
7. **Rollback:** web `0b0a4430`, at any time, with no data step:
   - `post_list_id` is still written;
   - the backfill only filled NULLs;
   - the floor is now web `0b0a4430`, and the database floor stays `8b05487c`.

## Open Questions

Answered by the owner on 2026-11-22: all three recommendations stand, and the owner approves removing `posts[].postId` from `GET /api/v1/trade/people`. The backfill statement still needs the owner's separate approval when its task runs, after the read-only list of ids.

1. **What does "Offer on" show for an offer whose post was edited?**
   - Recommend the post as it is now (decision 1): it matches the post card and the console, and the legs already name each item's list.
   - What it changes: if the owner wants the list the offer was sent on, `fetchOffers` stays as it is, reading `post_list_id` only. Decision 1's table keeps today's column, the `web-trade-offers` delta goes, note 1 stays, and `post_id` stays unread until a feature needs it.
2. **Keep `offer.post_list_id`, or drop it later?**
   - Recommend keeping it. It is the line for offers whose row ended in a merge and for offers from before rows existed, and it costs one integer column.
   - What it changes: dropping it removes "Offer on" from those offers. G1 counts them (`post_id IS NULL AND post_list_id IS NOT NULL`). It would also take a two-step contract change after this one, as `trade-post-state-contract` did: a retire migration with the build that stops writing it, then the drop. A rollback below that build becomes impossible.
3. **Backfill the 9 note-2 offers: a one-off by ids, a migration, or not at all?**
   - Recommend the one-off of decision 5. It shows the same line either way, but gives these offers an address, so a later edit of their post moves their line as for every other offer.
   - What it changes:
     - A migration writes whatever NULLs exist when it runs, on every database, and needs a migrate image build.
     - Skipping leaves note 2 at 9, and these offers keep showing their list after a later edit of the post.

## As built

Scratch: `/private/tmp/claude-501/offer-reads-post-id/` (`asbuilt-notes.md` holds the same notes; the baseline, compare outputs, logs and G1 harness sit beside it).

**0.1 Baseline.** From `cd0aec18` (app code equal to `0b0a4430`), dev server on `:3211` with `.env.local` (`DATABASE_URL` checked local by `q.sh` before any write). As localtest1, in an isolated browser context, signed in by `fetch` from the loaded page, saved to `baseline/`: `offer.candidates` (side `theirs`, whole list) for localtest2, `offer.suggest` as `{ partnerId }`, with `mutual`, and with `post`/`lead` = `lt2extras` (localtest2's first post, row 1000304), `chat.thread` 397 and `offer.views` of its 44 offers. Sessions: 346 before; one made (localtest1) and deleted; the ids read back equal to before. A first attempt timed out on a cold navigation before signing in; its browser context was disposed. No credential reached the dev-server log.

**1.1.** `PartnerPost { postId, lead, want, buy }` in `schemas/offer.ts`. Schema tests: `offer.create` with `post` alone and with `wantList` alone, and `offer.suggest` as `{ partnerId, post, lead }`, each parse to equal data; `postId` parses beside the slug.

**1.2.** `resolvePostRow` (`services/offer/core.ts`) is one statement: the row, its lead, whether the lead is `askableOnTrade`, and `resolveWantList`'s Buy-post predicate. `namedRowOf` sits in `lib/offer-recipient-rules.ts` (3 cases). Local `EXPLAIN` (no `ANALYZE`) of the INSERT's `post_id` subquery, alone and inside an `INSERT`, in a read-only session (`default_transaction_read_only` on, `offer` count 88 before and after): two uncorrelated InitPlans, on `trade_post_pkey` and `trade_post_lead_list_id_idx`.

**1.3.** `givesRuleOf` takes `named` and sets `row` only through `namedRowOf(named, onPost)`. `postWantedAmong(listId, slugs, row?)` reads `trade_post.want_list_id` by primary key with `row`. Cases added: 4 for `givesRuleOf`, 3 for `namedRowOf`; the file passes 63.

**1.4.** `posts[]` comes from a second statement (`postChoices`) beside the list read, in one `Promise.all`. Against 0.1, on the local database: `lists`, `wantLists` and every other key are equal, and `posts` names today's choices, `lists[]` with their `want` and then the Buy posts, in today's order (`compare-1.txt`). **Deviation:** `posts[]` is ordered have and sale posts first, then Buy posts, each by lead list id and then row id. Ordering by lead list id alone would put localtest2's Buy post `lt2wants` (list 13142) before every have list, which is not today's choice order.

**1.5.** `postListsOf(partnerId, { postId } | { slug })`. By row, it reads the lead and the want list through the row, under the same `discoverable` and `matchableList` filter, and requires the lead. The output's `postId` is `giveWant`'s row when You give wins, else the row cut's row, else `swapPair.theirPostId`, else the named row. The row cut's list read and the legacy by-slug `postListsOf` each gain `row: postRowSql("lists")`: two scalar subqueries per returned list, on the `trade_post` indexes, in no CTE. Against 0.1: `suggest`, `suggest-mutual` and `suggest-post` are equal with `postId` added (1000303, 1000303 and 1000304). `{ postId: 1000304, lead }`, and `{ postId: 1000304, post: "lt2spares", lead }`, are each equal to the baseline's `suggest-post`, so `postId` wins over `post`.

**2.1.** `fetchOffers` adds `LEFT JOIN trade_post op ON op.id = o.post_id`, and joins `lists pl` on `coalesce(op.lead_list_id, o.post_list_id)`. In `schema.ts`, only the two comments change.

**3.1 to 3.3.** `post-choice.ts` gains `postKeyOf` (the post id as a string, else the lead's slug; one choice set is all ids or all slugs) and `postChoicesOf`. `openPostOf` returns a key. `chosenPostOf` and `offerOnOf` take keys. `offerOnOf.input` is `{ postId, post }` or `{ postId, wantList }`, with `postId` left out for a choice from a server before `posts`. In `offer-link.ts`, `OfferStart.postId` and `matches.postId` are written to the search's `postId`. `requestOf` gives `startPost`, and `matches.postId` with `match=post`. `withoutLists` drops `postId`. **Naming deviation:** `openPostOf` keeps its slug inputs' names (`startList`, `matchesPost`, `addedPost`), so the id inputs are `startPost`, `matchesPostId` and `addedPostId`. Tests added: 8 in `post-choice.test.ts`, 5 in `offer-link.test.ts`. In `form.tsx`, the one-post hint counts the choices that are not Buy posts, the same set as `theirLists` before. `postOfferOf` reads the card view's `postId` (on the card, not `card.post`). The grep finds three `post:` matches, each beside `postId`.

**4.1.** Drift note 1 is gone from `NOTES` and the header. Worker checks pass.

**5.1 to 5.3.** Deleted: `PostRef`, `postRefOf`, `resolvePostRef`, `postRefSql` and `hidesOfSql`.
- `hidePostSql` filters `posts.post_id = $postId`. `unhidePostSql` deletes by `(user_id, post_id)`.
- `reportedPost` reads by row only (`postsByRowOf`).
- `resolvePostCard` requires its `postId` row, else `invalid_card`.
- The feed's `postId` is gone. `/api/v1/spec.json` from the dev server lists the `/trade/people` post properties as `bumpedAt`, `hidden`, `id`, `match`, `narrowed`, `ruleMatches`, `sides`, `tags` and `updatedAt`: no `postId`, and no `deprecated` anywhere in the document.
- `schemas/chat.test.ts` is unchanged. Its post-card cases cover the stored shapes and `listSlug`-alone inputs, which stay for good, and it already covers `{ kind: "post", listSlug, postId }`.
- `grep "postListId|listId: anchor.list.id|listId: post\.listId" apps/web/src` is empty.
- `packages/db/AGENTS.md` (Trade posts) also loses "`post_list_id` stays as the offer's history", which decision 1 made false. Its sentence on the NULL window is left for 8.1 and 7.4.

**6.1.** Results:
- `bun run check`: exit 0. Tests: `@repo/api` 1352, web 1554, worker 552, `@repo/lib` 224, `@repo/cosmo` 58, indexer 34, `@repo/lint` 8, `@repo/email` 6, with 0 failing.
- Lint warnings: one in `@repo/api`, the `no-map-spread` in `services/objekt/serial-anchored.ts`, which was there before this change. Every other package has none.
- `bun run build --filter=web`: exit 0.
- `bunx oxfmt --check`: clean.
- `git diff --stat cd0aec18` over the stop list: empty. No message file changed.

**6.2.** G1 is prepared in `g1/`, with `G1-RUN.md`. The old build is at `/private/tmp/claude-501/offer-reads-post-id/old` (`0b0a4430`, `bun install` done), left in place for G1. `rebuild.ts` rebuilds every statement for the build it runs on. Locally, `verify.ts` found each rebuilt statement equal to the real read, text and values, on both builds. Neither build's bundle reaches `services/redis` or `env.ts`. Every script was run on the local database on both builds (`g1/local/`, `g1/local-summary.txt`). The warm medians are in `G1-RUN.md`. `G1-RUN.md`'s `run_g1` was also run locally on both builds, with `.env.local` added. Two readings for G1:
- **The new `hidePost` `SELECT`:** `posts.post_id = $1` is pushed into each scan of the `on_trade` CTE. `CTE Scan on on_trade p` and `on_trade h` are each estimated at 1 row and looped twice, once per row of the named post in `a`. The old build's `CASE WHEN EXISTS` kept the filter out of the scans. The loops are bounded by one post's sides, but the plan matches the stop rule. Locally, its execution time is 4.0 ms new against 6.3 ms old.
- **The new by-slug `postListsOf`:** 0.57 ms against 0.32 ms locally. It gains `postRowSql`. Only a tab from before post ids sends `post` alone.

The other timed reads are within 1.5 times the old build locally, or are new reads. No other plan has a rescanned CTE estimated at 1 row. `fetchOffers`' rescanned `Seq Scan on offer n` and `offer p` are the same on both builds.

**Review fixes (before 6.3).**
- Decision 8, Risks and the proposal said a tab from before `0b0a4430` fails on Report this post…. It does not: the schema strips `postListId`, and the report is filed with no post snapshot. Only Hide post and Unhide fail. The text now says so, and `lib/report-post.test.ts` checks that `postListId` alone parses to a report naming no post.
- `openPostOf` gave the suggestion's post precedence over the start and the row's matches. It now keeps the old order: the start, then the matches' post, then the added matches' post, each by id before its slug. `post-choice.test.ts` gains the case of a start with a row match. `apps/web/docs/offers.md` says the same.
- `G1-RUN.md` records the coordinator's waiver for `hidePost`'s `on_trade` scans estimated at 1 row (loops of 2 at most). G1 still times the statement and stops on it only by the 1.5 times median rule.
- `packages/db/AGENTS.md`: this change reconciles the NULL `post_id` window, through 7.4's backfill.
- Checks after the fixes: lint, typecheck and test for `@repo/api` (1353) and web (1555), `bun run build --filter=web`, and `bunx oxfmt --check`: all pass.

**6.3 Local pass.** Dev server on `:3211` (new build) with `.env.local`. Each account had its own isolated browser context in the automation Chrome. localtest1 and localtest2 signed in by `fetch` from the loaded page. localtest5 signed in through a hand-made local session row. Logs `s63-*.log` and screenshots `s63/` are in the scratch folder.

1. **Drift before:** old and new scripts 0 on every check, notes 0, 411 rows.
2. **Saved, read-only** (`saved/before/`), 24 files:
   - whole tables: `offer`, `offer_item`, `trade`, `trade_leg`, `trade_substitute`, `trade_cancel_request`, `notification`, `message`, `message_flag`, `conversation`, `conversation_member`, `message_pref`, `trade_post`, `hidden_trade_post`, `hidden_trade_partner`, `report`, `mod_audit`, `user_block`, `want_alert_sent`, `locked_objekts`;
   - the three accounts' `lists`, their entries and their `user` rows;
   - every session id.
3. **Data set up for the pass**, inside the approved accounts and put back after:
   - localtest2's `message_pref.allow` from `nobody` to `anyone`, as `post-id-inputs` 5.3 did. Its post page offered no Make offer before.
   - localtest5's `user.role` from none to `admin`, since localtest5 was not staff locally.

**The steps:**
- **(a) Passes.** As localtest1, the `lt2 extras` post page's Make offer link carried `postId=1000304` beside `post`, `start` and `to`. The builder opened on Offer on `1000304` with the post's 2 matches, and Send stored offer 317 with `post_id` 1000304 and `post_list_id` 13169. Both people's cards read "Offer on lt2 extras". Drift: 0 and 0.
- **(b) Passes.** Row 1000524 was added for `lt2 extras` (13169) with want list `lt2 wants spares` (13402), by local SQL; drift then reads only check 2 (lists 13169 and 13402). `posts[]` lists both `lt2 extras` rows (1000304 with want 7bnmLvQ2M, 1000524 with want Ec6Vd_tJQ). The builder, opened with `postId=1000524`, set Offer on to 1000524, and its options read `lt2 spares`, `lt2 extras`, `lt2 extras` (selected), `lt2 sale`, `lt2 quiet` and `lt2 wants`. You get's picker names `lt2 extras` once. No serial dialog opened: `lt2 extras` holds any-serial entries only. Through `fetch` from the loaded page, with the builder's own input (`{ postId: 1000524, post: "lt2extras" }`):
  - a give on 1000524's want list (YeonJi 118Z) was stored as offer 318, `post_id` 1000524, `post_list_id` 13169;
  - a give only on 1000304's want list (YooYeon 113Z) was refused `not_wanted`, with localtest2's Only offers with what I want on.
- **(c) Passes.** As localtest2, through `takeDownPost` (lt2 quiet) and `savePost` (`replaces: lt2extras`), the procedures Edit post calls, row 1000304 kept its id and now leads `lt2 quiet`. 317's card reads "Offer on lt2 quiet" for both people (`offer.views` and the expanded thread card); 318 reads "Offer on lt2 extras". Drift: check 2 on both scripts; old note 1 lists 10 offers, including 317; the new script has no note 1.
- **(d) Accept passes; the "Offer on" part does not happen.** localtest2 accepted 318 (trade 94, offer `accepted`, `post_id` 1000524), and the accepted card reads "O-318 / Accepted · T-94". The trade page (`/trade/mine/94`) and My trades show no "Offer on" line for either person, on either build. `offer_on_post` is drawn only by the thread's offer card (`offer-body.tsx:119`, through `offer-card.tsx`, used by `thread.tsx`). `trade-view.ts:82` and `trade-history.ts:146` call `fetchOffers` but never draw `post`. Drift: as (c).
- **(e) Passes.** localtest1 sent a post card for 1000524 (`chat.send` with what the web sends; stored `{ kind: "post", listId: 13169, postId: 1000524, match }`). Add to message › Make offer opened `/offer?conversation=397&match=post&post=lt2extras&postId=1000524&start=lt2extras`, with Offer on set to 1000524.
- **(f) Passes.**
  - `offer.create` with `post` alone stored offer 319, `post_list_id` 13169 and `post_id` 1000524, the lowest row `lt2 extras` led by then.
  - `offer.create` with `wantList` alone (`lt2wants`) stored offer 320, `post_list_id` 13142 and `post_id` 1000439.
  - `offer.suggest` with `post` alone returned `postSlug` `lt2extras` and `postId` 1000524.
  - `trade.hidePost` `{ postId: 1000303, listId: 13168 }` hid 1000303, and `unhidePost` with the same input removed the hide.
  - `{ listId: 13168 }` alone got 400 (input validation, `postId` required) on both.
- **(g) Passes.** localtest1 reported localtest2 with `postId` 1000524 (report 23, snapshot `postId` 1000524 with `lt2 extras` and `lt2 wants spares`). The same report with `tradeId` 94 was refused `not_reportable`, the existing rule. As localtest5, `/mod/reports/<localtest2>` showed the report with both lists, and `/mod/trades/94` showed T-94 and its leg, with no console error. The first navigation to `/mod` in a fresh context answered not-found; the second loaded. The mod routes are not touched by this change.
- **(h) Passes.** The dev-server log has no server error. On the client, one React warning appeared once, during (a), as the offer page opened: "This library called use() to suspend in a previous render but did not call use() when it finished". `post-id-inputs` 5.3 saw the same warning on the build before. Two more passes of that navigation on each build (old on `:3212`) did not show it. No other console error.

**Put back.**
- In one transaction with `session_replication_role = replica`, every whole table above was reloaded from `saved/before`. The three accounts' lists, their entries and their user rows were reloaded the same way. Every session not in the snapshot was deleted.
- Re-saved to `saved/after/`: all 24 files byte-identical to `saved/before`. The session ids equal 0.1's list.
- Drift after: old and new both 0 on every check, notes 0, 411 rows.
- Sequences were left advanced (offers to 320, trade 94, report 23, row 1000525). Local Valkey keeps the trade versions the pass bumped.
- No credential in `dev-6.3.log`, `dev-old-6.3.log` or any `s63-*.log`. The old log's matches on "password" are all Paraglide message file names.
- Every browser context was disposed; both dev servers were stopped.

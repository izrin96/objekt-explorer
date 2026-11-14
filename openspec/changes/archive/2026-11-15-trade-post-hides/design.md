## Context

See proposal.md for why. Today's rules are in `packages/api/docs/trade.md` (Partner rules, hidden and idle posts; Trade posts), and the row is phase 1 and 2 of the owner's rollout (`openspec/changes/archive/2026-11-15-trade-post-table/`, `2026-11-15-trade-post-reads/`). These facts shape this change:

- **A hide names one list.** `hidden_trade_post (user_id, list_id)`, primary key on both, `list_id` `ON DELETE CASCADE`, plus `hidden_trade_post_list_id_idx`. `hidePost` writes the anchor of a post on Trade: the `posts` CTE's `id`, which is the lead of a pair, a lone list, or a want list whose lead is off Trade.
- **Two rules read it today** (`56b04e99`):
  - the feed, `hiddenPost` in `feed/query.ts`: `hp.list_id = posts.id`, in `feedWhere` and in `fetchPersonRows`' `hidden` column;
  - everything else, `hidesOfSql` in `services/trade/lists.ts`: the hide's own list, or the want list the hide's list leads through `postPairsSql`, whatever the lists' Trade state.
- **Every read and write of `hidden_trade_post`** in `packages/api/src` and `apps/worker/src`:

  | Where | What | Today |
  | --- | --- | --- |
  | `services/trade/lists.ts` | `hidesOfSql`, and `inHiddenPostSql` / `hiddenPostAtSql` over it | the matching rule |
  | `services/trade/matches/candidates.ts` | `partner_lists`: `NOT inHiddenPostSql(userId, "l")` when `skipHiddenPosts`. Reached by For you, Mutual (`mutual.ts`), the person and post pages' counts (`person.ts`, `posts.ts` `personMatches`, skip off on a first person page), the offer picker's `recountPartners` (skip off) | the matching rule, per list |
  | `services/trade/feed/query.ts` | `hiddenPost` in `feedWhere` (`countFeedOwners`, `fetchBumpPeople`, `fetchFeedOwners`, `fetchPersonRows`), and the `hidden` column of `fetchPersonRows` | anchor only |
  | `services/trade/hidden.ts` | `hidePost` (INSERT), `unhidePost` (DELETE by `list_id`), `fetchHiddenPosts` (one entry per hide) | — |
  | `apps/worker/src/job/want-alerts/pairs.ts` | `fetchPairs`: `hiddenPostAtSql(recipient, "pl")` | the matching rule, per entry's list |
  | `apps/worker/src/job/want-alerts/record.ts` | `unhidePosts`: DELETE of each hide `hidesOfSql(u.user_id, "pl")` returns | the matching rule |
  | `apps/worker/src/script/trade-post-drift.ts` | check 11 and `legacyHidesOf`, the `EXPLAIN=1` heaviest-hider plans | link era against rows |
  | `packages/db` FK cascades | deleting a list or a user deletes its hides | — |

- **A pair with one half on Trade** keeps its row (5 on production). Take off Trade takes both halves off (`takeDownPost`). The state arises when the owner then posts one half again as a Swap post on its own, since `planPost` keeps a Swap post's pair with its partner "staying where it is", or when a have list loses its profile binding while on Trade.
- **`postPartnerSql(alias)` renders `alias.id`.** It is `coalesce` of two scalar subqueries on `trade_post` (as `partner_row`), keyed on `${column(alias, "id")}`, and `column` is `sql.raw(alias + "." + name)`. So it works over `posts`, whose `id` is the anchor list id, as over `lists` aliases and a `VALUES` alias. Its second probe runs only when the first finds no partner.
- **Production, read-only, 2026-11-15 (from the brief):** 324 hides by 5 people; 1,329 rows, zero on all twelve drift checks; the feed hides 321 posts and matching 487 lists today, and the new rule gives the same sets (0 newly hidden, 0 no longer hidden in either); no person has two hides on one post. The current rule over every list on Trade costs about 0.9 s for the heaviest hider (291 hides), a Nested Loop Anti Join with a subplan per (list, hide).
- **Local database, read-only, 2026-11-15:** 410 rows, no hides. `localtest2@local.invalid` has a Buy post (want list 13142, its own row) and lone have lists 13168, 13169, 13173 and a sale list 13170, all on Trade; `localtest1@local.invalid` has its own want and have lists on Trade.
- **The web** (`apps/web/src/features/trade/`): the ⋯ menu's `HidePostItem` sends `{ listId: post.id }` (the anchor) to `hidePost` or `unhidePost` by the post's `hidden` flag; Undo sends the same id to `unhidePost`. `HiddenPostsList` keys each `<li>` by `post.listId`, sends it to `unhidePost`, tests `unhide.variables.listId === post.listId` for its pending state, links `/trade/@{handle}/{slug}` when `handle` is set, titles the entry `names.join(" · ")`, and names the owner by `profile` or the user's name. `showHidden` matches feed posts by anchor id for the optimistic update; `onSuccess` invalidates either way. The post page's `slugTarget` redirects the slug of a post's other list to its anchor, and a slug in no listed post shows the "gone" state.

## Goals / Non-Goals

**Goals:**

- One rule decides whether a hide covers a list, and the feed, matching, Can swap, alerts, Unhide and the Hidden list all use it.
- No visible change on the day of the deploy (0 differences on production), and a measured cost no worse than today's.

**Non-Goals:**

- Keying hides by post (`post_id`), or touching offers.
- Making the rule look at Trade state or at Can swap (`offersSwapsSql`).
- A faster For you beyond what the new shape gives.

## Decisions

### 1. One rule, stated as a set and as a lookup

A hide of X covers L when L is X or L is the other list of X's row. `services/trade/lists.ts` states it in the two forms its readers need.

**The set: the lists a viewer's hides cover.** The feed, match candidates and `hidePost` ask about many lists for one viewer, so they read a set that Postgres builds once and hashes:

```ts
/** The lists `viewer`'s hides cover, as `id`: each hidden list and the other list of its row. */
export const coveredListsSql = (viewer: UserRef) =>
  sql`SELECT hp.list_id AS id FROM hidden_trade_post hp WHERE hp.user_id = ${ref(viewer)}
    UNION ALL
    SELECT hide_row.want_list_id FROM hidden_trade_post hp
      JOIN trade_post hide_row ON hide_row.lead_list_id = hp.list_id
      WHERE hp.user_id = ${ref(viewer)}
    UNION ALL
    SELECT hide_row.lead_list_id FROM hidden_trade_post hp
      JOIN trade_post hide_row ON hide_row.want_list_id = hp.list_id
      WHERE hp.user_id = ${ref(viewer)}`;

export const inHiddenPostSql = (viewer: UserRef, alias: string) =>
  sql`EXISTS (SELECT 1 FROM (${coveredListsSql(viewer)}) covered WHERE covered.id = ${column(alias, "id")})`;
```

A null `want_list_id` in the second branch equals no id, so it covers nothing. `inHiddenPostSql` keeps its signature.

**The lookup: the hides that cover one list.** The worker asks per recipient and needs the hide's time, and the two deletes need the hide rows, so they read the hides themselves:

```ts
/** `viewer`'s hides that cover the list `alias`, as `hp`, from FROM onwards. */
export const hidesOfSql = (viewer: UserRef, alias: string) =>
  sql`FROM hidden_trade_post hp
    WHERE hp.user_id = ${ref(viewer)}
      AND hp.list_id IN (${column(alias, "id")}, ${postPartnerSql(alias)})`;
```

`hiddenPostAtSql(viewer, alias)` keeps its signature and body (`(SELECT max(hp.created_at) ${hidesOfSql(…)})`). `IN (a, NULL)` is true when `hp.list_id = a` and unknown otherwise, so a list in no row (2 hides on production name one) is covered by its own hides only, as today.

The two forms say the same thing because a list is in at most one row (drift check 4): "L is in the set X covers" and "X is L or L's partner" are one statement read from either end. Task 1.5 checks that on data. The `postPairsSql` comment drops "hidden posts" from its callers.

The feed drops its local `hiddenPost` and uses the set over the anchor:

```ts
if (query.skipHiddenPosts) where.push(sql`NOT ${inHiddenPostSql(query.viewerId, "posts")}`);
// fetchPersonRows
${query.viewerId === null ? sql`false` : inHiddenPostSql(query.viewerId, "posts")} AS hidden
```

Why the feed and matching now agree: a post's lists are its anchor A and, for a pair on Trade, its want list W, which is A's partner. The set holds A exactly when it holds W, since a hide on either covers both. So the feed hides the post exactly when matching drops its lists. A post whose lead is off Trade is the want list W alone, and a hide on the off-Trade lead puts W in the set.

**Measured on production, read-only, 2026-11-15**, on the listed posts grouped by owner (the shape of `fetchBumpPeople`), each form run two to four times:

| Filter | Heaviest hider (291 hides) | Viewer with no hides |
| --- | --- | --- |
| Today's anchor-only | 7 to 25 ms, hash anti join | 6 to 12 ms |
| The lookup form over `posts` (`hp.list_id IN (posts.id, postPartnerSql("posts"))`) | 76 to 93 ms, nested loop anti joins | 9 to 11 ms |
| The set form (`inHiddenPostSql`) | 8 to 14 ms, hash anti joins | 7 to 11 ms |

All three hide the same posts (836 left for the heaviest hider, 1,128 for a viewer with no hides). The lookup form turns the feed's joins into nested loops, so the feed and candidates use the set.

Rejected:

- **The lookup form everywhere.** One statement of the rule, but ten times the feed cost for a heavy hider (the table above).
- **The set form everywhere.** The worker's `fetchPairs` needs the newest covering hide's time per (recipient, list), and the deletes need the hide rows; a set of covered ids gives neither.
- **The feed over `posts.partner_id`** (`hp.list_id IN (posts.id, posts.partner_id)`). `partner_id` is only an on-Trade partner. A hide on a lead that left Trade would miss the want list's post on Browse while matching drops it, which is the mismatch this change removes.
- **Keeping `postPairsSql` in the rule** (only a lead's want list, only when the lead offers swaps). It reaches the pair in one direction only, so a hide on a want list never covers its later lead. The owner chose "stay hidden" for that case.
- **Reading Trade state** (only lists on Trade, or `offersSwapsSql`). The rule would change meaning whenever a list goes on or off Trade. The owner's answers need the hide to persist across Take off Trade. A sale list without `takes_swaps` paired with a want list makes two posts from one row, so a hide on one covers both. That cannot be written (`pairRefusal`), and production has none.

### 2. `hidePost`: nothing to write when the post is already covered

```sql
WITH ${postsCte}
INSERT INTO hidden_trade_post (user_id, list_id)
SELECT ${viewerId}, posts.id FROM posts
WHERE posts.id = ${listId} AND posts.user_id <> ${viewerId}
  AND NOT ${inHiddenPostSql(viewerId, "posts")}
ON CONFLICT DO NOTHING
RETURNING list_id
```

Only the anchor of another account's post on Trade can be hidden, as today, and the router's response stays empty whatever happens. A post that a hide on its other half already covers gets no second row and no version bump. The feed already shows that post as hidden, so it offers Unhide post, not Hide post. Only a tab built before the other hide could still offer Hide post, and its optimistic update matches the server. Undo on that tab's toast then sends the anchor to `unhidePost`, which removes the older hide on the other half: the user asked to see the post, and gets it. Accepted. `ON CONFLICT DO NOTHING` stays for two concurrent hides of one anchor. Two concurrent hides through different halves cannot happen, because both send the anchor.

Rejected: always inserting the anchor. It would make two hides on one post a normal state, and every Unhide and the Hidden list would then have to handle it routinely, not as the rare case it is (decision 4).

### 3. `unhidePost` deletes every hide that covers the named list

```sql
DELETE FROM hidden_trade_post gone
USING (VALUES (${listId}::int)) AS named(id)
WHERE gone.user_id = ${viewerId}
  AND gone.list_id IN (SELECT hp.list_id ${hidesOfSql(viewerId, "named")})
```

This is the shape of the worker's `unhidePosts`, so both deletes read the lookup form. `named` comes from `VALUES`, not `lists`, so an id whose list is gone still runs, and deletes nothing, since the cascade already did. `bumpTradeVersions([viewerId])` stays unconditional.

What each caller sends:

- the ⋯ menu and Undo send the anchor, which covers a hide on either half;
- `/account/hidden` sends an entry's `listId`, which is the newest hide's own list (decision 4), and also covers either half.

So every hide on the post goes in one call.

`/rpc`: the input stays `tradePostInputSchema` (`{ listId }`). A tab built before the deploy sends the same shape with the same meanings, so it validates and now unhides the whole post.

Rejected: deleting only `list_id = listId`. A post hidden through its other half would show Unhide post and stay hidden after it.

### 4. `fetchHiddenPosts`: one entry per post, named by its row

Each hide resolves to its row's lead and want:

```sql
SELECT hp.list_id, hp.created_at, lead.id AS lead_id, lead.name, lead.profile_address,
  want.name AS want_name,
  CASE WHEN lead.discoverable AND ${matchableListSql("lead")} THEN lead.slug
       WHEN want.discoverable THEN want.slug
       ELSE named.slug END AS slug,
  <user columns>
FROM hidden_trade_post hp
JOIN lists named ON named.id = hp.list_id
JOIN lists lead ON lead.id = coalesce(
  (SELECT r.lead_list_id FROM trade_post r WHERE r.want_list_id = named.id ORDER BY r.id LIMIT 1),
  named.id)
LEFT JOIN lists want ON want.id = (
  SELECT r.want_list_id FROM trade_post r WHERE r.lead_list_id = lead.id ORDER BY r.id LIMIT 1)
  AND want.user_id = lead.user_id
JOIN "user" ON "user".id = lead.user_id
WHERE hp.user_id = ${viewerId}
ORDER BY hp.created_at DESC
```

It is built in the existing drizzle select with `alias(lists, …)` and `sql` join conditions. The output shape stays `{ listId, slug, names, userId, user, handle, profile, hiddenAt }`:

- **`listId`** is `hp.list_id`, unique per viewer, so the web's `key` and pending test keep working. Unhide on it removes every hide on the post (decision 3). The optimistic `showHidden` finds no feed post when it is not the anchor, and the refetch in `onSuccess` covers that.
- **`names`** is `[lead.name, want.name]` when the row has a want list, else `[lead.name]`. It names the lists paired in the post whatever their Trade state, as `partnerName` does today, and the spec says so ("on Trade or off"): with only the want half on Trade the entry still reads "Binary dupes · Looking for". That lets a hidden Buy post that was later paired read "Binary dupes · Looking for", where today it reads only "Looking for".
- **`profile`** is the lead's bound profile, as For you names a post, where today it is the hidden list's. Want lists are never bound (`is_profile_bind` false), and 41 of 162 discoverable want lists locally have no profile at all. For you names a pair by its lead.
- **`slug`** is the anchor's when the lead is on Trade, else the want list's when that is on Trade, else the hidden list's. `slugTarget` redirects a want slug to the anchor. When the lead left Trade, the link opens the want list's post, which is the one that is hidden. With both lists off Trade it is today's behaviour: the person page in its "gone" state, which is right, since nothing of the post is listed, and the entry stays so the user can still unhide it.
- **Two hides on one post** (possible after a pair; 0 on production): the rows are deduplicated in JS by `lead_id`, keeping the first, which is the newest hide. The list then shows one entry per post, and its Unhide removes both hides.
- The `handle` and the address read (`fetchAddresses`, by owner) are unchanged.

Rejected:

- **One entry per hide.** It is two lines naming the same post, each of which would unhide both.
- **Naming only the lists on Trade.** An entry with both lists off Trade would name nothing, and Trade state would enter a read the rule keeps out of it.
- **Reading the `posts` CTE for the entry.** It costs a full CTE per call for a link that `slugTarget` already redirects, and it drops entries whose lists are off Trade, which today's list keeps.

### 5. The worker follows through the import

There is no edit in `apps/worker/src/job/want-alerts/`:

- **`fetchPairs`.** `hiddenPostAtSql(recipient, "pl")` is the newest hide that covers the new entry's list, whichever half it names. An entry on O, where the hide names W and the row is (O, W), now reads as on a hidden post. If added by hand after the hide, it is read with `hidden` set and can bring the post back. If added before the hide, or by a rule, it stays out. Today that O entry read as not hidden whenever the hide named W.
- **`unhidePosts`.** It deletes every hide, older than the run, that `hidesOfSql(u.user_id, "pl")` returns: the hide on the entry's own list and the hide on the other list of its row. So when the entry's list is the half the hide does not name, that hide is the one deleted, and the post comes back whole. `selectUnhides` keys by (recipient, entry list). Two entries on two halves of one post give two deletes, and the second finds nothing.
- The record comment ("however the hide names the post") stays true.

The worker image is rebuilt in the same rollout. `import-boundary.test.ts` covers the unchanged import chain.

### 6. The drift script

- **Removed.** Check 11 and `legacyHidesOf` go. They compared the link-era hide rule with the row-era one, which this change makes different on purpose: a hide on a want list now covers its lead. Eleven checks remain, and the script still exits 1 on any count above zero.
- **`EXPLAIN=1`.** It keeps a before/after for this change:
  - `previousHidesOf`: the `56b04e99` `hidesOfSql` text verbatim, under the aliases `previous_hp`, `previous_row` and `previous_lead`, against the imported `inHiddenPostSql`, over `lists l WHERE l.discoverable`, for the heaviest hider (the shape `partner_lists` applies);
  - the listed posts grouped by owner with their newest bump (the shape of `fetchBumpPeople`), with the anchor-only filter (`previous_hp.list_id = posts.id`) against `inHiddenPostSql(…, "posts")`, for the heaviest hider and for a viewer id that matches no user, so the zero-hide cost is visible.

  This is three short SQL fragments in a script that already holds legacy text. They go with the rest of the legacy SQL in `trade-post-contract`, and the header says so.
- **Not added:** a check that hides agree with rows. A hide is valid whatever the rows say, so there is no invariant to check.

### 7. Proof

On production no hide sits in a case the new rule treats differently, so a production comparison can only show "nothing changes". The new behaviour is proven on staged data first.

- **Staged hides, locally, read-only, no approval needed (task 1.5).** A scratch script in `apps/worker/.scratch-hides/` (inside `apps/worker` because bun resolves `@repo/*` from the script's own path; deleted afterwards, never committed) puts `WITH hidden_trade_post (user_id, list_id, created_at) AS (VALUES …)` ahead of statements built from the imported helpers. An unqualified `hidden_trade_post` then resolves to the CTE, so hides can be staged over real local rows with no write. It stages, for one made-up viewer, a hide on every third have, sale and want list, and checks:
  - **the two forms agree:** for every list, `inHiddenPostSql(viewer, "l")` equals `EXISTS (SELECT 1 ${hidesOfSql(viewer, "l")})`;
  - **the rule:** a hide on the want list of a pair covers the lead and the want list, a hide on the lead covers both, a hide on a lone list or a Buy post covers only itself, and a list of another row is never covered;
  - **the feed:** over `WITH staged…, ${postsCte}`, a post is hidden exactly when a staged hide names its anchor or its anchor's row partner, including a want-list anchor whose lead is off Trade;
  - **`unhidePost` and `unhidePosts`:** each delete's `USING … WHERE`, run as a `SELECT gone.list_id`, returns the hide on the other half of the named list's row.
- **The service functions, locally (tasks 1.2, 2.1 to 2.3).** `fetchBumpPeople`, `fetchPersonRows`, `fetchTradeCandidates` and `fetchHiddenPosts` build their own `WITH`, so they run against the real table: a read-only snapshot of their output for the local test accounts is taken before the first edit and compared after (no local hides, so identical output and `hidden` false proves the statements run and hide nothing by mistake).
- **The whole flow, locally, with the owner's approval of its rows (tasks 4.2 and 4.3):** the browser pass. If the approval is refused, the staged checks above still cover the rule, and Hide post and Unhide are reported as read-only verified.
- **Production, read-only, each run with the owner's go-ahead (tasks 5.1 and 5.2).**
  - The same scratch script without the staging, comparing the two previous rules (as text) with the imported helpers over every (hider, post in `posts`) and every (hider, list on Trade). Expected: 321 posts and 487 lists hidden before and after, with 0 newly hidden and 0 no longer hidden in both. Any other number stops the rollout.
  - Then `EXPLAIN=1` of the drift script. Expected: the per-list rule far under the 0.9 s figure with a hash anti join, and the feed form within 1.5 times the anchor-only form for both viewers, as the table in decision 1 found.
- **Tests.** No pure module changes, so no pure test is added. `trade-sql.test.ts` pins `TAG_WHERE`, not the hide SQL. The existing suites and `import-boundary.test.ts` run in `bun run check`.

### 8. Docs

- `packages/api/docs/trade.md`:
  - Partner rules, hidden and idle posts: a hide names a list and covers the post that list is in now, through its row and whatever its Trade state. The feed, matching, alerts, Unhide and the Hidden list all read `coveredListsSql` or `hidesOfSql`, two forms of one rule that must change together. A hide ends by Unhide (every hide on the post), by deleting the list it names, or through want alerts.
  - Trade posts: drop `inHiddenPostSql` from `postPairsSql`'s callers.
- `packages/db/src/schema.ts`, the `hiddenTradePost` comment: "keyed by the post's lead list" becomes "names the list the post was hidden by (its anchor then); covers the post that list is in now (`hidesOfSql`)". Comment only; `db:generate` finds no diff.
- `apps/worker/AGENTS.md`, Trade post drift: five equivalence checks, not six; the hide before/after in `EXPLAIN=1`.
- `apps/web/docs`: no file describes hides (grep for Hide post, hidden post, `hidePost` and Unhide), so nothing changes there.

## Inputs for later phases

1. **The write-side switch.** Writers write `trade_post` first, and `lists.linked_list_id` becomes a mirror:
   - `lockTradeLists`, `syncPostRows`, `openToColumns`, `findOwnedList`/`openToEdit`, `deleteList`'s partner read, and the stale-link clears in `writeList` and `savePost` read rows;
   - drift checks 1, 2, 6 and 7 then check the mirror.
2. **`trade-post-contract`** now drops only `lists.linked_list_id`. `hidden_trade_post.list_id` and `offer.post_list_id` stay, because hides and offers keep naming lists until post addresses. It also:
   - removes checks 7 to 11, the legacy SQL, and this change's `EXPLAIN=1` hide fragments;
   - renames the pure modules' `linkedListId`.
3. **Post addresses** bring stable `trade_post` ids, so a row survives pairing and unpairing. With them come `post_id` on hides and offers (the dropped `trade-post-keys`). Carried over from `trade-post-reads`:
   - `offer.post_id` must be `ON DELETE SET NULL`, never CASCADE, which would delete offers with their messages, items and trades;
   - 68 offers and 2 hides on production name a list in no row;
   - `acrossPosts` reads the absence of a post, so a null `post_id` beside a set `post_list_id` would flip an offer to "Asks from your posts" and could trigger the one-post decline notice;
   - the deploy needs expand → deploy → reconcile → deploy, or readers that fall back to the list while `post_id` is null.

   The reconcile maps a hide to the row its list is in, which is this change's rule, so the rows it writes match what users see by then. The owner's answers carry over: a hidden Buy post stays hidden when paired, and one hide is one post across an unpair.
4. **Shared lists** put one list in several rows. "The other list of the row X is in" then has more than one answer: `postPartnerSql` takes the lowest row id, and the rule would cover the wrong post. Hides need `post_id` before a list can sit in two rows.

## Risks / Trade-offs

- **[The rule is stated twice.]** `coveredListsSql` and `hidesOfSql` must say the same thing.
  → Mitigation: they sit together in one module, and task 1.5 compares them over every local list with staged hides. A later edit to one must run that comparison again; the doc says so.
- **[The feed's hide filter runs in four statements per Browse load]** (`countFeedOwners`, `fetchBumpPeople`, `fetchFeedOwners`, `fetchPersonRows`).
  → Mitigation: measured before this plan was settled (decision 1's table): the set form costs what the anchor-only form does, for the heaviest hider and for a viewer with no hides. Task 5.2 measures the built statements again, with 1.5 times the anchor-only form as the limit.
- **[A hide now outlives a pair change in both directions.]** Someone who hid a Buy post loses the paired post the owner builds on it. That is the owner's choice. Unhide in `/account/hidden` shows it by both names, and new hand-added entries can bring it back.
- **[A rechecked entry can be suppressed by a later pair.]** An entry on O added before the user hid W, still waiting in the alert recheck because its owner did not hold it yet, reads as on a hidden post once O and W are paired, and is dropped. That is at most 24 hours of recheck, and it fits "entries from before the hide stay out".
- **[Both forms depend on the caller's alias.]** A wrong alias is an SQL error, not a silent miss, and each caller is executed locally (tasks 1.1, 1.2, 1.5, 2.1–2.3, 4.3).
- **[Web and worker on different builds during the rollout.]**
  - **New web, old worker:** alerts and the worker's unhides follow the old rule. For a post covered only through its other half (none on the day; it takes a pair, unpair or Take off Trade after the deploy), the old worker may alert on an entry of a post the user sees as hidden, or fail to bring it back. Both are bounded by the rebuild and harmless: the alert links to a page that shows hidden posts with Unhide post.
  - **Old web, new worker:** the reverse, equally bounded.

  The rollout notes the worker rebuild.
- **[`trade-active-hours` also edits `feed/query.ts`.]** It touches `feedWhere`'s owner predicate, not the hidden line. Whichever lands second rebases.

## Migration Plan

No migration, and one deploy.

1. Locally: implement groups 1 to 3 with the staged-hide checks of task 1.5, run the local drift script (eleven checks zero) and `bun run check`, and run `bun run build --filter=web`. Then, with the owner's approval of its rows, the browser pass (task 4.3).
2. With the owner's go-ahead, the production comparison (task 5.1), read-only. Expected 0 newly and 0 no longer hidden in both.
3. With a go-ahead, `EXPLAIN=1` against production, read-only (task 5.2).
4. The owner approves the commit and push. CI builds the web image; the owner deploys web, then rebuilds and restarts the worker on the VPS.
5. With a go-ahead, the drift script read-only against production. Expected: zero on all eleven checks.

Rollback: redeploy the previous web and worker images. Hides the new build writes are ordinary anchor rows, which the old build reads. Hides that the new Unhide deleted through the other half stay deleted, as the user asked.

## Assumptions and unverified facts

- **From the brief, not re-run here:** the production counts (324 hides, 321 posts, 487 lists, 0 differences, no two hides on one post), 1,329 rows, and the 0.9 s plan. Task 5.1 re-runs the comparison from the real helpers.
- **Measured on production, read-only, 2026-11-15:** the three feed forms of decision 1's table, written as plain SQL beside a copy of the `posts` CTE, not through the helpers. Task 5.2 measures the built statements.
- **Not measured:** the set form inside `partner_lists` (For you). It replaces the 0.9 s per-list subplan with a hash anti join by construction; task 5.2 confirms it.
- **Assumed:** `localtest2`'s Buy post 13142 and have list 13168 are listed (not idle) locally. Task 4.1 checks that read-only first, and a bump would be one more approved write.
- **Checked by reading:** `postPartnerSql` renders `alias.id`; `slugTarget` redirects a post's other list to its anchor; the web reads only `listId`, `slug`, `names`, `handle`, `user` and `profile` of an entry; no test renders the hide SQL.

## As built

Built on 2026-11-15, on top of `f8f6d2b6`. What was run, and the departures from the decisions above:

- **Baseline** (task 1.1): `fetchBumpPeople`, `fetchPersonRows`, `fetchTradeCandidates` (both values of `skipHiddenPosts`) and `fetchHiddenPosts` for the two local test accounts, read-only. Two runs before the edits were byte-identical, and the run after them is byte-identical to those (25 posts per account and setting, no hidden post).
- **Staged hides** (task 1.5), read-only, over the local rows: a CTE named `hidden_trade_post` staged 517 hides for a made-up viewer, with every case present (29 on a pair's want list, 37 on a pair's lead, 451 on a list with no partner, 1 on an off-Trade lead whose want list is on Trade, 1 on a want list whose lead is off Trade). The staging is a `SELECT` of every third list, not a `VALUES` list. Results: the set form and the lookup form agree on every list; the set form agrees with the rule written without the helpers on every list (581 covered) and on every post (155 hidden); no post the anchor-only rule hides is shown; 18 posts are hidden that the anchor-only rule shows, which is the change; `unhidePost`'s delete, run as a select for every named list, removes exactly the hides on that list and its row partner (583, 66 of them through the other half). Without the staging the same statement covers no list.
- **`unhidePosts` in the worker** was not run on its own: it applies `hidesOfSql(u.user_id, "pl")` over a `lists` alias, the fragment the staged unhide check runs over `named`.
- **`hidePost` and `unhidePost`** against a read-only connection fail with 25006 at the INSERT and the DELETE, so both statements parse and plan, with a real and a missing list id.
- **`fetchHiddenPosts`** ran and returned `[]`; its naming, link and dedupe are not exercised without a hide, and wait for the browser pass (task 4.3).
- **Local drift run:** 410 rows, zero on all eleven checks. `EXPLAIN=1` prints plans for a viewer with no hides (under 1 ms each); there are no local hides for the heaviest-hider plans.
- **`EXPLAIN=1`** prints the hide plans for both viewers through one loop, and uses `inHiddenPostSql` for the rule now.
- **Checks:** `bun run check` passes (26 tasks), `bun run build --filter=web` passes, the worker's import-boundary test passes, and `db:generate` finds no schema change.

- **Approvals** (the owner, 2026-11-15, "yes both ok"): the local rows of the browser pass, and the two read-only production runs.
- **Local starting state** (task 4.1): 13142 `lt2 wants` and 13168 `lt2 spares` are both on Trade and listed, unlinked, each in its own row (1000407 and 1000303), `match_have` and `match_sale` true, `takes_swaps` false; no local hide.
- **Production, read-only, 2026-11-15, from the working tree before any deploy:**
  - The comparison through the built helpers, over the 5 people with hides (327 hides): the feed hides 322 posts before and after, and matching 489 lists before and after, with 0 newly hidden and 0 no longer hidden in both; the set form and the lookup form agree on every (hider, list on Trade); no person has two hides on one post.
  - The drift script: 1,340 rows, zero on all eleven checks.
  - `EXPLAIN=1`, three runs. The hide rule over every list on Trade for the heaviest hider: 944 to 1,098 ms before, 2.8 to 3.4 ms now, a Hash Right Anti Join with no subplan per (list, hide). For a viewer with no hides: 2.1 to 7.9 ms before, 1.9 to 2.9 ms now. The feed people statement: 8.1 to 10.1 ms anchor-only against 8.7 to 9.2 ms now for the heaviest hider, and 7.5 to 15.5 ms against 8.0 to 8.5 ms for a viewer with no hides. Both are within the 1.5 times limit.

- **Browser pass** (task 4.3), local, as the two test accounts, 2026-11-15:
  - **(a) held.** `localtest1` hid the Buy post `lt2 wants` (one hide, on 13142). `localtest2` paired it with `lt2 spares`. The pair was absent from Browse, the person page offered Unhide post, `/account/hidden` showed one entry, "lt2 spares · lt2 wants", and For you did not count it.
  - **(b) held.** After the unpair, `lt2 spares` showed on Browse with Hide post, `lt2 wants` stayed hidden, and `/account/hidden` named `lt2 wants` only.
  - **(c) held.** With hides on both lists and the two paired again, `/account/hidden` showed one entry; its Unhide left no hide, and the pair was back on Browse.
  - **(d) and (e) could not be reached through the composer**, so they rest on the staged checks (one staged case each way). Posting the want list alone needs an unpair ("Unpair and use it"), and a Swap post that names the want list fills in its have list. After that unpair the want list showed on Browse unhidden and `/account/hidden` listed `lt2 spares` only, which is what the rule gives for an unpaired pair. On production the want-on, lead-off state exists (4 pairs); the spec scenario now states that state, not a way to reach it.
  - **Pairing two lists that are each already a post is refused by the composer** ("In your Swap post", greyed out). The pass paired them by taking `lt2 spares` off Trade first, one write beyond the approved list, on the same two lists, told to the owner. So a hidden Buy post is paired only with a have list that is off Trade or new at that moment.
  - The composer has no Unpair button on a pair: "No list" for the want list unpairs on save and leaves the want list off Trade, and it was posted again as a Buy post.
  - The person page shows a hidden post with no visible mark; the only sign is Unhide post in its menu. Not changed here.
  - No console error from the app.
  - Cleanup: no hide left; both lists on Trade, unlinked, `match_have` and `match_sale` true, `takes_swaps` false. `lt2 wants` is in a new row (1000421, was 1000407), and both lists' `updated_at` and `bumped_at` moved.
- **Scratch scripts** (`apps/worker/.scratch-hides/`) are deleted. After the build, `git status --short -- apps packages` lists only `apps/worker/AGENTS.md`, `apps/worker/src/script/trade-post-drift.ts`, `packages/api/docs/trade.md`, three files under `packages/api/src/services/trade/` and `packages/db/src/schema.ts`.

- **After the production deploy, 2026-11-15:** the owner pushed `ffd37a0b` and deployed web and worker. The drift script, read-only against production, found 1,341 rows and zero on all eleven checks.

## Open Questions

None that change the specs, the approach or the tasks. The go-aheads, for the local rows and for each production run, are tasks.

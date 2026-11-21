## Why

Every post's Trade state lives on its `trade_post` row, but many readers still find a post through its list: its lowest row, its `lists` Open to, or every row holding it. That is right while each list is in one row. Once `shared-lists` puts a list in several posts, these readers would merge, drop or mis-hide posts. Change 5 of the shared-lists chain.

## What Changes

- **Posts are built from rows.** `postsCte` makes one post per row, with its row id. Idle checks, hides and match filters work per post.
- **A post's state comes from its row.** Browse, Your posts, chat post cards, staff posts, the report snapshot and the Hidden posts list read Open to, `takes_swaps`, Trade state and bump from the post's row. `postStateSql` goes.
- **A read that names only a list takes the union of its posts.** For you's candidates, the viewer's own lists, strips and want alerts count a list with what any of its listed posts on Trade allows. Off Trade a list reads its own Open to, as today.
- **Hides work by row.** The hide set becomes a set of row ids, and a want alert's hide test and unhide name the row.
- **Can swap keys posts by row.** `swapPair.theirPostId` still names the anchor list.
- **Want alerts read the partner per row** and the recipient through the same union rule.
- **Drift check 6c goes**, since no reader takes a list's Open to as its post's any more.

With one row per list, every output equals today's.

**Public API breaks: none in this change.** No output changes for today's data, and no `/rpc` input changes.

**Proposed separately (Open Question 1): drop the list-level Open to,** as its own change `list-open-to-retire`, right after this one. If the owner says yes, that change breaks these outputs, which need the owner's yes one by one:

| Route | Field removed |
| --- | --- |
| `list.find`, `list.findPublic`, `profiles.lists` (`/rpc`) | `matchSale`, `matchHave`, `takesSwaps` |
| `GET /api/v1/lists/{slug}` | `matchSale`, `matchHave`, `takesSwaps` |
| `GET /api/v1/profiles/{address}/lists` | `matchSale`, `matchHave`, `takesSwaps` on each list |

List objects keep `discoverable` in both branches (design decision 8).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-for-you`: Account-wide matches and Hidden posts leave matching say how a list in several posts counts and hides.
- `web-notifications`: Want-list alerts skip hidden posts says the same for alerts.

Checked and unchanged: `web-trade-browse`, `api-openapi` (Trade feed post ids already says `id` and `theirPostId` name lists), `web-lists`, `web-moderation`.

## Routes

- Browse and For you: `trade.people`, `trade.person`, `trade.mutualCount`, `trade.tabCounts`, `trade.collectionPostCounts`, `trade.sideItems`, `trade.listMatches`, and `GET /api/v1/trade/people`.
- Your posts and hides: `trade.myPosts`, `trade.hidePost`, `trade.hiddenPosts`.
- Chat post cards, the moderator console's report reads (`services/moderation/reads.ts`), and `moderation.report`'s post snapshot.
- `offer.suggest`, only through `recountPartners` and `fillMatches`.
- The worker's want alerts and drift script.

## Non-goals

- Lifting `planPost`'s refusal of a list in another post (`shared-lists`).
- Post ids as inputs, or a feed `id` that names a post (`post-id-inputs`).
- Offers reading `post_id`; the picker's partner reads (`offer-reads-post-id`).
- Step 2 of `trade-post-state-contract`.
- Dropping the list-level Open to (`list-open-to-retire`, Open Question 1).
- Any `.tsx`, message, `/rpc` input or migration.

## Impact

- `packages/api`: `lib/trade-sql.ts`, `trade-posts.ts`, `trade-person.ts`, `trade-rank.ts`, `offer-prefill.ts` and their tests; `services/trade/` (`lists.ts`, `hidden.ts`, `feed/`, `matches/`); `services/moderation/report.ts`; `docs/trade.md`.
- `apps/worker`: `job/want-alerts/`, `lib/want-alert-match.ts`, the drift script, `AGENTS.md`.
- **Deploy:** web and worker from one commit, no migration, with a read-only gate before and after.
- **Rollback:** the previous images (`8b05487c`), with no data step.

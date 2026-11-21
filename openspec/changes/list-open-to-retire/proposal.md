## Why

A want list's Open to and a sale list's `takes_swaps` live on each `trade_post` row and again on `lists`. A list in several posts can't hold one value, so the list copy goes before `shared-lists`. Change 6 of the shared-lists chain. The owner decided that Open to is a post setting, chosen only in the Post composer.

## What Changes

- **The rows are the only copy.** A post reader takes a want list's Open to and a sale list's `takes_swaps` from its row, on Trade or off. A read that names only a list takes the union of its posts on Trade, else of all its posts, else the default (Swaps or buying; Sell only).
- **`trade.savePost` stops writing the list.** A side takes the composer's choice, else its old row's, else the default.
- **Create, Edit and Copy list lose the Open to and Sale controls** and the owner's off-Trade badge, with their en, ko and ja messages.
- **`list.create`, `list.copy` and `list.edit` stop reading** `matchSale`, `matchHave`, `takesSwaps`, `openTo` and `saleOpenTo`. Zod strips them, so open tabs still validate.
- **Step 1's migration copies each list's own Open to into its off-Trade rows**, which can lag `list.edit` today (Open Question 2).
- **Step 2 drops** `lists.match_have`, `match_sale`, `takes_swaps` and the checks `lists_open_to_something` and `lists_takes_swaps_sale_only`, once web and the worker run step 1.
- **For you's candidates and want alerts' pairs change shape**; G1 times them on production.

**A decision that can't hold as written (Open Question 1).** The web builds the list page's post tags, the composer's start and Edit list's Trade line from list objects' three fields (`list-post-tags.ts:24-27`, `plan-list.ts:14-16`), and an open tab's Edit list can't validate without them. **Recommended:** keep the three fields, filled from the rows by the list rule, so no output loses one. If the owner keeps the break, these go:

| Route | Field removed |
| --- | --- |
| `list.findPublic`, `list.profileLists`, `user.currentUser` (`/rpc`): each list and its `linkedList` | `matchSale`, `matchHave`, `takesSwaps` |
| `GET /api/v1/lists/{slug}`, `GET /api/v1/profiles/{address}/lists`: each list and its `linkedList` | the same |
| `list.find` (`/rpc`) | the same |

List objects keep `discoverable` in both branches.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-lists`: four requirements on the list-level Open to go; seven say Open to is the post's.
- `web-trade-for-you`: Account-wide matches. A list on no post on Trade counts with its posts' Open to, else the default.
- `api-openapi`: a new requirement on what list objects' Open to fields mean.

Unchanged: `web-notifications` (it points to `web-lists`), `web-trade-browse`, `web-moderation`.

## Routes

- `/list`, the list page, the profile's Lists tab, and Create, Edit and Copy list.
- `/trade/new` (`trade.savePost`), Browse, For you and Your posts.
- `moderation.report`'s snapshot, staff posts, and the `/api/v1` list reads.
- The worker's want alerts and drift script.

## Non-goals

- Lifting `planPost`'s refusal of a list in another post, and how a list page shows a list in several posts (`shared-lists`).
- Post ids as inputs, and the web keying posts by `postId` (`post-id-inputs`).
- An Open to for a list that is in no post.
- Dropping `lists.discoverable`.
- The Discord format and CSV export (no Open to; English).

## Impact

- `packages/api`, `packages/db`, `apps/worker`, `apps/web` (design.md, Inventory).
- **Deploy:** step 1 is migrate, then web and the worker from one commit; step 2 is a migrate alone. Read-only gates run around each.
- **Rollback:** after step 1, the old images plus a reconcile of `lists` from the rows; after step 2, nothing older than step 1.

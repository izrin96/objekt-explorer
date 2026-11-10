# Design

## Context

Hiding a person is the `hidden_trade_partner` table (`packages/db/src/schema.ts`), written by `services/trade/hidden.ts`. Three filters read it:
- `feedWhere` in `services/trade/feed/query.ts` (Browse and For you rows, people counts, post cards);
- `tradePartnerSql` in `services/trade/lists.ts`, used by match candidates (`matches/candidates.ts`) and by the worker's want-alert pairs (`apps/worker/src/job/want-alerts/pairs.ts`).

A post has no table of its own. `postsCte` builds posts from `lists`: a post is keyed by its lead list's id. The lead list is a have or sale list, plus the want list it links to when it offers swaps, or a want list that no such list links to. `candidates.ts` keys the same pairs as `post_key`. Every Trade surface already knows a post by that id, and so does the web: `PostBlock`'s anchor list.

## Goals / Non-Goals

**Goals:**
- One filter, defined once, that every reader of the partner hide also applies.
- Person and post pages keep reading without the filter.

**Non-Goals:**
- A post entity or table separate from `lists`.
- Changing how posts are keyed or paired.

## Decisions

### Key the hide by the lead list id

`hidden_trade_post (user_id → user.id cascade, list_id → lists.id cascade, created_at)`, with primary key `(user_id, list_id)` and an index on `list_id`.

Deleting the lead list drops the hide, as the spec requires.

- **Alternative: one row per list of the post.** Rejected. Relinking a want list would leave rows behind, and Undo would have to restore a set of rows.
- **Alternative: key by the post's slug.** Rejected. The slug is the lead list's, so it adds nothing over the id, and slugs can change.

### One helper for the pairing rule

The rule that a have or sale list offering swaps leads its linked want list of the same owner is written out twice today: in `postsCte` and in `partner_post` in `candidates.ts`. The hide filter would add a third copy. Move the rule into one SQL helper in `services/trade/lists.ts` first, and build all three on it, so the feed, the match counts and the hide can't disagree about what a post is.

- **Alternative: a `trade_post` table** that stores each post with a stable id. This would also fix lead changes (see Risks). Deferred: it needs a backfill and changes to every Trade read. It is worth doing once another feature needs a stable post id.

### One SQL predicate for "this list belongs to a post the viewer hid"

Add `postHiddenSql(viewer, alias)` to `services/trade/lists.ts`, next to `tradePartnerSql`.

A list `l` is hidden when the viewer hid either of these:
- `l.id`;
- the id of a list `o` with `o.linked_list_id = l.id`, the same owner, and `offersSwapsSql("o")`. This is the pairing rule `postsCte` uses, so the want half of a pair follows its lead.

Callers:
- `feedWhere`: `NOT EXISTS (… h.list_id = posts.id)`. A feed post already is its lead.
- `candidates.ts` `partner_lists`: `AND NOT ${postHiddenSql(userId, "l")}`, behind a `skipHiddenPosts` option. That option defaults on and is off when the feed query is scoped to one person (see below).
- Worker `pairs.ts`: apply it to the partner's list in each direction (`offer_list_id` forward, `c.list_id` reverse) against the recipient.

`tradePartnerSql` stays as it is. Merging the two would change the meaning of a person-level helper.

### Person and post pages don't apply the post hide

The person page reads its row through `trade.people`, with the search's `person` set (`personSearch(userId)` in `person-page-view.tsx`). So the person page and Browse share `feedWhere` and the candidates query.

- `FeedQuery` gains `skipHiddenPosts`, set to false when the query is scoped to one person. `feedWhere` and the candidates call both read that flag.
- When the flag is false, each returned post carries `hidden: boolean`, so `PostBlock` can show Unhide post. Otherwise the flag is true, and no hidden post comes back.
- Near matches (`feed/near.ts`) read only posts the feed already returned, so they need no filter of their own.

### API

In `routers/trade.ts`, beside `hidePartner`:
- `hidePost({ listId })`: a no-op unless the list leads a post of another account's that the feed can show. The check is in SQL, using the `postsCte` lead condition, discoverable, and not the caller's own list. It then calls `bumpTradeVersions([viewerId])`.
- `unhidePost({ listId })`.
- `hiddenPosts()`: newest first. Each item carries the lead list's name and slug, the linked list's name, and the owner named by `fetchHiddenPartners`'s naming rule.

### Web

- `actions.ts`: `useHidePostWithUndo` follows `useHideWithUndo`. On mutate, it drops the post from cached `trade.people` pages. When that empties the row, it drops the row too, then runs the same invalidation and refetch sequence.
- `PostBlock` (`post-block.tsx`): Hide post, or Unhide post when `post.hidden`, goes in `postItems` beside Report, for `!own && signedIn`.
- `hidden-partners-dialog.tsx`: becomes a two-section list. `HiddenPartnersList` stays, and a new `HiddenPostsList` joins it. Account's `HiddenPanel` renders both. Extending the existing dialog avoids a second footer link.
- `browse-view.tsx`: the footer note shows when either list is non-empty.
- New messages in en/ko/ja (ko and ja follow the project's register rules): Hide post, Unhide post, the hide toast and error, the unhide error, the Hidden posts heading, the empty text, and the footer wording. The Discord and CSV outputs are untouched.

## Risks / Trade-offs

- **The owner relinks a post's want list to another lead.** The old want list's matches come back, under the new post. → Accepted: it is a different post now.
- **A want-only post gets a have list linked to it.** Its lead becomes the have list, and the hide no longer matches. → Accepted. It is rare, and the post changed shape.
- **More `NOT EXISTS` probes on hot feed and match queries.** → The probe hits the primary key `(user_id, list_id)`. The match-candidates query is the one to compare with `EXPLAIN` before and after.
- **Unhiding inside the 24-hour retry window.** An entry left out because its owner couldn't trade it yet is checked again on later runs, and it may alert after an unhide. → Accepted. It is an alert the user would otherwise have had.

## Migration Plan

1. Run `bun run --filter=@repo/db db:generate` after the schema edit. This generates a create-table migration only.
2. Applying it to production needs the user's approval. The web and the worker must not ship before the table exists, since the filters reference it.
3. Rollback: revert the code. The table can stay, since nothing else reads it.

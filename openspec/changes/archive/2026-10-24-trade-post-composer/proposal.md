# Proposal

## Why

What a Trade post means is set in two places today: the want list's Open to and the have list's link sit in the list form, while Post a list only flips one switch per list. A post's tag and what it matches follow from settings the poster never sees together. Making the post the thing people create, by what they want to do, puts every choice in one place.

## What Changes

- Post a list becomes a two-step composer: pick **Swap**, **Sell** or **Buy**, then the lists.
  - Swap: a have list, a want list, or both, plus "I'd also pay for what I'm looking for" (needs a want list).
  - Sell: one sale list. Buy: one want list, saved as Buying only.
  - Before posting, the composer shows the post's tags and who it matches.
- A list is in one post at a time. Picking a paired list for a post that would not keep the pair asks to unpair them first.
- A post's settings live in today's list columns (the link, Open to, Show on Trade). No new table and no data migration: every existing list already reads as exactly one post kind.
- Tags become a set: Swap is WTT, Swap with "also pay" is WTT and WTB, Buy is WTB, Sell is WTS. The Post type menu lists a post under each of its tags. A want list on its own open to swaps or buying, WTB today, becomes WTT and WTB. The "Buying only, not swapping" and "Swaps only, not buying" notes go.
- The list form drops Show on Trade, Open to and the link picker on have and want lists for a Trade line naming the list's post, or that it is off Trade, with Edit post or Post it. A sale list keeps one switch, labelled Show on Market and Trade.
- Taking a Swap post off Trade keeps the link. Deleting one list of a pair leaves a one-list Swap post.
- Your posts lists posts: tags, kind, lists by role, the option, listed or idle, and Edit post and Take off Trade. On Browse, New post moves into the Your posts row, which also shows with no posts.
- On For you, Mutual only becomes a toggle button between Compare with and the help, on every width.

Routes: `/trade`, `/trade/for-you`, the list create and edit dialogs (`/list`, `/@{nickname}/{list}`).

## Non-goals

- No change to who matches whom, the Mutual score, ranking or ownership checks. Mutual's listing gains want lists on their own open to swaps or buying.
- The labels stay WTT, WTB and WTS.
- Market and Trade stay one switch for a sale list.
- No "I'd also sell my haves", no post note.
- Chat post cards keep their single tag.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-browse`: the post composer; tags as a set; Your posts by post; tag help replaces the Buying only note; Mutual only as a button.
- `web-lists`: Show on Trade, Open to and the link move from the list form to the composer; a Trade line takes their place.

## Impact

- `packages/api`: `trade.savePost` and `trade.takeDownPost`, a `TRADE_POST_REFUSALS` tuple, `tags` beside `tag` on feed posts and `trade.myPosts`, the tag rule in SQL and in `postTag`, and cache key versions. `list.update` keeps accepting the old fields from open tabs.
- `apps/web`: the Post a list dialog, Your posts, the list form, the matching controls, Browse help, the post card tag; `en`, `ko`, `ja` messages.
- Mockup: https://claude.ai/artifact/LUTbjQjSCmSnPen6FrjVkF

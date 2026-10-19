# Proposal

## Why

Browse and For you list one row per post, but a person's match counts cover all of their lists. So a row's chip, its strips and the All matches sheet can each count something different. nuppotoz's S24 WISHLIST row read "You have 3 they want" while all three matches were on their other post, WISHLIST. Users cannot tell whether a number is about the person or the post.

## What Changes

Routes: `/trade` (Browse) and `/trade/for-you` (For you).

- **BREAKING (UI)** A feed row is one person, holding one strip per list the feed would show. Every number sits on what it counts:
  - the header carries one sentence about the person: "You can swap N", "You have N they want", "They have N you want" or "No match with you yet";
  - each strip carries its own list's count ("14 you want", "2 you have"), with its matched objekts ringed and shown first.
- A linked have and want pair stays one strip pair. Matching lists come first. Two lists show, then "+N more lists" expands the row in place.
- The match chip, its popover and the All matches person sheet go. `person=<id>` leads the feed with that person's row, expanded.
- Message and Make offer sit in the header, addressed to the person's best-matching list.
- Browse orders people by newest bump. For you orders them best match first, Mutual then One way.
- The feed pages by person, 12 people a page.
- Counts read only listed lists: an idle list no longer counts toward a person, Mutual or Mutual N.
- Supersedes the uncommitted per-post Browse chip work, which is reverted. Undoes the person-sheet half of `2026-10-13-trade-person-level-matches`; per-person counting stays.

## Non-goals

- No change to the matching rules (Open to, sale lists, ownership, Compare with) or to `mutualOf`.
- No change to Post a list, Bump, My posts, the drawer's On Trade counts, the offer builder or chat beyond where Message and Make offer come from.
- No database migration.
- No per-list Message or Make offer on strips.
- `trade.browse` and `trade.person` stay for tabs opened before the deploy.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-browse`: person rows (Trade card), their order and paging (Order and idle posts), counts on the header and strips with no chip or All matches (Matches to the signed-in viewer), Message and Make offer from the row, and For you listing people (Matches and Compare with).
- `web-trade-for-you`: idle lists stop counting (Account-wide matches); the Person sheet is removed; Message and Make offer move to the row.
- `web-chat`: a post card's link and Trade's Message point at the person's row.
- `web-cosmo-link`, `web-lists`, `web-moderation`: mentions of the person sheet now name the person's row.

## Impact

- `packages/api`:
  - a person-paged feed procedure beside `trade.browse`, reusing its query and post assembly;
  - matching candidates filter idle lists, with cache keys bumped.
- `apps/web`:
  - a person row and feed view replace `BrowsePost`;
  - the person sheet, match chip, matched-lists popover and the prototype route are removed;
  - new copy in `en`, `ko` and `ja`.

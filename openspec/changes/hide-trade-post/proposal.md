# Proposal

## Why

Hide on Trade works on people only. A user whose offer on one post was declined still sees that post listed as a match, and their only way to clear it is to hide the person, which also hides that person's other posts, some of which may still lead to a trade. Users asked for a way to hide one post and keep the rest.

## What Changes

- A signed-in viewer can hide one post from someone else through Hide post in that post's ⋯ menu on Browse and For you. The post leaves at once, and a toast offers Undo.
- A hidden post takes no part in the viewer's Trade matching. It is left out of rows, the header sentences and list counts, Any, Mutual, Mutual N and the viewer's want-list alerts. A row whose posts are all hidden leaves the feed. Otherwise the remaining posts keep their order, and the first of them becomes the lead post.
- The person page and the post page still show a hidden post, since the viewer opened them on purpose. Its ⋯ menu offers Unhide post in place of Hide post.
- Hidden posts are listed with Unhide:
  - in the dialog that Browse's footer note opens, which now lists Hidden people and Hidden posts;
  - on Account's Hidden page, below Hidden people.
- Browse's footer note shows when the viewer has hidden a person or a post, and its wording covers both.
- Hide person stays as it is. Hiding a post and hiding its owner are independent: unhiding the person does not unhide their hidden posts.

## Non-goals

- Hiding a post automatically when its owner declines the viewer's offer.
- Hiding the owner's future posts, or posts similar to the hidden one.
- Hiding for signed-out visitors, or hiding one's own posts.
- Any change to offers, chat or notifications other than want-list alerts. An open offer on a hidden post stays open.

Routes: `/trade` (Browse and For you), `/trade/@<handle>` and `/trade/@<handle>/<slug>` (Unhide post), `/account/hidden`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-for-you`: adds Hide a post beside Hide a partner, covering matching, the feed, the footer note, the Hidden dialog and Account's Hidden page. Hide a partner's footer-note sentence changes so the note also shows for hidden posts.
- `web-trade-person-pages`: the person and post pages keep a hidden post and offer Unhide post.
- `web-notifications`: want-list alerts leave out a hidden post's lists.

`web-account`'s Account page requirement is left as it is. The in-flight `trade-active-hours` change edits that requirement, and `/account/hidden` keeps its route and its Hidden people title. Hidden posts are a second section on that page, specified under `web-trade-for-you`.

## Impact

- `packages/db`: a new `hidden_trade_post` table (viewer, the post's lead list id, created at) and a generated migration. Running the migration needs approval.
- `packages/api`: `trade.hidePost`, `trade.unhidePost` and `trade.hiddenPosts`. The hidden-post filter joins the person filter in the feed (`feedWhere`), in match candidates and in `tradePartnerSql`'s callers.
- `apps/worker`: want-list alert pairs skip a hidden post's lists.
- `apps/web`: a Hide post or Unhide post item in `post-block.tsx`, a hide-with-Undo hook, a Hidden posts list in the Hidden dialog and on the Account page, and new en/ko/ja messages.

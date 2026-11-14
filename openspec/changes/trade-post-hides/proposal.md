## Why

A hide is a row of `hidden_trade_post (user_id, list_id)`, and two reads disagree about what it covers. The feed compares it with the post's anchor list only; matching, Can swap and want-list alerts also reach the want list the hidden list leads. Once an owner pairs, unpairs or takes one half off Trade, a post can show on Browse with Hide post while matching and alerts leave it out, or the other way round. Keying hides by post (`trade-post-keys`) waits for stable post ids, so this change gives hides one rule every read uses, with no schema change.

## What Changes

- One rule: a hide of list X covers list L when L is X, or L is the other list of the `trade_post` row X is in. A post is hidden when a hide covers its anchor. The rule reads the row only, never Trade state.
- `services/trade/lists.ts` states it twice, as the set of lists a viewer's hides cover (`inHiddenPostSql`) and as the hides that cover one list (`hidesOfSql`), and every reader goes through one of the two:
  - the feed's hidden-post filter and `hidden` column (Browse, For you, the person and post pages);
  - match candidates (For you counts, Any, Mutual, Can swap);
  - the worker's alert read and its unhide.
- `trade.unhidePost` deletes every hide of the viewer that covers the named list, so a post hidden through its other half can be unhidden from its ⋯ menu and from `/account/hidden`. Its input is unchanged.
- `trade.hidePost` writes nothing when the post is already covered.
- `trade.hiddenPosts` names each entry by the post its list is in now: both lists of its row, lead first, with the lead's profile. It lists one entry per post and links to a list of that post that is on Trade. The output shape is unchanged.
- The drift script drops its hide equivalence check, which compared two rules that now differ on purpose.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-for-you`:
  - Hide a post: a hide follows its list through pair, unpair and Take off Trade.
  - Hidden posts leave matching: Browse and For you agree with matching.
  - Hidden posts list: what an entry names, one entry per post, Unhide clears every hide on it.
  - A hidden post comes back: an entry on either half brings it back.
- `web-trade-person-pages`, Hidden post on the person and post pages: a post hidden through its other half offers Unhide post.
- `web-notifications`, Want-list alerts skip hidden posts: a list paired into a hidden post counts as a list of it, so its earlier entries no longer alert.

Unchanged:

- `web-trade-for-you` Hide a partner: the footer note and Hidden dialog still list hidden posts; only their entries change.

## Routes

- `/trade` (Browse), `/trade/for-you`
- `/trade/@{handle}`, `/trade/@{handle}/{slug}`
- `/account/hidden`, and the Hidden dialog from Browse's footer note
- want-list alerts (worker)

## Non-goals

- `post_id` on hides or offers, and stable post ids (post addresses).
- Offers.
- Any migration or schema change. Any new user-facing string.
- Moving writers onto `trade_post`, or dropping `lists.linked_list_id` (`trade-post-contract`).

## Impact

- `packages/api`:
  - `services/trade/lists.ts` (`hidesOfSql`, `inHiddenPostSql` and a new `coveredListsSql`);
  - `services/trade/feed/query.ts` (`feedWhere`, `fetchPersonRows`);
  - `services/trade/hidden.ts` (`hidePost`, `unhidePost`, `fetchHiddenPosts`);
  - `docs/trade.md`.
- `packages/db`: the `hiddenTradePost` doc comment in `schema.ts`. No migration.
- `apps/worker`: `script/trade-post-drift.ts` and `AGENTS.md`. `pairs.ts` and `record.ts` change behaviour through the import, with no edit. The image is rebuilt in the same rollout.
- `apps/web`: none.
- Production, read-only, 2026-11-15: 324 hides, and the new rule hides the same 321 posts and 487 lists as today, so nothing changes for anyone at deploy.

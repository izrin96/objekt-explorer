## Why

Browse and For you show the same kind of thing, someone you could trade with, in two unrelated layouts. A Browse post is an open card: actions top right, its counts worded "You have 2 they want", its objekts always shown. A For you partner is a collapsed row: counts worded "Mutual 2 · They have 14 · You have 2", actions and objekts hidden until it is opened, and the offer button named Propose this trade. Moving between the tabs means relearning where everything is.

Browse also has no way to hide posts that match nothing of the viewer's. The current spec leaves narrowing to For you, but For you groups by person and loses Browse's newest-first order. A viewer who wants "what's new that fits my lists" has to scroll past every post.

## What Changes

- **Only matches on Browse.** A signed-in viewer with at least one list on Trade gets an Only matches switch beside the WTT/WTB/WTS tabs. On, the feed keeps only posts with at least one match against all of the viewer's lists, in either direction. It is filtered on the server, so pages stay full and the order stays newest bump first. It is kept in the URL (`matches=1`). Browse still has no Show or Compare with control. This replaces the current rule that "Browse SHALL offer no Match filter".
- **One card for a trading partner, on both tabs.** For you rows become the same card as Browse posts:
  - **Header:** avatar, name with socials, reputation line and a meta line. Browse's meta line is the post type and its bump time. For you's is the partner's matched lists, each with its type, plus Idle when idle.
  - **Actions:** Message, Make offer and ⋯ sit top right, moving to their own row on a phone.
  - **Match line:** one wording on both tabs, "They have 14 you want · You have 2 they want · Mutual 2", in that order. Browse keeps "See in For you" after it.
  - **Thumbnails:** smaller and the same size on both tabs, at most 11 per section, then a +N tile, so a full section is one row on desktop and 5 to a row on a phone.
- Only the body differs. Browse shows the post's lists. For you shows "They have, you want" and "You have, they want".
- **For you no longer collapses.** Each partner's matches are always visible, like a post's objekts.
  - Hide moves into the ⋯ menu beside Block and Report.
  - Propose this trade is renamed Make offer. It still pre-fills the overlap.
  - Opening For you with `partner=<id>` scrolls to that card and highlights it.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-trade-browse`: Only matches filter; the match line's wording and order; smaller thumbnails, 11 per side.
- `web-trade-for-you`: partner cards always open, with the shared header, match line and actions; Hide in the ⋯ menu; Make offer in place of Propose this trade.

## Non-goals

- A Show or Compare with control on Browse.
- Changing how matches are counted, or For you's ranking and filters.
- Paging For you.
- Changing the offer builder, or what Make offer pre-fills on either tab.

## Routes

`/trade` (Browse), `/trade/for-you`.

## Impact

- **`packages/api`:**
  - `schemas/trade.ts`: `matches` on the browse input.
  - `services/trade-feed.ts`: a stage-1 match condition, and stage 2 skips posts left with no match.
  - `schemas/trade.ts`: `PREVIEW_LIMIT`, 11 (was 8 in `lib/trade-feed.ts`), where the web can import it.
  - A test for the condition.
- **`apps/web`:**
  - `features/trade/browse-view.tsx` and `search-schema.ts`: the switch and the URL key.
  - `browse-post.tsx` and `partner-row.tsx`: the shared card, header and match line.
  - `for-you-view.tsx`: the list, the scroll to a partner, and Hide.
  - `moderation/safety-menu.tsx`: an extra menu item.
  - en/ja/ko text.
- No database change.

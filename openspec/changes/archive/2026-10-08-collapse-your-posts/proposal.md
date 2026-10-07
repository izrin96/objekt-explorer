## Why

On Trade › Browse, Your posts lists every post of the viewer's in full above the feed. With six posts it takes about 400px, so on a phone the feed, which is what Browse is for, starts below the first screen. It stays on Browse rather than moving to a tab: seeing bump state while browsing is what reminds people to bump before a post goes idle.

## What Changes

- Your posts becomes a summary row with a Show/Hide control: "Your posts", then how many posts are listed, how many are idle, and how many can be bumped now.
- Shown, it lists the posts as today, each with its lists, listed or idle, last bump and Bump.
- With no saved choice it starts shown when any post is idle (hidden from Browse until bumped), and hidden otherwise. A bump is open on most posts most of the time, so "can be bumped" is a count in the summary, not a reason to open.
- The viewer's Show/Hide choice is remembered in this browser and wins over the default.
- With no posts nothing changes: the section is not shown, and Post a list stays beside the page description.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-trade-browse`: Your posts is summarised in one row that can be shown or hidden.

## Non-goals

- Moving Your posts to its own tab or into My trades.
- A Bump all control, or bumping from the summary row.
- Remembering the choice per account or across devices.

## Routes

`/trade` (Browse).

## Impact

- `apps/web`: `features/trade/my-posts.tsx` (summary row and Show/Hide), `stores/settings.ts` (the remembered choice), en/ja/ko text for the summary.
- No API or database change: the counts come from the `trade.myPosts` response the section already reads (`listed`, `nextBumpAt`).

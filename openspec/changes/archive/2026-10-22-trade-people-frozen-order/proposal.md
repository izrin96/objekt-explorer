# Proposal

## Why

`trade.people` works out its order again on every page and keeps the pages consistent with snapshots of each whole ranking. That still drops people: someone who moves between Mutual and One way, or leaves a ranking, after the first load but before their row is reached, is never listed for the rest of that scroll. On Browse, someone who bumps mid-scroll moves above the cursor and is missed the same way. Only about 120 people have a listed post on staging, so the whole order is small enough to fix once.

## What Changes

- The first page of `trade.people` works out the whole order of people for the request's filters, Compare with choice and mode: Mutual, then One way, then everyone else under Any; best Mutual first under Mutual only; newest bump first on Browse. It stores that order for an hour and loads posts for the first 12 people only.
- Later pages continue by position in the stored order. A person who no longer has a post the feed keeps is skipped when their page loads. A person who posts or bumps after the first page appears the next time the feed is opened.
- When the stored order has expired, or a cursor comes from a tab opened before the deploy, the server works the order out again and continues after the cursor's person, or at the cursor's position when that person is gone.
- For `trade.people` only, this replaces the per-page ranking resume and the merged ranking snapshots (`mergeSeen`, `peopleScope`, `resumeRanking` on this path, and the tail's own keyset).
- Every input an older tab sends still parses. New cursor fields are optional.

Routes covered: `/trade` (Browse) and `/trade/for-you` (Any and Mutual only), both through `trade.people`.

## Non-goals

- `trade.browse` and `trade.forYou`, which only tabs opened before the merge still read, stay as they are.
- No change to who matches, what counts as Mutual, the order's rules, Mutual N, the post contents, or the page size.
- No load-everything response: posts still load 12 people at a time.
- No change to the web app beyond what the cursor already carries. The web keeps passing `nextCursor` back as it does today.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-browse`: Order and idle posts. The order a feed opens with holds while the viewer scrolls, for up to an hour, so no person is skipped or listed twice when rankings or bumps change between loads. Newcomers appear when the feed is opened again.

## Impact

- `packages/api/src/services/trade-feed/index.ts` (`peopleFeed`, `readPeoplePhase`), a new order store beside `services/trade-feed/scope.ts`, the pure order and slicing helpers in `packages/api/src/lib/trade-feed.ts` with their tests, and `peopleCursorSchema` in `packages/api/src/schemas/trade.ts`.
- Redis: one new key per opened feed (a list of user ids and sections, an hour). The ranking caches are unchanged.
- Page 1 costs about what it does today. Later pages skip the rankings and the Mutual and One way kept-post checks.
- `packages/api/AGENTS.md` (Trade matching) describes the new paging.

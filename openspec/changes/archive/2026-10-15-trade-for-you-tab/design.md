## Context

See proposal.md for why. Today one route, `routes/(container)/trade/index.tsx`, renders `BrowseView` for every mode:
- `matchModeOf(search, canMatch)` in `features/trade/browse-search.ts` picks Off, Any or Mutual. It defaults to Any for a viewer who can match, and to Off on a `slug` link.
- `toBrowseInput` passes the mode to `trade.browse`.
- `MatchingControls` (`features/trade/matching-controls.tsx`) draws the Off · Any · Mutual tabs, with Mutual N from `mutualCountOptions(list)`, and Compare with only when the mode isn't Off.
- `routes/(container)/trade/for-you.tsx` is a `beforeLoad` redirect into `/trade`, through `forYouSearchSchema` and `forYouToBrowse`.
- `TradeTabs` (`features/trade/trade-tabs.tsx`) is a fixed list of Browse and My trades, with My trades counted by `tabCountsOptions`.

The server already does everything For you needs:
- `trade.browse` takes `match` and `list`;
- `trade.mutualCount` counts Mutual N;
- `feedWhere` leaves the viewer's own posts out whenever matching narrows the feed (`packages/api/src/services/trade-feed/query.ts`, in the working tree on `feat/trade`, not yet committed).

## Goals / Non-Goals

**Goals:**
- Two routes, one view: Browse and For you share `BrowseView` and its loader logic, so a fix to the feed lands on both.
- Every old URL lands somewhere sensible without a flash of the wrong page.

**Non-Goals:**
- Any change to `packages/api` inputs, including `trade.browse` and `trade.tabCounts`. The server changes only what Mutual lists and counts (WTT only).
- Caching Mutual N beyond what `trade.mutualCount` already does.

## Decisions

1. **One view, a `surface` prop.**
   - `BrowseView` takes `surface: "browse" | "forYou"`.
   - On Browse:
     - the mode is always Off;
     - `MatchingControls` isn't mounted;
     - the matches prompt shows only for a viewer who can't match;
     - Your posts shows.
   - On For you:
     - the mode is `match ?? "any"`;
     - `MatchingControls` is mounted;
     - Your posts and the matches prompt don't show.
   - The loader body moves into one shared function in `features/trade/`, which both route files call with their surface. That way the loader and the view build the same query key.
   - *Alternative:* a separate `ForYouView`. Rejected: it would copy the feed, the empty states and the person sheet, which must not drift apart.

2. **Each route has its own search schema, and old links get normalised in `beforeLoad`.**
   - `browseSearchSchema` still parses `match`, `matches` and `list` so old links can be read. The `/trade` `beforeLoad` then acts on them:
     - `match=any|mutual`, or `matches=1` with no `match`, throws a `replace` redirect to `/trade/for-you`, keeping `list`, `person` and the filters;
     - `match=off`, or a stray `list`, throws a `replace` redirect to `/trade` without them.
   - `forYouSearchSchema` becomes Browse's filters plus:
     - `match`, which accepts `any`, `mutual`, `they_have` and `they_want`;
     - `list`, `person`, and the old `partner`.
   - The `/trade/for-you` `beforeLoad`:
     1. normalises the old values (`they_*` becomes `any`, `partner` becomes `person`) with one `replace` redirect when any is present;
     2. runs `requireSignedIn`, which sends a signed-out visitor to `/login?redirect=<href>`;
     3. reads `currentUserOptions` and, when `canMatchOf(user.lists)` is false, redirects to `/trade` with the filters only.
   - The pure mapping lives in `browse-search.ts`, tested in `browse-search.test.ts`: `browseRedirect(search)` returns the target or `null`, and `forYouNormalise(search)` returns the cleaned search or `null`.
   - `forYouToBrowse` and `matchModeOf`'s Off default are removed.
   - *Alternative:* map old values inside the view. Rejected: the URL would keep the old shape, and a shared link would carry it on.

3. **The For you tab reads the viewer's lists and carries no count.**
   - `TradeTabs` builds its items from `useCurrentUser()`. For you is added only when `canMatchOf(currentUser.lists)` is true.
   - Mutual N lives on the Mutual only switch, from `mutualCountOptions(list)` for the current Compare with choice, so the number only ever means mutual people.
   - *Alternative:* a tab count. Rejected: a mutual count reads as a match count on a tab that lists every match, and an any-match count runs For you's whole partner ranking on every tab bar load.

4. **Matching controls become one row: a Mutual only switch, the Post type menu, Compare with and the help.** The switch keeps the rule that resets a `list` the new mode can't use. The row wraps, so the phone Matching button and sheet go. Under Mutual, `postTypeOf` reads the type as WTT for the page and `toBrowseInput`, and the server forces WTT too, since a WTB or WTS post is one-way.

5. **Links point at For you.** Each of these links to `/trade/for-you` with the same search they use today:
   - `notification-items.tsx` (`match: "any", list`);
   - `user-menu.tsx` (`match: "mutual"`);
   - `list-header.tsx` Find matches (`match`, `list`).

   These stay on `/trade`:
   - the list header's On Trade badge;
   - the objekt drawer's `slug` link, which lists every post, as Off did;
   - My trades' Browse button.

   Browse's sign-in prompt redirects to `/trade/for-you`, so signing in from it lands on matches.

## Risks / Trade-offs

- **A viewer with a list now lands on every post, not matches.** They have to click For you to see matches. → The alert, menu and Find matches links all go straight to For you, and Find matches shows the per-list mutual count.
- **Hiding the tab hides the feature from people without a list.** → Browse's prompt line (Sign in, or Post a list) stays, and its copy names what For you needs.
- **The tab bar now depends on the current user.** On the server render it must match the client's. → `currentUserOptions` is already in the route loader's cache before the bar renders, so both renders read the same value.
- **`trade-active-hours` (not yet applied)** puts an Active now switch beside the Matches control. → That change should place it on For you's control row. Note it in that change when it is applied.

## Migration Plan

Web only, with no database change. Deploying is the rollout, and reverting the web image is the rollback. Notifications store their list slug and build their link in the browser, so old notifications pick up the new target with no backfill.

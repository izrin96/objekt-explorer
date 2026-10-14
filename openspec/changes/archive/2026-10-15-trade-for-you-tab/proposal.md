## Why

Since `trade-merge-for-you-into-browse`, Browse carries a Matches control reading Off · Any · Mutual. Off is an odd thing to pick on purpose, and Compare with only appears once Matches is not Off. The merge also changed the default: someone with a list lands on a filtered feed instead of every post. A For you tab that is the same post feed with matching always on fixes all three, and it stays clear of the confusion the merge fixed, because both tabs show the same posts in the same layout. The old For you was a different screen of ranked people.

## What Changes

- **Tabs become Browse | For you | My trades.** For you is shown only to a signed-in viewer with a list that takes part in Trade. The tab carries no count, since For you lists every match; Mutual N sits on the Mutual only switch.
- **Browse lists every post.** It has no Matches or Compare with control. It keeps the match chips, rings, All matches and the person sheet, as Off does today, and it keeps Your posts. The viewer's own posts stay listed there, so they can see a bump land.
- **For you (`/trade/for-you`) is Browse with matching on.**
  - One row: a **Mutual only** switch (off is Any, the default; Off is gone), the Post type menu, Compare with and the help. It wraps on a phone, with no separate sheet.
  - The switch reads "Mutual only N". Mutual lists WTT posts only, since WTB and WTS are one-way money.
  - Compare with is always shown; a line under it says what a named list compares.
  - The facets and person sheet behave as on Browse, and the Post type tabs become a menu on both tabs.
  - The viewer's own posts are never listed there.
- **Access.** A signed-out visitor opening `/trade/for-you` is sent to sign in, then back. A signed-in viewer with no list that takes part is sent to `/trade`. Browse keeps its sign-in and Post a list prompts, which now explain what For you needs.
- **Old links keep working.**
  - `/trade?match=any|mutual` and `/trade?matches=1` redirect to `/trade/for-you`, keeping `list` and `person`.
  - `/trade?match=off` drops the parameter.
  - For you links from before the merge (`match=they_want`, `match=they_have`, `partner`) map onto the new page.
- **Links move to For you:** want-list and reverse alerts, the list header's Find matches, and the account menu's Trade matches.
- **Default landing stays Browse.** The Trade nav item still opens `/trade`.
- **Open tabs:** `trade.browse` input is unchanged, so a tab loaded before the change keeps working.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-trade-browse`: Matches to the signed-in viewer, Trade tabs, and Matches and Compare with (now For you's Mutual only switch, the Post type menu, WTT-only Mutual, and Compare with always shown).
- `web-trade-for-you`: Old For you address becomes the For you page and its redirects.
- `web-shell`: the account menu's Trade matches target.
- `web-lists`: the Find matches target.
- `web-notifications`: the want-list and reverse alert targets.

## Routes

- `/trade`: loses `match` and `list`; an old link carrying them redirects.
- `/trade/for-you`: a real page again, with `match` (`any`, `mutual`), `list` and `person`, plus Browse's filters.
- `/trade/mine`: unchanged.

## Non-goals

- Bringing back For you's old person-ranked rows, its one-way views, or the `trade.forYou` UI.
- Changing the matching rules, Mutual ranking, the 200-candidate bound or the chips. Mutual N changes only to count people with a WTT post.
- Any API input change, database change or new procedure.
- Opening For you by default for viewers who have a list.

## Impact

- `apps/web`:
  - the routes `routes/(container)/trade/index.tsx` and `for-you.tsx`;
  - in `features/trade/`: `browse-search.ts` (with tests), `browse-view.tsx`, `matching-controls.tsx` and `trade-tabs.tsx`;
  - `features/notifications/notification-items.tsx`, `features/list/list-header.tsx` and `components/layout/user-menu.tsx`;
  - en, ja and ko messages.
- `packages/api`: no input change. `trade.browse` forces WTT under Mutual, and `trade.mutualCount` counts people with a WTT post (cache key bumped). `trade.tabCounts` is unchanged and still asked for `forYou: false`.
- `trade-active-hours`, not yet applied, puts its Active now switch on For you's control row.

## Why

Show my matches exists on someone else's list page and on Market, but not on a profile. A trader who opens a profile from Trade, chat or a hover card has to scan the whole Collection tab by eye to find what they want from that person, even though their want lists already say what that is.

## What Changes

- **Show my matches on a profile's Collection tab.** A signed-in viewer on someone else's profile gets the toggle in the Collection filter bar, off by default.
  - On, the grid keeps only the objekts the profile holds today that are transferable and whose collection is on any of the viewer's want lists, whatever each list's Open to says, together with the filters.
  - Beside the toggle, "N you want" counts collections and opens "Matched with your lists", naming the want lists behind them, as on a list page.
  - While the matches load, the grid shows its skeleton, as Market does. A refusal shows its reason beside the toggle and hides the grid.
  - When nothing matches, once every page of the collection is in, the page reads "Nothing here matches your lists" with Show all.
  - With it on, the shown count, the selection bar, Add to list and Discord format read the matches only.
  - Hidden on the viewer's own profiles, to a signed-out visitor, at a checkpoint and on Spin.
- **New procedure `trade.profileMatches`** (signed in, the feed's rate limit, no input). It returns the viewer's wanted collections, each with the want lists that hold it.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-profile`: adds "Show my matches on a profile".

## Routes

`/@<nickname>` (the Collection tab) only. The Progress, Statistics, Activity and Lists tabs are unchanged.

## Non-goals

- Near matches (`· N more if you sell`): the list page's near section is not carried over.
- The other direction ("N you have", the profile owner's wants against the viewer's have lists).
- Hiding objekts the owner lock-marked: only non-transferable objekts are left out.
- Keeping the toggle in the URL; it is component state, as on Market and list pages.
- Changing Show my matches on list pages or Market, or `trade.marketMatches`.
- `/api/v1`: the procedure is signed-in only and not mounted there.

## Impact

- `packages/api/src/services/trade-feed/index.ts`: `fetchProfileMatches`, over `fetchViewer`'s `want` index.
- `packages/api/src/routers/trade.ts`: `profileMatches`.
- `apps/web/src/features/trade/queries.ts`: `profileMatchesOptions`.
- `apps/web/src/features/profile/collection-view.tsx`: the toggle, the narrowing, the skeleton and empty states; it reuses `ShowMyMatches` from `features/list/show-my-matches.tsx`.
- `apps/web/messages/{en,ko,ja}.json`: `profile_matches_empty_hint`.
- No schema, migration or worker change. Old tabs never call the new procedure.

# Proposal

## Why

On 2026-11-12 a user asked to filter Market by the objekts on one of their lists, so what they keep on a want list for swaps can also be checked for sale and price. Market's Show my matches already narrows to every want list at once, but not to one list, and not to a have or sale list ("what do my spares sell for"). Market's Compare takes only the viewer's profiles. On a list page, Compare takes another list only as a pasted link or ID, even when the list is the viewer's own.

## What Changes

- Market's Compare menu gains a second group, the viewer's own lists, each with its type badge. Picking one shows only the collections on that list (`cmp_type=list`, `cmp_mode=matches`), under the usual Compare banner, which names the list.
- The profile group stays as it is (what that profile does not hold).
- The Compare dialog on a list page gains a picker of the viewer's own lists when the target is a list, with "Other list…" keeping the paste field, as the profile picker does.
- The Compare banner names one of the viewer's own lists by its name, not its ID.
- A new read, `compare.listSlugs`, returns the collection slugs on one of the caller's own lists.

## Non-goals

- No mark on Market cards for collections on a list.
- No change to Show my matches.
- No "missing" mode for a list on Market, and no list of someone else's: Market's Compare stays the viewer's own profiles and lists.
- No change to how a comparison is computed on list pages.

## Routes

- `/market`: the Compare menu, banner and grid.
- `/list/$slug` and `/@{$nickname}/list/$slug`: the Compare dialog and banner.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-market`: adds Compare on Market, with profiles and lists.
- `web-compare`: adds the own-list picker and the banner naming an own list.

## Impact

- `packages/api`: `compare.listSlugs` (new procedure and service read; no input of an existing procedure changes, so open tabs are unaffected).
- `apps/web/src/features/market/`: `market-compare-button.tsx`, `use-market-compare.ts`, `use-market-objekts.ts`, `market-view.tsx`.
- `apps/web/src/features/compare/`: `compare-dialog.tsx`, `compare-banner.tsx`; `features/list/list-view.tsx` passes the banner a name.
- `apps/web/messages/{en,ko,ja}.json`.
- No schema or worker change.

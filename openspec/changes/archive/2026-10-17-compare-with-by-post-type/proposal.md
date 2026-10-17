## Why

On For you, Compare with offers lists that can never match the picked Post type. With WTB picked, a lone want list is offered, but a WTB post is only the poster's want list, matched against the viewer's have and sale lists, so nothing can ever match and the feed reads empty. The Mutual only switch also sits between the Post type menu and Compare with, though Compare with and Post type belong together.

## What Changes

- Compare with disables, not hides, the lists the picked Post type can't match: under WTB a selection with no have or sale list (a lone want list), under WTT a selection with no have list and no want list open to swaps (a lone Buying only want list), under WTS a selection with no want list open to buying (a lone have list, a sale list, a lone Swaps only want list, a pair whose want list is Swaps only). All disables nothing; Mutual is unchanged.
- Changing Post type resets Compare with to All my lists when the new type can't use the selected list. The Post type menu never disables an option because of the list.
- A `list` in the URL that the current type can't use reads as All my lists in the menu, the compared-lists line, the person sheet and the request, so an old `?type=wtb&list=<want list>` link doesn't come back empty.
- From `md` up, the Mutual only switch moves to the very right of the row, after Compare with and the help. Below `md` the order is unchanged.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-trade-browse`: "Matches and Compare with" (the Compare with bullets and the Layout paragraph).

## Routes

`/trade/for-you` only. Browse (`/trade`) has no Compare with.

## Non-goals

- Any server, `/rpc` or `/api/v1` change: the matching rules already behave this way, and the page only stops offering lists that match nothing.
- Changing which posts a type lists, Mutual's rules, or the Mutual only count.
- Rewriting the URL for a stale `list` on load.
- New strings: no copy changes.

## Impact

- `apps/web/src/features/trade/`: `compare-rule.ts` (rule, new), `matching-controls.tsx`, `browse-view.tsx`, `browse-search.ts`, `browse-loader.ts`, with `compare-rule.test.ts` (new) and `browse-search.test.ts`.
- `openspec/specs/web-trade-browse` delta.

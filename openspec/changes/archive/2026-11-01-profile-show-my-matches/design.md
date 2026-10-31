## Context

Show my matches has two homes today, each with its own server read:

- `trade.listMatches` (list pages) matches a list against the viewer's lists by For you's rules, near matches included.
- `trade.marketMatches` (Market) returns `fetchViewer(...).saleWant`: the viewer's wanted collections from want lists open to buying, each with the list ids behind it. Market narrows its rows by slug on the client.

Both render `ShowMyMatches` (`features/list/show-my-matches.tsx`), which draws the toggle, its spinner, the refusal and the "N you want" chip with `MatchedListsChip`.

The profile's Collection tab (`features/profile/collection-view.tsx`) reads `useProfileObjekts`, which pages every owned page up front through `useLoadAllPages` and filters in the browser. Its `filtered` mixes owned rows with catalogue rows when the Unowned or Missing filter is on. `useProfileAuthed` is true on any profile at an address linked to the viewer's account.

## Goals / Non-Goals

**Goals:**
- Reuse `ShowMyMatches` and the viewer index; add no component or store.
- Narrow on the client, as Market does, since every owned page is already in the browser.

**Non-Goals:**
- A server-side filter on the owned-objekts query.
- A shared hook across the three Show my matches homes; each reads a different source.

## Decisions

### 1. `trade.profileMatches` returns the whole `want` index

The objekts belong to the profile, which may swap or sell, so every want list counts, whatever its Open to. `fetchProfileMatches` returns `Object.fromEntries(viewer.want)`, the same shape as `marketMatches`, so the web narrows the same way.

- Alternative: reuse `marketMatches`. Rejected, because `saleWant` drops want lists that only take swaps.
- Alternative: add an `openTo` input to `marketMatches`. Rejected, because a new input on a live procedure must stay compatible with open tabs for no gain over a second procedure.
- Alternative: a lighter query reading only want entries. `fetchViewer` also builds the have index, but that is cached for 5 minutes per user and Market pays the same, so one source for `want` wins for now.

### 2. Narrow `filtered` before pin ordering

`collection-view.tsx` renames the hook's `filtered` to `allFiltered` and derives `filtered` from it: owned rows only (`isObjektOwned`, which drops catalogue rows), `transferable`, and slug in `want`. Everything below it (pin order, counts, select bar, Discord button, drawer copies) reads the narrowed set unchanged, so no other branch needs to know the toggle exists.

- Alternative: narrow inside `useProfileObjekts`. Rejected, because Progress and Statistics share that hook and have no toggle.

### 3. Skeleton while loading, as Market

Market's grid shows its skeleton while matches load, and the list page keeps its whole grid with a spinner on the toggle. The profile follows Market: a whole collection that then shrinks would read as the answer for a moment. The same reasoning hides the grid on a refusal.

### 4. "Nothing matches" waits for the last page

Matches are sparse, and `useLoadAllPages` brings later pages after the first paint. While `hasNextPage` holds and nothing has matched yet, the grid shows its skeleton instead of the empty state.

### 5. Gating

`canMatch` = signed in, not `useProfileAuthed`, no `at`, not Spin. Spin holds counted rows with no transferable copy, and a checkpoint is not tradable today. The toggle is `useState`, as on Market and list pages.

## Risks / Trade-offs

- [A broad want-list rule expands to thousands of collections, so the reply can be large] → It is fetched only while the toggle is on and cached for the feed's stale time; Market already carries the same size.
- [While the viewer's profiles load, `useProfileAuthed` reads false, so the toggle may flash on their own profile] → Turning it on there shows their own holdings narrowed, which is harmless; it disappears once their profiles load.
- [The toggle stays on when navigating from one profile to another without unmounting the view] → The chip and the narrowed grid show it is on, and Show all turns it off.
- [An objekt the owner lock-marked to keep still shows as a match] → Recorded as a non-goal in the proposal.

## Migration Plan

Deploy web and API together as usual. The new procedure has no input, and tabs from before the deploy never call it. To roll back, revert the web change; the procedure can stay unused.

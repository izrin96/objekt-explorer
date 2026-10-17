# Design

## Context

See proposal.md. Matching (`packages/api/src/lib/trade-feed.ts`): a sale list post is WTS; a post with a have list, or a want list alone that is Swaps only, is WTT; a want list alone open to buying is WTB. A post's have side matches the viewer's want lists, a sale side the want lists open to buying, and a want side the viewer's have lists (sale lists too when open to buying). `pickedSides` joins a picked list with its linked list when that is on the other side.

`canCompare` and `comparedList` (now `compare-rule.ts`) take Mutual only. `toBrowseInput` is shared by the loader and the view, which must build the same query key, and today sends `search.list` as given.

## Goals / Non-Goals

**Goals:** one pure rule for what a selection can match by type; the menu, the line, the person sheet and the request all read it; no API change.

**Non-Goals:** reading the server's matching from the page, or a Post type that reacts to the list.

## Decisions

1. **One rule with an options object.** `canCompare(list, tradeLists, { mutual, type })` and `comparedList(slug, tradeLists, { mutual, type })`. Mutual stays as is; WTB needs `pickOf(...).ways.have`; WTS needs a want side open to buying; WTT needs a have side or a want list open to swaps (`matchHave`), since `fetchViewer` leaves a Buying only want list out of `tradeWant`; All needs nothing; TT need nothing. Callers already hold both values. Alternative: a second function per type, rejected since every caller needs both rules at once.
2. **WTS needs the want half's `matchSale`.** `TradeList` gains `matchSale` and `matchHave` (booleans; nullish on the data reads as false, as the server does), carried by `tradeListsOf` from `useUserLists()` data, which already has it. The WTS check looks at the picked list and its pair: some want list among them with `matchSale`. `pickOf` already returns `paired`, so the rule needs no new lookup.
3. **Stale list through `toBrowseInput`.** It takes the viewer's `tradeLists` as a fifth parameter and sends `comparedList(...)?.slug`. The loader derives them from `currentUserOptions` data (`user.lists` through `tradeListsOf`), the view from `useUserLists()`, so both keys agree. Without a signed-in user the list is dropped, which For you already can't reach. Alternative: filter in the view only, rejected because the loader would prefetch a different key.
4. **Reset on type change.** The Type menu's `onChange` in `browse-view.tsx` clears `list` when `comparedList` under the new type is empty, the way `setMutual` does.
5. **Person sheet** already reads `comparedList(...)?.slug`; it gets the type too. The Mutual count query keeps `comparedList(list, tradeLists, { mutual: true, type: "wtt" })`: Mutual forces WTT, so the type never affects it.
6. **Layout.** Only classes change. The switch takes `max-md:order-1 md:order-4`; Compare with takes `order-3` (it was the same below and above `md`) and the switch also takes `md:ml-auto`, so it sits at the right edge from `md` up; `browse-filters.tsx` is untouched; the divider stays `md:order-2`, Post type `md:order-1`. The switch sits last on the row when it wraps.
7. **Mutual off.** `scopeOf(mode, type)` in `compare-rule.ts` is the one place where Mutual forces WTT; every site that builds a scope uses it. `MatchingControls` takes `urlType` (the URL's `type`, or All), so `setMutual` builds the scope it is moving to from the mode it switches to and `urlType`, and the URL never keeps a list the resulting type can't use.

## Risks / Trade-offs

- [The page rule drifts from the server's matching] → The matrix is pinned in `compare-rule.test.ts`, and the server rules are cited above.
- [A `matchSale` that is nullish on a want list read from an older payload] → Treated as false, which matches the schema default for Swaps only.

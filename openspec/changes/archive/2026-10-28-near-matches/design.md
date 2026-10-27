# Design

## Context

Trade finds matches through two pipelines that apply the same Open to rules:

- **Recount** (`trade-matches/candidates.ts` SQL, then `recount.ts` and `lib/trade-rank.ts`) produces the row's counts, Can swap, For you's ranking and the builder's `suggestOffer`. Its SQL drops every pair that fails `offerMatchesWantSql`, so a near match never reaches it.
- **Viewer index** (`trade-feed/viewer.ts` `fetchViewer`, then `lib/trade-feed.ts` `indexFor`) produces strip rings and per-list counts (`assemblePost`, `previewSide`), the "+N" dialog (`fullSide`, `trade.sideItems`) and Show my matches (`listMatchesOf`, `trade.listMatches`). `fetchViewer` already holds the viewer's slug sets `have`, `want`, `tradeHave` (have lists and sale lists open to swaps), `saleHave`, `tradeWant` (want lists open to swaps) and `saleWant` (want lists open to buying).

`indexFor` picks one set per list:
- have: `tradeWant`
- sale: `want` when it takes swaps, else `saleWant`
- want: `saleHave`, `have` or `tradeHave` by Open to

The offer picker's "Only what they want" (`wantSlugsOf`) ignores Open to. That is why it shows D337Z while the row doesn't. The objekt drawer shows nothing match-related today. Strip thumbnails open it through `ObjektCard`'s `onOpen`.

## Goals / Non-Goals

**Goals:**
- Near matches on every surface that rings matches from the viewer index, from the same index, so the strip, dialog and list page agree.
- No change to any count, ranking, cache value, alert or API shape outside the viewer's own reads.

**Non-Goals:**
- Touching the recount pipeline, the worker or the want-alert matcher.
- Near matches through rules.
- Chat post cards: their match is the cached `personDetail` (`trade:person:7`), left as is.

## Decisions

### A near index beside the match index

`nearFor(listType, list, viewer)` in `lib/trade-feed.ts` returns `{ verb, slugs } | null` from set differences of what `fetchViewer` already holds. It adds no query and no new cache.

| Their list | Match set | Near set | Verb |
|---|---|---|---|
| want, Buying only | `saleHave` | `tradeHave − saleHave` | sell |
| want, Swaps only | `tradeHave` | `saleHave − tradeHave` | swap |
| want, Swaps or buying | `have` | none | |
| have | `tradeWant` | `saleWant − tradeWant` | swap |
| sale, Sell only | `saleWant` | `tradeWant − saleWant` | buy |
| sale, Sell or swap | `want` | none | |

Since the match set is subtracted, a match is never also near. The two sets built from the viewer's want lists also drop `ruleWant`, so a collection wanted only through a rule is never near. The table is a pure function, unit-tested beside `indexFor`. Alternative: widen the candidates SQL with a near flag. Rejected, because it would touch the ranking path and its cached values for something only the viewer index draws.

### Wire shape

- **Strip items** (`trade.people`): gain `near`, the viewer's list ids holding that collection, beside `ringed`, so the drawer names the list.
- **Each side**: gains `near: { verb, count, listIds }` (absent when none). It sits on the side, not on `post.match`, since each strip draws its own; `listIds` are the viewer's lists holding the near collections, for the popover; `count` counts collections.
- **`trade.sideItems`**: items gain `near`, and the result gains `near` as above.
- **`trade.listMatches`**: gains `nearSlugs`, `verb` and `nearListIds`.

Every field is additive. The `trade:have-lists` viewer cache holds the sets, not the results, so no key changes. A cached feed page, if any holds `post.match`, bumps its version.

Order: `previewSide` and `fullSide` sort ringed, then near, then newest, in one comparator.

### Builder and picker

`suggestOffer` keeps the recount for matches. For near matches it reads `personNear` (the viewer index over the partner's lists on Trade in posts still listed, as the strips draw them, or the post's lists with `post`); a partner the recount does not return still gets their near matches, groups them with the pure `nearGroups` (`lib/offer-prefill.ts`) and picks copies with `chooseMatchPicks`, so the copy rules stay the same. The result gains `near: { side, verb, items }[]`, with picks not added.

The client keeps them apart from the matches:
- `matches-line.tsx` renders the near line.
- Add it puts the picks through the same add path and marks them in the `added` set, so Remove matches takes them out.

The two picker directions:
- **Your side** (`mine.ts`, matchOnly): the page gains `tags`, by collection: the near verb, or `loose` for a collection on none of the viewer's have or sale lists (`pickerTags`, through `pickerTagsFor`).
- **Their side** (`theirs.ts`): tags their copies the same way, never `loose`.

`wantSlugsOf` stays as is: "Only what they want" keeps showing everything they want. The tags read the person's lists in listed posts against all of the viewer's lists, not Compare with's: the picker has no Compare with, and "loose" would mislabel a copy on a list Compare with leaves out.

### Top-up preset

The builder's top-up state (`builder/topup.tsx`) gains a preset: when Add it or Make offer with it adds a sell or buy near match and there is no top-up, it opens with the payer set (them for sell, you for buy), no amount, and the one-line reason. This is the existing top-up section with an initial value, not a new component.

### Drawer line and fixes

The strip and dialog pass a near context (`verb`, the person's name, their list, the viewer's list ids) to the drawer through the existing `onOpen` path. The drawer renders one line and one link from it.

- **Sell:** the link opens Add to list (`useOpenAddToList`, `features/list/add-to-list-dialog.tsx`) with a new `listTypes: ["sale"]` and bound-only filter option. This reuses the existing dialog rather than adding a new one.
- **Swap and buy:** the link opens the composer through `useComposer().openWith`, with a `ComposerStart` taken from the viewer's post holding that list and `alsoPay` or `alsoSwap` set. A list on no post starts a new post with it picked.
- **Make offer with it:** opens the builder with `addNear: [slug]`, which runs Add it for that slug once the suggestion lands.

### Look

The look is option A from the canvas: `outline-dashed outline-muted-foreground` with the ring's offset, kept as a `NEAR_RING` constant beside `RING`. The near line and tags use `text-muted-foreground`. No new colour token is needed. The dark theme was checked on the canvas. If the dashes read too faint, the fix is a thicker outline, not a new colour.

## Risks / Trade-offs

- **Noise.** Defaults (Swaps only wants, Sell only sale lists) make "if you buy" and "if you swap" common on WTS strips. Mitigation: muted marks, sorted after matches, and no effect on order. If it proves noisy, a per-viewer hide is a follow-up.
- **Suggest cost.** `suggestOffer` builds the viewer index in addition to the recount. `fetchViewer` is cached per viewer, so the extra work is one set pass per partner list.
- **Two pipelines.** Near matches come only from the viewer index. A future rule change must update `indexFor` and `nearFor` together, so the shared test table covers both.

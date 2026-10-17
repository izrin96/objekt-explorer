# Design

## Context

`person-sheet.tsx` renders the sheet. It has a visible `SheetTitle` with the name, then `TradeHeader` with the name again, a `MatchChip` with the `MatchedLists` popover, two `Column`s in a `sm:grid-cols-2` grid, a Their matched lists block and a closing "Ownership checked" line. Each `Thumb` is an `ObjektCard` with `hideLabel` and no caption. `trade.person` already returns everything the new layout needs:
- each match carries `partnerListIds`: the person's have or sale lists for `theyHaveIWant`, their want lists for `iHaveTheyWant`;
- `lists` holds their matched lists, sorted most matches first;
- `dropped` holds the not counted objekts, with a direction and no list.

`TradeHeader` always truncates its `TrustLine`. On a phone it swaps in `phoneLine`, a monospace line, truncated, built in `browse-post.tsx` from the tag, `<TrustLine className="inline">` and the time. `SheetPopup` draws its close button absolutely at `top-2 inset-e-2`.

## Goals / Non-Goals

**Goals:**
- Match the mockup with existing parts: `TradeHeader`, `ListRoleBadge`, `getListLinkOption`, `ObjektCard`, `TILE`, the `MATCH_TONE` colours, `TradeActions`.
- Keep the grouping rule pure and tested.

**Non-Goals:**
- No API or query change, no new store.
- `MatchChip` and `MatchedLists` stay as they are for posts.

## Decisions

1. **One title.** `SheetTitle` becomes `sr-only` (still the dialog's accessible name). `TradeHeader` moves into the `SheetHeader` slot with end padding so the ⋯ menu clears the close button. Not chosen: removing the name from `TradeHeader`. That would fork the shared header just for the sheet.
2. **The trust line wraps in the sheet.** `TradeHeader` gets a `wrapTrust` flag (or similar) that drops `truncate` from its `TrustLine`. Posts keep truncating, as the spec requires. The "updated · ownership checked" line is passed through the existing `note` prop. `checkedAt` moves out of the panel's end into it.
3. **Summary.** A small local `PersonSummary` in `person-sheet.tsx`: three cells in a `grid-cols-3`.
   - It reuses `MATCH_TONE` for the A and B ink, and the chip's mutual tone (`toneChip("progress")` or what `match-chip.tsx` exports) for the Mutual cell when M > 0.
   - The A and B cells are buttons. They scroll their section's heading into view and focus it (`tabIndex={-1}` on the heading).
   - Not chosen: anchor links. A `#hash` would collide with the URL-driven sheet state.
   - It reads `partner.counts`, the same counts the chip reads, so the two can't disagree.
4. **Grouping is a pure function** in a new `features/trade/person-groups.ts`, with `person-groups.test.ts` beside it.
   - Signature: `groupByList(matches, lists) → { list, slugs }[]`.
   - It walks `lists` in their given order and assigns each match to the first of its `partnerListIds` found there. A match whose lists are all missing goes to the last group, unlabelled; this is defensive, since the server shouldn't send it.
   - The module imports nothing from Paraglide or React, so `bun test` runs it.
5. **Sections.** The `Column` becomes a `Section`: heading, groups, then not counted objekts.
   - The thumbnail grid is `grid-cols-5` below `md` and `md:grid-cols-[repeat(auto-fill,minmax(3rem,1fr))]` from `md`, so a phone has a known row length for the two-row rule. That is 10 places: 9 objekts and the "+N" tile when a section holds more than 10.
   - The tile is a button holding local `expanded` state, and `CARD_LIMIT` (50) still caps the expanded section.
   - Group headings use `ListRoleBadge` and a `Link` from `getListLinkOption`, as the old lists block did.
   - "from {list}" and "for {list}" are messages with a `{list}` placeholder, split around it so the name renders as a link. Follow the existing split pattern (`MonoMessage`'s `text` callback, or the same approach), so ko and ja can place the name where their grammar needs it.
6. **Captions.** `Thumb` renders the `ObjektCard` (unchanged) with a monospace caption under it: the member over the collection number (`collectionNo`, as the rest of the app formats it), `text-xxs`, `line-clamp-2`. The slug fallback tile stays.
7. **Footer.** `SheetFooter` becomes `grid grid-cols-2` below `md`, so `TradeActions`' two buttons split the width. From `md` it keeps `justify-end`. "Not taking messages" spans both columns.
8. **Compact trust line.** `TrustLine` gets `variant?: "full" | "compact"`.
   - Compact with no completed and no unfinished trades renders a small muted "New" tag (new `trust_new` message).
   - Otherwise compact renders the full line minus the `since` part.
   - `browse-post.tsx`'s `phoneLine` passes `variant="compact"`.
   - Even compact, "WTT · 5 verified · 50% · Bumped last week" overflows 390 px, so `TradeHeader`'s phone line wraps instead of truncating. `browse-post.tsx` wraps each part (tag, reputation, time, note) in `whitespace-nowrap`, so a break falls between parts and never inside one.
   - Not chosen: a second component. The rules for unfinished, positive share and their screen-reader text would be duplicated.

## Risks / Trade-offs

- [The sheet no longer has the matched-lists popover] → the list groups now name each list in place and link to it, which is what the popover gave.
- [A long list name in a group heading] → it wraps (`break-words`) under the badge, and no truncation hides it.
- [Auto-fill columns at `md` and up make the row length vary] → the two-row rule applies below `md` only, as the spec says.
- [A "New" tag could read as a new post] → it sits after the post type tag, in muted secondary style, and its accessible text says it's about the account: the `trust_new` message reads "New trader" for screen readers and "New" visibly.

## Migration Plan

Front end only. No data or API change, and it ships with the branch. Rolling back reverts the files.

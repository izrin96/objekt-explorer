## Context

See proposal.md for why. Current state in `apps/web/src/features/trade/`:
- `browse-post.tsx`: a `bg-card` article stacking `TradeHeader` (tags in `end`), the anchor list's name and one-line description, one `PostStrip` per side, the `MatchChip` with any See in For you link, and a footer with the time and compact `TradeActions`.
- `post-side.tsx`: `PostStrip`, a `grid-cols-[3rem_1fr]` row of a role label and up to `STRIP_LIMIT = 10` `w-10` thumbnails that wrap, then a "+N" `TILE` linking to the list. Rings and sale prices live here.
- `browse-view.tsx`: chunks posts into pairs (`POSTS_PER_ROW = 2`) for `WindowVirtualizer`, each pair a `grid lg:grid-cols-2`; `ssrCount` and the skeletons follow the pairs.
- `partner-row.tsx`: a `Collapsible` whose header is `TradeHeader` with `end` = chip, "N lists" popover, idle badge, then a chevron; the panel holds the two `MatchColumn`s of `MatchObjekt` (3rem, captions, dropped items) and a footer with the hints, Hide and `TradeActions`.
- `for-you-results.tsx`: holds a `toggled` set; a row is open when `!idle !== toggled.has(id)`; a `partner=` target is opened during render.
- The server sent at most `PREVIEW_LIMIT = 11` items per Browse side plus `more`; For you sends each direction's full list.
- `hooks/use-element-size.ts` already wraps a `ResizeObserver` behind a callback ref.

## Goals / Non-Goals

**Goals:** one layout for the Browse post and the closed For you row; strips that never wrap and stay the same height; same markup on server and client; no API shape change (one-sided posts only send more items).

**Non-Goals:** changes to `TradeHeader`, `MatchChip`, `TradeActions`, `ObjektCard` or the matched-lists popovers beyond the props they already take.

## Decisions

1. **A shared `TradeRow` layout, not a shared card.** A new `trade-row.tsx` exports the three-slot frame (`byline`, `sides`, `actions`, optional `below` for the list line and `panel` for For you's open part). It's a container (`@container`) grid: `grid-cols-[13rem_minmax(0,1fr)_auto]` from a container width of about 48rem, one column below. `TradeSides` lays out one or two strips, with the ⇄ (`ArrowsLeftRightIcon`, rotated 90° when stacked) between two. Browse and For you each fill the slots with their own content.
   *Alternative:* a viewport media query. The feed sits in the page container, and For you shares the width with nothing today, but a container query keeps the post right if either page gains a side column, and it renders the same on the server.
2. **The strip fits by measuring.** `PostStrip` becomes a one-line `flex flex-nowrap overflow-hidden` row of `w-14` thumbnails. A pure `fitCount(width, total, { thumb, gap })` in `strip-fit.ts` returns how many thumbnails to show: all of them when they fit, otherwise one fewer than fits, leaving room for the "+N" tile. `useElementSize` supplies the width. "+N" counts the hidden items plus the server's `more`. `strip-fit.test.ts` covers fits-all, one-short, zero width and `more` > 0.
   - Before the first measure (server render, hydration), the width is 0 and `fitCount` falls back to 4, which fits a 390 px phone. A wider screen then shows more thumbnails in the same row height, so nothing below moves.
   *Alternative:* CSS only (`overflow: hidden` on a wrapping row of fixed height). It can hide what doesn't fit but can't count it for "+N", which the spec requires.
3. **Strip parts are shared; the tile's target differs.** `PostStrip` takes the items to draw (already resolved to `ValidObjekt` or slug), an optional price getter, and a `more` render prop: Browse passes a `Link` to the list (as today), For you passes a button that opens the row. For you builds its strip items from `partner.theyHaveIWant` / `iHaveTheyWant` (counted only), with no captions and no rings.
4. **The list line truncates.** `below` renders `flex min-w-0 items-center gap-x-2` with the list `Link`, the description in `truncate` with `title` set to the full text, then `MatchChip` and the See in For you link as `shrink-0`. The description stays in the DOM, so a screen reader reads it whole.
5. **Browse loses the pairing.** `browse-view.tsx` passes `posts` straight to `WindowVirtualizer`, one post per item with `pb-3`; `ssrCount = Math.min(SSR_POSTS, posts.length)`; `POSTS_PER_ROW` and `ROW_GRID` go. The guard for an `undefined` item past the end stays (the earlier crash fix).
6. **For you rows start closed.** `for-you-results.tsx` derives `open = toggled.has(id)`; the `partner=` branch adds the target to `toggled` whatever its idle state. `PartnerRow` puts the chevron in the `actions` slot after `TradeActions`, and its `CollapsiblePanel` (the existing columns, dropped items and footer) goes in `panel`, full width under the line. Hide moves into that footer, which is already where it is.
7. **The byline spans both rows; sides align to the top.** In the one-line layout the byline column spans the sides' row and the `below` row, so a byline taller than the strips doesn't push the list line (Browse) or the chip line (For you) away from the strips. For you's chip, "N lists" and idle label sit in `below`, not the byline, which keeps the row as short as Browse's. `TradeSides` aligns strips to the top (labels on one line) and centres only the ⇄.
8. **One-sided posts send more.** A pair's side fits about 8 thumbnails at the 2xl container, but a one-sided post's strip takes the whole row, about 17. `assemblePost` passes `previewSide` a limit of `SOLO_PREVIEW_LIMIT = 20` when the post has one side and `PREVIEW_LIMIT = 11` per side otherwise. For you's open columns keep `PREVIEW_LIMIT`.
9. **Skeletons follow the row.** `BrowsePostSkeleton` and `PartnerRowSkeleton` render `TradeRow` with skeleton blocks (avatar and two lines; two strips of four `w-14` photocard skeletons; one button), so the first paint lands in place.

## Risks / Trade-offs

- [After hydration a desktop strip grows from 4 thumbnails to its fitted count] → the row height doesn't change, only the width fills in; posts below don't move.
- [`ResizeObserver` per strip, two per row, in a virtualized list] → only mounted rows observe; virtua keeps a screen or two mounted. `useElementSize` disconnects on unmount.
- [Truncated descriptions hide text on a narrow row] → the full text is in `title` and in the list page; the description was already clamped to one line.
- [Rows closed by default hide the captions people used to read without a click] → the strips show the thumbnails, and the drawer opens on click; captions are one chevron away.

## Migration Plan

Web-only and stateless: ship with the next web deploy; roll back by reverting the commit. No data or API change.

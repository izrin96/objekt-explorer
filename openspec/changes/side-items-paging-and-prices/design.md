# Design

## Context

- `SideItemsSheet` (`apps/web/src/features/trade/side-items-sheet.tsx`) draws the "+N" view as a `Sheet`.
  - It reads one `trade.sideItems` response and draws the list with `CardGrid` inside a `SheetPanel`.
  - `CardGrid` renders every card. `SheetPanel` is a ScrollArea, which gives a `VList` no viewport of its own.
  - It is opened from `post-side.tsx` (the "+N" tile) and from the post menu's Show all, through `finalFocus`.
- On the server, `fetchSideItems` (`packages/api/src/services/trade-feed/index.ts`) runs these steps:
  - it reads the list's entries through `fetchPostEntries`;
  - that function's Redis post-entry cache shares `FeedEntry` with the feed;
  - entries are already filtered by `tradeableEntries` for have and sale lists;
  - `fullSide` (`packages/api/src/lib/trade-feed.ts`) stacks them, ranks them and cuts at `FULL_SIDE_LIMIT = 300`;
  - collections are fetched for the items' slugs.
- `FeedEntry` holds no price or note. Prices, QYOP flags and notes live on `list_entries`.
- A read-only production count found prices, QYOP flags and notes only on sale (and General) entries. Have and want entries carry none.
- `trade.sideItems` is public at `GET /api/v1/trade/lists/{listId}/items`. Each call counts against `limitFeed`, which allows 60 a minute per user and 120 per IP.
- The list page words a sale price through `formatPrice` (`features/list/list-price.ts`). `ObjektCard` draws `price` and, beside it, `note` through `ObjektNote`.

## Goals / Non-Goals

**Goals:**
- Every collection of the side is reachable, with a bounded DOM and bounded payloads.
- Sale prices and notes reflect only the copies the stack shows.
- No change to the feed's shapes or to its Redis cache.

**Non-Goals:**
- No new grid component, and no change to how the strip or the feed ranks items.

## Decisions

1. **Sheet as it was, virtualised inside its panel.**
   - `SideItemsSheet` keeps its `SheetPopup` from the end side at `sm:max-w-3xl` and its `SheetPanel`, so the description, rules, tabs and cards scroll together under the panel's edge fades and thin scrollbar.
   - The cards go through a new `PanelCardGrid` (`features/objekt/virtual-card-grid.tsx`): virtua's `Virtualizer` with `scrollRef` on the panel's scroll-area viewport (found with `closest`, since the vendored `ScrollArea` exposes no ref) and a `startMargin` measured from the content above it, re-measured by a `ResizeObserver` as that content changes.
   - Alternative: `VirtualCardGrid` (a `VList`, its own scroller) in a set-height body. Tried and dropped: it loses the panel's fades and shows the native scrollbar.
   - Alternative: keep `CardGrid` and load pages into it. Rejected: a 3,199-collection list would end at about 3k `ObjektCard`s in the DOM.

2. **Loading ahead.** `InfiniteSentinel`'s 900px margin is measured against the window, which any inner scroller clips, so both grids start the next page from their scroll handler once less than a viewport remains.

3. **Offset paging on the server.**
   - `sideItemsInputSchema` gains `cursor: z.coerce.number().int().min(0).optional()`. The output gains `nextCursor?: number`.
   - `previewSide` and `fullSide` share one helper that ranks the stacks and hands back how a stack becomes its item; each slices before building items, so the feed's 22-tile strips never build a long side's items. `fullSide` slices at its `offset` with `SIDE_PAGE = 200`, and `FULL_SIDE_LIMIT` goes.
   - The order is deterministic: rank, then entry id. So an offset into the stacked, sorted collections is stable between pages unless the list changes.
   - `matched`, `near` and `copyCount` are still computed over the whole side. Collections are fetched for the page's slugs only.
   - Alternative: send everything in one response. Rejected: about 3k collection objects is megabytes of JSON.
   - Alternative: a keyset cursor. Rejected: the rank depends on the viewer, so an offset is the simpler stable key.

4. **The matched tab is the ringed prefix.**
   - The client uses one `useInfiniteQuery` (`orpc.trade.sideItems.infiniteOptions`, `initialPageParam: 0`) and flattens its pages, deduped by collection slug.
   - The "you want" tab shows the ringed items loaded so far. Its sentinel loads more while fewer than `matched` ringed items are loaded.
   - "All N" counts the first page's `items.length + more`.
   - Alternative: a second query filtered to matches. Rejected: it duplicates rate-limited requests.

5. **Prices outside `FeedEntry`.**
   - `fullSide` also returns each page item's copy ids. These are internal and never in the output.
   - For a sale list, `fetchSideItems` reads `id, price, is_qyop, note` from `list_entries` where `id` is one of those copy ids. Taking the copies the stack kept means a copy the owner no longer holds cannot widen the range.
   - A pure `stackAsk(copies)` in `packages/api/src/lib/trade-feed.ts`, tested, folds them, newest first by entry id, into `{ price?: { min, max }, qyop?: true, notes?: string[] }`:
     - `notes` are trimmed, distinct and newest first;
     - fields that would be empty are left out.
   - Alternative: add price and note to `FeedEntry`. Rejected: it would bloat every cached post entry and every feed response.

6. **Wording on the client.**
   - A pure `stackPriceText(ask, format)` in `features/trade/stack-price.ts` takes the amount formatter (the sheet passes `formatCurrency` with the list's currency, as `formatPrice` does, since `use-currency.ts` imports the network client) and is tested:
     - `min === max` gives one price;
     - otherwise `"{min}–{max}"`, with each end formatted and an en dash between;
     - no price with `qyop` gives `m.list_manage_objekt_set_price_qyop()`;
     - neither gives `m.list_price_none()`, drawn with `priceMuted`.
   - Several notes reach `ObjektNote` joined by `\n`. Its popup gets `whitespace-pre-line`, so each note is its own line. The list page's single notes read as before.
   - The card passes `price` and `note` only when `side.role === "sale"`, formatting with `side.list.currency ?? ""` as the list page does.

## Risks / Trade-offs

- [Each page counts against the feed rate limit] → focus and reconnect refetches are off for this query, its pages are dropped once nothing shows them (`gcTime: 0`, and on close), so a reopen costs one request, not one per page loaded; and every next-page load passes `cancelRefetch: false`, so the scroll handler and the sentinel never send one page twice. Also, 200 a page, so the biggest list takes 16 requests. A refusal shows the sentinel's retry, and `retryUnlessRefused` keeps it from retrying on its own.
- [An offset can drift when the list changes between pages] → dedupe by collection slug. A missed collection appears on the next open. This is acceptable for a browsing view.
- [`price` is `real`] → it is formatted with the list's currency as the list page does. No arithmetic beyond min and max.
- [A stack mixing priced and QYOP copies shows only the priced range] → this is the agreed reading. The QYOP copies are still in the stack's count.

## Migration Plan

No schema change and no migration. The API change is additive: an older client sends no cursor and reads the first page, which now holds 200 collections, not 300. Web and API deploy together, as one image.

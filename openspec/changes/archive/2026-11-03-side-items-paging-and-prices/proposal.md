# Proposal

## Why

On Trade, a strip's "+N" opens a side sheet (since `side-items-sheet`) that leaves out what a buyer needs. A sale list's prices and notes never show there, so the visitor has to leave for the list page. Past 300 collections the list is cut off with "N more on the list page". On production the biggest lists on Trade hold 3,199 collections (want) and 2,834 (sale).

## What Changes

- The "+N" view stays the side sheet from the end side, 48rem from `sm` up, as it looks today.
- **No cap.** The sheet reaches every collection of the list. Objekts load in pages as the viewer scrolls, and the grid is virtualised. The "N more on the list page" line goes.
- **Price and note on sale sides.** Each card of a sale side shows its price under the art, and its note behind the note button, as the list page shows them. A stack of copies shows:
  - one price when its copies agree, or the range ("RM 10–RM 15") when they differ;
  - QYOP when no copy is priced but one is QYOP;
  - "No price", muted, otherwise.

  It carries every distinct note of its copies. Have and want sides show no price: no have or want entry on production carries a price, a QYOP flag or a note.
- **`GET /trade/lists/{listId}/items`** (`trade.sideItems`) takes an optional `cursor` and returns pages of 200 collections with `nextCursor`. A sale side's items gain `price`, `qyop` and `notes`. These are additive fields, so an older caller still gets the first page.
- Copies stay stacked into one card with their count. Ratio chips stay as they are.

## Non-goals

- No price on the row's 2.5rem strip tiles. The strip is unchanged.
- No converted price ("≈ …" in the viewer's currency) in the sheet. The list page keeps it.
- No ratio for a sale list that takes swaps.
- No change to the composer preview's "+N" sheet.
- No change to the feed's preview items, the `trade.people` response or the Redis post-entry cache.

## Routes

`/trade` (Browse), `/trade/for-you`, `/trade/@<handle>` and `/trade/@<handle>/<slug>` (every surface that draws a person row), and the API route `/api/v1/trade/lists/{listId}/items`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-browse`: Trade card (the "+N" sheet is uncapped, with sale prices and notes).
- `web-trade-near-matches`: Near matches in a list's sheet (near matches keep their place across pages).
- `api-openapi`: a new requirement for side-items paging and the sale price fields.

## Impact

- `packages/api`: `schemas/trade.ts` (`sideItemsInputSchema`, `sideItemsOutputSchema`), `lib/trade-feed.ts` (`fullSide`/`previewSide` take an offset, plus a pure stack-price fold with tests), `services/trade-feed/index.ts` (`fetchSideItems` pages, and reads price and note for a sale page's copies).
- `apps/web`:
  - `features/trade/side-items-sheet.tsx` pages and draws its cards through a virtualised grid inside its panel;
  - `queries.ts` (`sideItemsOptions` becomes infinite);
  - `features/objekt/virtual-card-grid.tsx` gains `PanelCardGrid`;
  - `features/objekt/objekt-note.tsx` keeps line breaks;
  - a pure price-wording module with tests;
  - `messages/*.json` if a new string is needed.
- The feed rate limit (`limitFeed`, 60 a minute per user) counts each page. At 200 a page, the biggest list takes 16 requests.

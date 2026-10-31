# Design

## Context

`market.tsx` passes each `MarketRow` an `actions` prop, which is `null` in two different cases: the seller can't be messaged, or the listing is the viewer's own. With `null`, the row draws a View list caret in its last column. The site reads `market.listingsForViewer` (optional auth), which sets `messageable` on every listing, signed in or not: the seller's message setting, and for a signed-in viewer a block either way. Only the public `/api/v1` route drops the field.

The table fits the drawer at phone width because its last column is one icon wide. The seller cell is `max-w-0` and truncates its name. The price cell already holds a muted `text-xs` second line (`≈converted`).

## Goals / Non-Goals

**Goals:**
- Tell "can message", "not taking messages" and "own listing" apart in a pure helper with a test.

**Non-Goals:**
- Changing the menu, the caret or the column widths.

## Decisions

**The note goes in the seller cell, not the actions column, and wraps.** A text label in the last column would widen the table past the drawer at 360 px. Under the seller's name it follows the second line the price cell already uses. At 360 px the seller cell is about 54 px wide, so a truncated note read "Not t…"; wrapped, it reads in full over three short lines, and only that row grows taller. *Alternative:* a `title` or tooltip on the caret, rejected because touch screens never show it and it doesn't name the reason.

**A pure `rowContact(item, own)` in `market-listing.ts` returns `"open" | "closed" | "none"`.** It returns `"none"` for an own listing, `"open"` when `messageable` is `true`, and `"closed"` when it is `false`. A signed-out visitor gets the same rows as Trade gives them: the note on a seller with messages off, and the menu (whose Message asks them to sign in) on the rest. `market.tsx` builds `actions` only for `"open"` and passes `closed` to the row. This mirrors `TradeContact` (`features/trade/trade-actions.tsx`) without importing it: that type carries a chat target and card that the Market row builds itself. *Alternative:* `item.messageable === false && !own` inline in `market.tsx`, rejected because it splits the rule across the caller and puts it out of reach of a test.

**`MarketRow` gains `closed: boolean` and keeps `actions: RowActions | null`.** It's the smallest API change: `actions` keeps its meaning, and the row draws the note when `closed`. Folding both into one union prop would touch every row line for no gain.

**The words are `m.trade_not_messageable()`.** These are the same words as Trade rows, already in en, ja and ko, so there is no new key. They also cover a block in either direction, which doesn't reveal the block.

## Risks / Trade-offs

- [Local data may have no seller with messages off] → Verify in the browser with a response shim that sets `messageable: false` on one listing, plus a signed-out pass in an isolated context.
- [`trade_*` key used outside Trade] → Acceptable: one meaning, one key. Renaming it would touch every Trade caller for no user-visible change.

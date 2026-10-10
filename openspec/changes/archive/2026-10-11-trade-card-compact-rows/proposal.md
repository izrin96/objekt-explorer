## Why

The For you and Browse cards are heavy: boxed, always open, with a long text match line, a badge per matched list, and stacked sections of 88px thumbnails. Browse lists one large post per row. The design reference (`design/chat-and-trade-concepts.html`, Trade › Browse and For you) uses a compact `mutual 2 · 4 ⇄ 2` chip, partner rows with the two directions side by side, small thumbnails, and a two-column Browse grid. The user picked these three points.

## What Changes

- **Match chip.** One chip replaces the text match line on both tabs:
  - `mutual 2 · 4 ⇄ 2` (mutual score, then they-have ⇄ you-have), or a neutral `4 ⇄ 0` with no mutual score.
  - It still opens the matched-lists popover, and its accessible name spells out both counts.
- **For you rows.**
  - Partners become collapsible rows, each on the card surface with a border, so a row reads apart from the page.
  - Header: avatar, name with socials, reputation line, the chip, an "N lists" button that opens the matched lists with their links, the ⋯ menu, and a chevron.
  - Each row can be collapsed. Active partners start open and idle partners start closed.
- **Two-column body.** The two directions sit side by side from `sm` up, as 3rem thumbnails with mono captions naming the collection.
- **Not counted, inline.** Objekts left out by the ownership rule follow the counted ones in their column, greyed and struck through with a reason, and a footer hint explains them. The "Not counted" collapsible goes.
- **Row footer.** Hide partner (ghost), Message, and Make offer as the primary button. Hide leaves the ⋯ menu, which keeps Block and Report.
- **Browse grid.**
  - Posts sit two to a row from `lg` up and one below.
  - Each post is compact: header with type tags, list name, one strip per side (mono role label, up to 10 small thumbnails, wrapping to a second row, "+N"), the chip and See in For you link, then a footer with the time, an icon-only Message and a primary Make offer.
  - Rings, sale prices and the popover stay.
- **Shared pieces, not one layout.** "Trade card" now asks for the same parts in the same order on both tabs, not one identical card.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-trade-browse`:
  - "Trade card": shared parts, compact Browse post, thumbnail sizes, two-column grid.
  - "Trade colours": chip instead of coloured counts; headings and role labels keep their tone.
  - "Matches to the signed-in viewer": chip instead of match line.
- `web-trade-for-you`:
  - "Both directions and mutual-first ranking": rows, collapse, two columns, inline not-counted.
  - "Hide a partner": a footer button, not a menu item.
  - "Blocks and trade blocks": the ⋯ menu holds Block and Report.

## Routes

`/trade` (Browse) and `/trade/for-you` (For you).

## Non-goals

- Tab counts, the "updated 2h ago" / "Ownership checked" freshness, and mono type outside these cards. These belong to `trade-chrome-details`, which applies after this change.
- Matching, ranking, prefill and offer logic. The data shapes are unchanged.
- The reputation line's content ("since Mar 2025" stays).
- Mockup items dropped on purpose stay dropped (facet filters, mutual-only default, bell count), and idle rows aren't dimmed with opacity, which would fail contrast.

## Impact

- `apps/web/src/features/trade/`:
  - `trade-card.tsx` splits into `trade-header.tsx`, `trade-actions.tsx` and `match-chip.tsx`, which replaces `match-line.tsx`.
  - `partner-card.tsx` becomes `partner-row.tsx`.
  - `browse-post.tsx`, `post-side.tsx` (strip), `match-grid.tsx` and `thumb-grid.tsx` change.
  - `browse-view.tsx` and `for-you-results.tsx` (pair rows in the virtualizer, collapse state) change.
- en/ja/ko messages.
- No API, schema or database change.

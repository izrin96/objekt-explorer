## Why

Users asked for each Trade listing to read as "one straight line of announce, not split in two". Today Browse sets two posts to a row, and each card stacks HAVE over WANT in 40 px thumbnails, so a short list leaves most of the card empty and a long one stretches its neighbour to the same height. For you rows have the same problem: open, they're tall; closed, they show only a name and a chip. The agreed mockup is `design/trade-feedback-mockup.html` §01 and §03, and the triage is in `design/trade-feedback-2026-10.md`.

## What Changes

- **Browse: one post per row.** The two-column grid goes. Each post is one bordered card the full width of the feed, read left to right:
  - a byline column: avatar, name, tags, reputation line, the bumped or updated time;
  - the sides: for a WTT pair, HAVE ⇄ WANT side by side; for WTS, one SALE strip with prices; for WTB, one WANT strip;
  - the actions: Make offer and an icon-only Message, or "Not taking messages".
  - Under the sides, one muted line holds the list name, the description, the match chip and any See in For you link.
- **Strips stay on one line.** Thumbnails grow from 2.5rem to 3.5rem and never wrap. Each strip shows as many as fit its width, then a "+N" tile for the rest, so every row is the same height whatever the list size.
- **Phone.** Below the width where the line fits, the row stacks: byline, then each strip (still one line), then the actions.
- **For you: the same line.** A partner row puts "They have, you want" ⇄ "You have, they want" in the row itself, as one-line strips. The match chip and "N lists" sit in the byline column, and Make offer, Message and the chevron sit at the end.
  - Opening a row adds the full columns with their captions, the objekts not counted, the footer hint and Hide partner.
  - **Rows start closed**, active or idle, since the strips already show the matches. A `partner=` link still opens its row.
- Browse's virtual list goes back to one post per item.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-trade-browse`: "Trade card" (one post per row, side-by-side one-line strips, 3.5rem thumbnails, stacked on phones) and "Posts from lists on Trade" (a one-sided post shows up to 20 objekts).
- `web-trade-for-you`: "Both directions and mutual-first ranking" (one-line row with strips, rows start closed, open row adds the full columns, the not-counted objekts and Hide).

## Routes

`/trade` (Browse) and `/trade/for-you` (For you).

## Non-goals

- Browse filters (`trade-browse-facet-filters`) and active hours (`trade-active-hours`) are separate changes that build on this one.
- A layout or density setting for viewers. It was asked for and skipped for now.
- The match chip, its popover, rings, prices, reputation line, tags and colours keep their current behaviour; only where they sit changes.
- No API shape, schema or database change. A one-sided post sends up to 20 objekts instead of 11.

## Impact

- `apps/web/src/features/trade/`:
  - `browse-post.tsx` (row layout, skeleton);
  - `post-side.tsx` (one-line fitted strip);
  - `browse-view.tsx` (no pairing in the virtualizer, skeletons);
  - `partner-row.tsx` (one-line row, preview strips, closed by default);
  - `for-you-results.tsx` (open state default);
  - a new pure `strip-fit.ts` with its test.
- en/ja/ko messages, if any label changes.

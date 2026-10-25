# Trade feedback, round 1 (Oct 2026)

User feedback on the Trade page (Browse, For you) after the first release, how each item is triaged, and what the proposed change looks like. Nothing here is built. The mockups are in `design/trade-feedback-mockup.html`.

Group orders (GO / GOM) is a separate, larger feature; its plan is in `design/group-orders.md`.

## Triage

| #   | Feedback                                                                        | Source | Call       | Section              |
| --- | ------------------------------------------------------------------------------- | ------ | ---------- | -------------------- |
| 1   | "Make the listing one straight line of announce, not split in two"              | users  | Do now     | [1](#1-one-post-per-line) |
| 2   | Cards in Browse and For you have too much empty space                           | owner  | Do now     | [1](#1-one-post-per-line), [3](#3-for-you-rows) |
| 3   | "Split the market between idntt / ARTMS / tripleS"                              | users  | Do now     | [2](#2-filters-back-on-browse) |
| 4   | Show when a trader is usually active, with a timezone                           | users  | Do next    | [4](#4-active-hours) |
| 5   | Let people organise the display (layout options)                                | users  | Skip       | [5](#5-parked)       |
| 6   | Sell unscanned objekts                                                          | users  | Skip       | [5](#5-parked)       |
| 7   | Group orders                                                                    | users  | Later      | `group-orders.md`    |

## 1. One post per line

**Today.** Browse lays posts out two to a row from `lg` up (`ROW_GRID` in `apps/web/src/features/trade/browse-view.tsx`). Each card stacks byline, list name, a HAVE strip and a WANT strip of 40 px thumbnails (`w-10`, ten per strip, `post-side.tsx`), then a footer. A post with three objekts per side leaves most of the half-width card blank, and a post with twenty wraps into a tall block that sets the height of its row neighbour too (`items-stretch`).

**Proposal.** One post per row, full width, read left to right like a trade announcement:

```
[avatar  name · WTT     ] [ HAVE  ▢▢▢▢▢▢▢ +12 ]  ⇄  [ WANT  ▢▢▢▢ ]  [Message]
[trust · active · 3h ago]
```

- Byline column fixed at ~13rem: avatar, name, tag, trust line, active-hours chip, bumped time.
- HAVE and WANT sit side by side with a ⇄ between them for a WTT pair. A WTS post shows one SALE strip with prices; a WTB post shows one WANT strip.
- Thumbnails grow to 56 px and never wrap: each strip shows as many as fit its width and ends in a `+N` tile (container query on the strip), so every row is the same height.
- List name and description move into one muted line under the strips, not a block above them.
- Match chip and "Mutual · See in For you" move into the byline column.
- Below `md` the row stacks: byline, then HAVE, ⇄ rotated, WANT, then the action, still with single-line strips.

Virtualisation gets simpler: one post per virtual item, no `POSTS_PER_ROW` chunking.

Open question: keep the row as a bordered card, or drop the border and separate rows with a rule (denser, more like a feed)? The mockup shows the card.

## 2. Filters back on Browse

**History.** Browse had the shared facet filters (artist, member, season, class, collection number, online/offline) until `845a2cc7`, which dropped them because "a posted list usually mixes artists, members and seasons, so the filters rarely narrowed anything useful". The server still accepts them (`browseFiltersSchema` in `packages/api/src/schemas/trade.ts`), and the header artist picker still scopes the feed.

The feedback shows the artist scope in the header isn't found, and the old filters failed for the reason the commit names: a filter kept a post if *any* of its objekts matched, then showed *all* of them.

**Proposal.**

1. Put the filter bar back: an artist segmented control first (All · tripleS · ARTMS · idntt), then member, season, class, online/offline in the shared `QuickFilters` + `FilterSheet`. The artist control drives the same selected-artists state as the header, so they never disagree.
2. Narrow the strips. When any facet is set, a post's strips show only the objekts that match, and the strip ends in a muted "+12 others" link to the full list. A post with no matching objekt on any side is not shown (the server already does this via `hasEntryIn`).
3. Server: `fetchPostEntries` (in `packages/api/src/services/trade-feed/`) takes the same slug set the `WHERE` uses and returns matching entries first plus an `others` count, so `+N` stays correct.

Open questions:

- Should the match chip count only the filtered objekts, or the whole post? Proposal: whole post, since the chip is about the trade, not the view.
- Filter one side only? A WTT post "has SeoYeon, wants anyone" would still show under member = SeoYeon with an empty-looking WANT strip, labelled "0 matching · 8 others".

## 3. For you rows

**Today.** A partner row is a header (byline, match chip, lists popover, idle badge) and a collapsible panel with two columns of thumbnails. Open, it's tall; collapsed (idle partners), it's just a name and a chip.

**Proposal.** Use the same one-line layout as Browse, so both tabs read alike:

```
[avatar name       ] [ THEY HAVE (5)  ▢▢▢▢▢ ]  ⇄  [ YOU HAVE (3)  ▢▢▢ ]  [Propose] [Message]
[mutual · 2 lists  ]
```

- Collapsed shows the first strip of each direction (whatever fits, then `+N`), which is the useful part of the row.
- Expanding shows the full grids, the "not counted" (dropped) objekts with their reason, and Hide.
- The caret moves to the end of the row.

## 4. Active hours

Users want to know if a trader is likely to answer now. Two ways to get it; the proposal is both, with the first as the main one.

**A. Declared active hours (opt-in).** In `/account › Trade`: a timezone (detected from the browser, editable) and one or two daily ranges, e.g. 20:00–01:00. Stored as an IANA zone plus ranges in minutes, so DST is handled.

On Browse, For you, chat and the profile hover card:

- "Active now" (green dot) inside the range, in the viewer's time.
- "Active in 3 h · 20:00–01:00 your time" outside it.
- Hover/tap shows a 24-hour bar with their window over the viewer's day, so "their evening is my morning" is visible.
- Browse gets an "Active now" toggle next to Only matches.

Privacy: a timezone narrows where someone lives. It stays off unless the user turns it on, and only the ranges converted to the viewer's time are shown, never the zone name.

**B. Live presence.** Centrifugo already carries a per-user channel. Presence on it can say "Online now" without any setting. Cheaper to build but only tells you about this minute, and it says nothing to someone browsing at 3 am.

Open question: ship A alone first, or A + B together?

## 5. Parked

- **Organise the display.** A density toggle (comfortable / compact) is the cheapest form of this if it comes back. Revisit after the one-line layout ships, since that removes most of the reason to ask.
- **Unscanned objekts.** A physical objekt that hasn't been scanned has no token, so nothing in the indexer can verify it, list it by collection, or check ownership. Would need a separate "physical" listing type with photos; overlaps with the GO plan's "physical objekt" item, so decide it there.

## Rough order

1. One-line Browse post + For you row (web only).
2. Filters on Browse with narrowed strips (web + `trade-feed` entries query).
3. Active hours A (schema: new columns on the user or a `trade_pref` table, migration, account section, chips).
4. Group orders, as its own OpenSpec changes.

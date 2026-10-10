## Why

Around the trade cards, Trade still misses small details the design reference (`design/chat-and-trade-concepts.html`) relies on to feel current and trustworthy:
- The tabs don't say whether anything is waiting.
- For you never says how fresh its matches are, although the server already returns both times.
- Objekt data (numbers, serials, progress, reputation) is set in the body font, while the redesign direction keeps data in mono.

Three main specs have also drifted from code that was changed on purpose:
- Browse still specs the removed facet filters.
- The offer builder specs "Only what I want" as on by default, but it starts off.
- The want list's "Trades only / Trades and sales" option isn't specced at all.

## What Changes

- **Tab counts.** For you shows how many partners Everyone lists, and My trades shows Needs you plus In progress. Each count is a small mono number after the label, hidden at zero and capped at "99+". It shows for signed-in users only. A new `trade.tabCounts` read returns both. The For you count comes from the same 5-minute matches cache For you reads.
- **For you freshness.**
  - Each row's reputation line gains "updated 2h ago", from the partner's most recently changed matched list (`partner.updatedAt`, already returned).
  - The summary line gains "Ownership checked 2m ago", from `checkedAt` (already returned).
  - Both are relative times rendered on the client.
- **Mono for objekt data** on Trade:
  - O and T numbers;
  - serials;
  - the "n/m" progress;
  - top-up amounts;
  - the numbers in the reputation line.

  It applies to My trades rows, the trade page legs and offer cards, using `font-mono tabular-nums`.
- **Spec clean-up, no behaviour change:**
  - Browse "Filters" drops the shared collection filters. The feed follows the app's selected artists, and a `slug` link ignores them.
  - Offer builder: "Only what I want" is off by default.
  - `web-lists` gains "Want list match option": Trades only, the default, or Trades and sales, and how it narrows matching everywhere.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-trade-browse`: "Filters" (facets removed, artist scope) and "Trade tabs" (counts).
- `web-trade-for-you`: "Freshness" (shown times).
- `web-trade-offers`: "Offer builder" (switch default) and a new "Objekt data in monospace".
- `web-lists`: a new "Want list match option".

## Routes

`/trade`, `/trade/for-you`, `/trade/mine`, `/trade/mine/$tradeId`, `/messages/$id` (offer cards), and the list create and edit dialogs (spec only).

## Dependency

This change applies after `trade-card-compact-rows`, which rebuilds the For you row header and Browse post. The "updated" time goes on that row's reputation line.

## Non-goals

- Card and row layout (`trade-card-compact-rows`).
- Changing the database default of `lists.match_sale`. It is still `true`, so want lists made before the API default changed keep "Trades and sales". This change only records it, as an open question in `design.md`.
- A Browse count, an unread-style badge, or a count on the bell.
- Facet filters coming back.

## Impact

- `packages/api`: `routers/trade.ts` (`tabCounts`), a `services/trade-tabs.ts` count read, and the output schema in `schemas/trade.ts`. It is a new procedure, so existing `/rpc` inputs are untouched.
- `apps/web`:
  - `features/trade/trade-tabs.tsx` and a query option;
  - `partner-row.tsx` and `for-you-results.tsx` (freshness);
  - `features/offers/trust-line.tsx`, `format.ts` callers, `leg-table.tsx`, `my-trades-view.tsx` and `offer-body.tsx` (mono);
  - en/ja/ko messages.
- No migration.

# Proposal

## Why

Traders swap 20 or 40 objekts in one offer, and every offer and trade surface draws one tall row per objekt. A 40-objekt trade page runs to many screens, burying what still needs the viewer, and its Timeline adds a row per transfer. The chat card hides everything past six rows a side; the builder's sides grow down the dialog. Mockup: https://claude.ai/artifact/RRkYinoeCdm2etytpPR6dp.

## What Changes

- **Trade page, The exchange**: each side becomes a grid of small cards, each carrying a status mark (Verified, Waiting, Send this, Different copy, Not sent) and the stuck and away warnings. Above the sides:
  - filter chips with counts: All, Needs you, Waiting, Verified;
  - a Grid or List switch;
  - a find box for member or collection code.

  Within a side, cards group by status, what needs the viewer first. When the viewer holds the objekts they owe on more than one linked profile, Send these splits by the profile holding each.
- **Trade page, Selected panel**: picking a card shows it in the side column (a sheet below `lg`), with its serial, status, what to do, and View objekt for the drawer.
- **Trade page, status card**: "Show the N that need you" sets the Needs you filter. The stepper stays the only progress. Trades are sent in the Cosmo app to a nickname, so Your turn's "Send to" names the partner's Cosmo nickname, then their other linked profiles after "or" (a transfer to any of them counts), in place of the wallet address and its Copy address button.
- **Trade page, Timeline**: transfers verified on one day fold into one row ("You sent 14 of 18"), which opens to each transfer with its hash.
- **Trade page on phones**: You give and You get become tabs, with the filter chips under them, four cards a row. The bottom bar drops Copy address, so on your turn it holds Open chat, filled, and the menu.
- **Chat offer card**: each side shows thumbnails in a grid, up to the first 11, then a +N tile that opens a sheet listing every objekt with its serial. An any-serial ask shows its count on the thumbnail. A collapsed older offer adds its side counts ("16 ⇄ 20").
- **Offer builder**: picks show as a grid with a remove button each, scrolling inside their side. A pick that can't be sent is outlined with its reason, and its side carries a banner with Remove them; the footer says why Send is disabled.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-verified-trades`: You give and You get, Next-step banner, Next-step states, Trade page on phones, Trade timeline; new requirements for the exchange's filters, the Selected objekt and Show what needs you.
- `web-chat`: Offer cards in the thread (thumbnail grid, +N sheet, side counts on a collapsed offer).
- `web-trade-offers`: Offer builder (picks as a grid, blocked picks and Remove them).

## Impact

- `apps/web/src/features/offers`:
  - `trade-legs.tsx` and `leg-card.tsx` give way to an exchange grid;
  - `trade-view.tsx`, `trade-timeline.tsx`, `next-step-banner.tsx`;
  - `offer-side-list.tsx` and `offer-card.tsx`, `builder/side-column.tsx`;
  - new pure helpers beside `next-step.ts` for a leg's status, the filter and the grouping, with tests;
  - "Send to" shows nicknames from the partner identity's `nickname` and `also`, already on the trade view. Copy address goes: the `"copyAddress"` primary in `next-step.ts` and its test, `CopyAddressButton` and the button in `SendTo` (`next-step-banner.tsx`), and the phone bar's in `trade-view.tsx`. `offer_copy_address` stays, since the Trading with card's copy icon and the moderation console use it.
- `packages/api`: the trade view's legs gain an optional `heldBy` (the viewer's linked profile that holds an owed specific objekt now), read from the indexer in one query. It is an output field only, so open tabs are unaffected.
- en, ko and ja messages.
- Builds on `broken-leg-grace` (unarchived), whose `leg.away` this change shows on the card; archive that change first.

Routes: `/trade/mine/$tradeId`, `/messages/$id` (offer cards), and the offer builder dialog wherever it opens.

## Non-goals

- Accepting or declining several different copies at once.
- Changing how legs verify, break or expire.
- My trades, notifications and the moderation console, which already cap their objekts.
- Virtualising the trade page: a trade holds at most 100 legs.

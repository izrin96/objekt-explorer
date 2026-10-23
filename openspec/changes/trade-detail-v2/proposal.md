# Proposal

## Why

The trade page shipped in `trade-page-redesign` still makes people read too much to find their next move. The status appears three times: the header chip, the banner's tone and the stepper chip. On a cancelled trade the chip and the banner disagree, one red and one grey. The Trade page header and tabs take about 170 px before the trade starts. The header crams eight things into one row. The "chain behind" notice is yellow inside an indigo banner. Transaction hashes and deadlines each show twice. On a phone the clock falls below the objekts. The mockup is the v2 canvas `Hj1yL8f2gireZ6VZ6esmMW`, after a `better-interface` pass.

## What Changes

Route: `/trade/mine/$tradeId`.

- On this route the Trade page header and tab bar give way to a breadcrumb: Trade / My trades / T-n, with the offer number as a link.
- One **status card** replaces the header chip and the next-step banner. It holds the state chip, the title, the body, the state's action, the deadline and the stepper. The page has no other status chip, and a cancelled trade is grey throughout.
- While the indexer is behind, its notice becomes a neutral strip above the status card, not a line inside it.
- On your turn, the status card shows "Send to" with the partner's address and a Copy address button.
- A **Trading with** card in the side panel takes the partner out of the header. It holds:
  - the current avatar, unchanged;
  - the name, which links to the profile, with a copy-address button;
  - "Trading since";
  - reputation as three figures: verified, unfinished and positive;
  - Open chat, View profile and the actions menu.
- **The exchange** becomes one card. Each side says where it stands (Sent · verified, Waiting on them, You owe this, After you send, Different copy, Not sent), and each leg's chip follows the same states.
- "This trade's clock" and "History" merge into one **Timeline** for every state. It lists past events with their dates and transaction hashes, then Today, then what lies ahead. Transaction hashes appear only there.
- Only one filled button per view: Open chat is filled only when the status card has no primary action.
- On phones:
  - the partner card and a folded Timeline ("Next: …", with a chevron) follow the exchange;
  - the bottom bar carries the state's primary action (Copy address, or Decline and Accept) with Open chat and the menu;
  - the status card drops buttons the bar already carries;
  - the stepper keeps its four labels.
- The loading skeleton follows the real layout.
- **Kept as is:**
  - `PersonAvatar` (the spec's identicon line is corrected to match it);
  - indigo for in progress;
  - grey past steps;
  - plain 112 px leg cards with a class swatch;
  - the muted ⇄;
  - the next-step state order.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-verified-trades`:
  - the trade page header, banner, deadline, indexer notice, progress, legs, rating and phone layout requirements change;
  - "The trade's clock" and "Trade history" are replaced by one "Trade timeline";
  - a "Trading with" requirement is added.
- `web-trade-browse`: the Trade tabs requirement no longer shows the tab bar on a trade's own page.

## Non-goals

- No API or database change. Every field shown already exists on `TradeView` and the reputation payload.
- No change to the next-step state order, the expiry or reminder rules, the different-copy rules, the cancel and report rules, or rating.
- No change to `/trade/mine`, Browse, For you, or the chat's offer card.
- No identicon, and no new avatar.
- No light-theme redesign. The existing tokens carry both themes.
- No new offer flow. The cancelled card's Make a new offer opens the existing offer builder for the same partner.

## Impact

- `apps/web/src/routes/(container)/trade/route.tsx` and `trade/mine/$tradeId.tsx`: the layout on this route.
- `apps/web/src/features/offers/`:
  - reworked: `trade-view.tsx`, `next-step-banner.tsx` (it becomes the status card), `trade-steps.tsx`, `trade-legs.tsx` and `leg-card.tsx`;
  - replaced: `trade-clock-panel.tsx` and `trade-history-panel.tsx`, by one timeline;
  - `trade-clock.ts` gains the merged rows;
  - new: a partner card.
- Messages: about 20 new strings in en, ko and ja. Some `offer_*` strings retire.

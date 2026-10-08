## Why

The trade page has every fact the tracker concept (`design/chat-and-trade-concepts.html`, section 06) planned, but not its layout: one column of grey chips, where Verified and Waiting look the same. Trade, My trades and the bell are grey too, so a WTB post, a WTS post and a failed trade read alike at a glance.

List pages already colour list types (have green, want yellow, sale blue), but Trade doesn't, and that green would clash with "verified".

## What Changes

- **Trade page** (`/trade/mine/<id>`) laid out as the concept:
  - **A stepper:** Proposed → Accepted → Transfers *n of m* → Complete. Green for done steps and indigo for the current one; red for the transfers step of a failed trade.
  - **A transfers table:** Objekt, Direction ("You → rin.trades"), Status. Verified is a green chip with a check, the hash and the time. Waiting is an amber chip with a clock and when it was last checked.
  - **A side panel:**
    - *Who sends first?*, tinted indigo;
    - what rating does, which becomes *Rate this trade* once the trade completes;
    - *If it stalls*, explaining the 72-hour reminder and the 7-day Report a problem.

  The panel sits beside the table from `lg` up and below it on a phone. Same actions as today.
- **My trades.** An in-progress trade's row shows a small progress ring with "n/m". Status chips are coloured by outcome: in progress indigo, completed green, cancelled, failed or expired red. The rest stay grey.
- **One colour per list type, everywhere.** Have / WTT teal, Want / WTB amber, Sale / WTS rose, General grey. This covers:
  - the post tags and list badges on Trade;
  - the existing `ListTypeBadge` on list pages, cards and the account menu, which moves off green, yellow and blue so green means only "verified".
- **Match colours.** On Trade cards:
  - "They have N you want" and For you's "They have, you want" heading are amber, since they fill a want list;
  - "You have N they want" and its heading are teal;
  - Mutual N is indigo.
- **Notification icons.** Each notification's icon tile takes a colour and an icon by what happened:
  - verified or completed: green check;
  - reminder: amber clock;
  - cancelled, failed or expired: red cross;
  - received or countered offer: indigo arrow;
  - want-list alert: amber; reverse alert: teal;
  - sanction: red shield.
- The colours are new light and dark theme tokens, each at 4.5:1 or better on its chip. Only small marks are coloured, so the objekt class stripes stay the strongest colour on screen.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-lists`: list type colours shared across the app.
- `web-trade-browse`: Trade cards colour their tags and match line.
- `web-verified-trades`: the trade page's stepper, transfers table and side panel.
- `web-trade-offers`: My trades rows show progress and coloured status.
- `web-notifications`: coloured icon per notification kind.

## Non-goals

- Colouring offer cards in chat or Market. A list type badge takes its colour wherever it appears, chat's list cards included (see `web-lists`).
- New trade actions, or changing what triggers a notification.

## Routes

`/trade`, `/trade/for-you`, `/trade/mine`, `/trade/mine/$tradeId`, list pages and the bell on every page.

## Dependencies

Apply after `trade-only-matches-and-shared-row`: the match line, the For you headings and the Trade card come from it.

## Impact

- **`apps/web`:**
  - `styles/app.css`: `--type-have/-want/-sale` and `--progress`, light and dark.
  - `features/offers/trade-view.tsx` (layout), `my-trades-view.tsx`.
  - `features/list/list-type-badge.tsx`, `features/trade/list-role-badge.tsx`, the post tag and the match line.
  - `features/notifications/notification-bell.tsx`; en/ja/ko text for the side panel.
- **`packages/api`:** `schemas/offer.ts` and `services/offer-trades.ts` (`fetchMine`): `progress` on trade rows.
- No database change.

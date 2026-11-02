# Proposal

## Why

Once a trade has a verified transfer (or a received wrong copy), Cancel trade is locked for both parties, and nothing lets two people who both want out end it. Production shows the cost twice:

- **Trade 447 (2026-10-30):** a 7-item opening offer was accepted by mistake after the pair had agreed a smaller deal; one leg verified, so staff cancelled it by hand.
- **Trade 516 (2026-10-30):** an accept of a 30-leg offer the receiver meant to counter. Six legs verified, then the pair agreed to redo the deal, and both pressed Mark as received on the 24 legs that never moved, so the trade reads Completed for objekts that were never sent. Those 24 are 24 of the 26 legs ever confirmed by hand.

## What Changes

- **Ask to cancel.** While a trade is in progress and Cancel trade can't be used, either party can ask to cancel it. The other party sees the request on the trade page, in the bell and as Needs you in the Inbox, and can Accept or Decline. The asker can withdraw it while it waits.
- **Cancelled by agreement.** An accepted request ends the trade Cancelled, with the reason "cancelled by agreement", releases every reservation and notifies the asker. Nobody is at fault: it counts toward neither party's verified nor unfinished trades and takes no feedback, as any cancelled trade.
- **What was sent stays sent.** Verified legs keep their record. The dialogs say that objekts already sent are not returned automatically, and that the two settle any return in chat.
- **One request at a time.** One open request per trade; after a decline, the same party can ask again 24 hours later.
- **Mark as received points to it.** The Mark as received dialog says that to call the deal off, Ask to cancel is the way, so a confirmation keeps meaning "I got it".
- **Timeline and deal line** show the request and the agreed end.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-verified-trades`: adds asking, answering and withdrawing a cancel request, the agreed end and how it counts; the trade actions menu, next-step states, timeline and Mark as received dialog learn it.
- `web-notifications`: trade notifications add the cancel request, its decline and the agreed cancel.
- `web-chat`: the deal line adds two states, one under Needs you.

## Non-goals

- Tracking or enforcing the return of objekts already sent. Returns stay between the two parties.
- Ending a trade without the other party's consent, or by staff from the console (see `report-help-and-reporter-note`).
- Changing when plain Cancel trade is allowed, the 72-hour away grace, or trade expiry.
- Undoing an agreed cancel, or partial cancels that drop some legs and keep the rest.
- Reworking trade 516's record; it stays as it is.

## Routes

- `/trade/mine/$tradeId` (actions menu, status card, Timeline, Mark as received dialog)
- `/chat` and `/chat/$conversationId` (deal line, Needs you, deal strip)
- The notification bell on every page

## Impact

- `packages/db`: a new `trade_cancel_request` table; `trade_cancel_reason` accepts `agreed`. One expand-only migration.
- `packages/api`: `offer.askCancel`, `offer.answerCancel`, `offer.withdrawCancel`; `TradeView` gains the open request; new refusal codes and trade note events; `dealOf` and `needsYouSql` learn the two states.
- `apps/web`: menu item, request and answer dialogs, two next-step states, Timeline rows, deal-line wording, bell text, Mark as received line; Paraglide messages in en, ko and ja.
- Overlaps `report-help-and-reporter-note` on the Trade actions menu and Next-step states requirements: whichever is applied second merges into the other's text.

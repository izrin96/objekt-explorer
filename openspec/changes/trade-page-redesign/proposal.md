## Why

On `/trade/mine/$tradeId`, nothing says whose move it is: a party who already sent must read the whole page to learn they are waiting. Progress and the indexer-behind state each show twice, "If it stalls" lists generic rules instead of this trade's dates, and a disabled rating sits beside an unfinished trade. On phones names wrap badly, an address-only partner gets the avatar "0", and there is no way back to My trades. Agreed mockup: Design canvas DqcizACc7HncNBqWQ8TZP5 (desktop, phone, banner states, light and dark).

## What Changes

Route: `/trade/mine/$tradeId`.

- **Back link** to My trades above the card.
- **Header.**
  - An identicon from the partner's address when they have no image.
  - The name in mono, with a copy-address button.
  - The status chip and Open chat.
  - A ⋯ menu holding Report a problem and Cancel trade, each disabled with its reason when it can't be used.
- **Next-step banner** under the header, one state at a time:
  - in progress: your turn, their turn, a different copy you decide on, one they decide on, or stuck;
  - ended: completed, failed or cancelled.

  Each has a tone, a title, one body line, a deadline and its action. It absorbs the ended line, Who sends first, the indexer-behind alert and the wrong copy's Accept and Decline. A fixed precedence picks the state.
- **Stepper.** Four slim segments, label and detail on one line. While in progress, past steps are neutral and only the current one is coloured. The "n of m transfers verified" line above the legs goes.
- **You give / You get** replaces the Direction table: two columns of plain objekt cards. The top-up sits in the paying side's column, and the note is quoted below.
- **This trade's clock** replaces "If it stalls" while in progress: dated rows from accept to expiry, the outcome at expiry, and a "How trades work" link to the full rules. An ended trade shows its History instead.
- **Rating** shows only in the banner, once the trade can be rated.
- **Phone.** A one-line name, one segmented progress bar, stacked columns, the clock as a card, and a sticky bottom bar with Open chat and the ⋯ menu.
- **Copy.** No em or en dashes, at most one middle dot per line, and sentence-case labels.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-verified-trades`: changes Verification progress, Who sends first, Wrong copy sent, Cancel locks after the first transfer, Indexer delay, and Objekts that can no longer be transferred. Adds the page's header and actions, the banner and its precedence, You give / You get, the clock, History, and the phone layout.
- `web-trade-offers`: My trades (the trade page's contents) and Objekt data in monospace (the partner's name in the trade page header).

## Impact

- `apps/web`: `features/offers/` and the route file, plus new pure modules for the banner state, the clock rows and the identicon, each with `bun test`.
- `packages/api`, `apps/worker`, `packages/db`: no change. Every state derives from the existing `TradeView`.
- Paraglide: new en, ko and ja strings, and existing keys reused where the copy exists. The ko and ja wording needs a native check.

## Non-goals

- Changing the app-wide `--progress` colour (blue and ink were evaluated and rejected).
- Class-colour tinted objekt cards or coloured edge stripes.
- The shared `TrustLine` component.
- The My trades list, and avatars elsewhere in the app (chat, Trade, search).
- API changes, including a `remindedAt` field (see design.md).
- Changing any trade rule: verification, deadlines, cancel, report, rating and reputation behave as today.

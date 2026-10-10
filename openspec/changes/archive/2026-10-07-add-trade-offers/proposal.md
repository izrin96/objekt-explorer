## Why

A swap agreed in chat is free text nobody can point back to. An offer names the exact objekts on each side, so the site can check it, accept it in one step and, in `add-verified-trades`, verify it on-chain.

## What Changes

- **Offers in chat**: an offer is a message kind with two sides.
  - **You give**: specific objekts from the sender's linked wallets.
  - **You get**: specific objekts or "any copy" of a collection, picked only from the recipient's have and sale lists that the sender can see.
  - **Optional**: a money top-up (amount, currency, who pays), marked "paid outside, not verified", and a note.
  - One side may be empty (cash buys, cash sales, gifts), but every offer holds at least one objekt.
- **Checks before sending**:
  - each specific objekt is owned by the right side's linked address and is transferable;
  - objekts reserved by an accepted trade are refused;
  - objekts already in another open offer get a warning only.
- **Lifecycle**:
  - The recipient accepts, declines or counters (the counter replaces the offer), and the sender can withdraw.
  - Offers expire after 7 days, and a conversation holds at most one open offer.
  - Older versions collapse in the thread, and each card shows its live status.
- **Accept**:
  - rechecks ownership;
  - creates a trade (T-number) with one leg per objekt and reserves those objekts;
  - cancels other open offers that hold any of them, so the first accepted offer wins.

  Either side can cancel the trade.
- **Offer builder** (a dialog) opens from:
  - the composer (Offer);
  - a Trade post (Make offer);
  - a For you row (Propose this trade, prefilled with the overlap);
  - a Market tab row (Make offer, prefilled with that objekt).

  A first offer follows the chat start rules.
- **My trades** at `/trade/mine` has four groups: Needs you, Waiting on them, In progress and History. `/trade/mine/$tradeId` shows a trade's parties and legs, with Open chat and Cancel.
- **Safety**:
  - a block cancels open offers between the two;
  - a chat mute stops sending and countering;
  - a trade block or a ban stops all offer actions and cancels the user's open offers.

  Accepted trades carry on.
- **Notifications**: a new Offers type, on by default, covers received, countered, accepted, declined, withdrawn and cancelled (with the reason).

## Non-goals

- Transfer verification, stall reminders, who-sends-first, feedback and reputation: these are `add-verified-trades`.
- Escrow, or verifying money.
- Three-way trades, and more than 10 objekts per side.
- A separate offer privacy setting, and Make offer on profiles.

## Capabilities

### New Capabilities

- `web-trade-offers`: offers and counters, the builder's checks, the lifecycle, accept, trades and reservations, and My trades.

### Modified Capabilities

- `web-chat`: offer cards in the thread and Offer in the composer.
- `web-trade-browse`: posts gain Make offer, and the tab bar gains My trades.
- `web-trade-for-you`: rows gain Propose this trade.
- `web-objekt-browser`: Market tab rows gain Make offer.
- `web-moderation`: blocks and sanctions apply to offers.
- `web-notifications`: the Offers type and its switch.

## Impact

- **DB**: one migration adds `offer`, `offer_item`, `trade` and `trade_leg`, plus a partial unique index that keeps an objekt in at most one open leg. `message` gains `offer_id`. It is applied locally only until ship.
- **API**:
  - a new `offer` router with `candidates`, `create` (which also counters), `accept`, `decline`, `withdraw`, `suggest`, `mine`, `trade` and `cancelTrade`;
  - cancel hooks in the block and moderation paths.
- **Web**: `features/offers/*`, the `/trade/mine` routes, the four entry points, and en, ja and ko strings.

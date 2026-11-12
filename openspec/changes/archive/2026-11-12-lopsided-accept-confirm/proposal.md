# Proposal

## Why

A sender who wants "pick one of these" puts every candidate under You give. On 2026-11-10 a user offered 17 objekts for 1 with the note "1:1"; the recipient did not know Counter changes an offer, pressed Accept, and a 17-for-1 trade was made. The sender cancelled it and sent a new offer.

Production data (read-only, 2026-11-12) shows this is where accepted offers go wrong. Share of accepted offers whose trade was later cancelled, by how many times larger one side is than the other:

| Sides | Accepted | Cancelled after |
| --- | --- | --- |
| Even | 1,292 | 21 (1.6%) |
| 2x | 383 | 3 (0.8%) |
| 3x | 90 | 5 (5.6%) |
| 4x | 33 | 2 (6%) |
| 5x or more | 25 | 7 (28%) |

Uneven offers are normal up to 4x. From 5x, more than one accept in four is undone.

## What Changes

- When the recipient presses Accept on an open offer where both sides hold objekts and one side holds at least 5 times as many as the other, a confirmation dialog opens before anything is sent.
- The dialog states both counts ("You get 17 and give 1"), says that accepting trades all of them, and says that Counter is the way to trade only some.
- The dialog offers Cancel, Counter (when the card offers Counter) and Accept. Counter opens the builder as the card's own Counter does.
- Every other offer accepts on one press, as today.

## Non-goals

- No "pick N of these" offer shape. That is its own backlog item (`design/backlog.md`).
- No rename of Counter, and no change to the card's buttons.
- No warning to the sender in the offer builder.
- No server change: `offer.accept` accepts the same offers as before, and nothing new is refused.
- No account of money: a top-up does not change whether the dialog opens.

## Routes

- `/messages/$conversationId`: the offer card in a conversation, the only place Accept is offered.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-trade-offers`: adds a requirement that a lopsided offer is confirmed before it is accepted.

## Impact

- `apps/web/src/features/offers/offer-body.tsx`: Accept opens the dialog when the offer is lopsided.
- A new pure module in `apps/web/src/features/offers/` for the lopsided test, with a `bun test` file beside it.
- `apps/web/messages/{en,ko,ja}.json`: the dialog's strings.
- `apps/web/docs/offers.md`: one line on the confirmation.
- No API, schema, worker or migration change.

# Design

## Context

Accept lives in one place: the footer of `OfferBody` (`apps/web/src/features/offers/offer-body.tsx`), which calls `actions.accept.mutate({ offerId })` on press. `OfferBody` already receives `onCounter`, absent when the partner has no Cosmo profile to address. `offer.give` and `offer.get` hold one item per copy, so a side's count is its array length.

`wrong-copy.tsx` (`AcceptCopy`) already confirms an accept with `AlertDialog` from `components/ui/alert-dialog`: local `open` state, the mutation's `loading` on the confirm button, and `onSettled` closing the dialog.

See proposal.md for the motivation and the production numbers.

## Goals / Non-Goals

**Goals:**

- One extra press for the offers most often accepted by mistake, and none for the rest.
- Counter is offered at the moment the recipient needs it.

**Non-Goals:**

- A server-side rule. A client that skips the dialog accepts the offer as today.

## Decisions

### The threshold is 5x, on counts alone

`larger >= 5 * smaller`, with both sides above zero. Production shows 2x to 4x offers are accepted about 500 times with a cancel rate at or under 6%, and 5x or more 25 times with a cancel rate of 28%. A lower threshold would interrupt trades people mean to make.

Alternatives rejected:

- A difference in count (such as 5 more): 10 for 5 is an ordinary 2x trade and would be caught.
- Leaving out offers with a top-up: 5 offers in production have objekts on both sides and a top-up at 3x or more, so the extra condition would buy nothing.
- One empty side: an offer that gives objekts for money, or for nothing, has no ratio. Those are sales and gifts, and "pick one" does not explain them.

### The test is a pure module

`isLopsided({ give, get })` goes in a new `features/offers/lopsided.ts` with `lopsided.test.ts`, as `sent.ts` and `quantity.ts` do, so the rule is tested without a component. The threshold is a named constant there.

### The dialog reuses the wrong-copy pattern, inside OfferBody

`AlertDialog`, as `AcceptCopy` uses it, with a third footer button for Counter. It is not extracted into a shared component: the two dialogs share markup only, and a third confirm would be the time to extract.

The dialog is rendered by `OfferBody`, which holds `actions`, `onCounter` and both counts. Counter in the dialog closes it and calls `onCounter(offer)`. It shows only when the card would show Counter (`offer.actions.includes("counter") && onCounter`).

The accept button in the dialog shows the mutation's loading state, and the dialog closes on `onSettled`, so a refusal shows the usual error notice over the card.

### An offer whose objekts were all sent already is still confirmed

`allSent(offer)` offers skip nothing: the counts are still lopsided, and recording the trade is still the recipient's choice. No special case.

## Risks / Trade-offs

- [A recipient who means to take a 5x offer presses twice] → Accepted: 25 such accepts in the site's history, 7 of them undone.
- [The rule is client-only, so it can drift from what a future server rule says] → The constant lives in one module; a server rule would move it to `packages/lib`.
- [ko and ja strings are agent-written] → They follow the tone rules already in use (ko 합니다체, ja full-width ？) and join the owed native review.

## Context

See proposal.md (Why). Today `OfferBody` (`features/offers/offer-body.tsx`) calls `actions.decline.mutate` / `actions.withdraw.mutate` from `useOfferActions` (`features/offers/actions.ts`), and the mutation's shared `onSuccess`/`onError` refresh the thread and lists and word a refusal. The server ends the offer and notifies the partner in the same request, so there is nothing to undo once it is sent. The chat Undo (`features/chat/actions.ts`) uses `addActionToast` (`lib/action-toast.ts`) and undoes through a second request (`unarchive`); that route does not exist for offers. The card lives inside the thread, which unmounts when the user opens another conversation.

## Goals / Non-Goals

**Goals:**
- One hold per offer, outliving the card, sent when it ends.
- The card and the notice read the same hold, so Undo from either cancels it.
- The timing rules sit in a pure module with tests.

**Non-Goals:**
- Delivering a hold when the tab closes.
- A generic "undoable mutation" layer for other actions.

## Decisions

**Hold in the client, send at the end.** A server undo would need a new procedure, a reopened-offer state and a way to take back the partner's notification. Holding the request costs nothing on the server and never notifies the partner of a mistake. Trade-off: a tab closed inside the window drops the hold (the offer stays open, which fails safe).

**A new in-memory store, `stores/offer-holds.ts`.** It maps an offer id to its held action (`"decline" | "withdraw"`), with no persistence, like `stores/chat-draft.ts`. Neither existing store fits: `notices.ts` persists dismissed keys to `localStorage`, and a hold must not survive a reload; `chat-draft.ts` is the composer's per-conversation draft, and putting offer holds in it would tie them to the message box. The card reads its hold through a selector (`useOfferHolds((s) => s.holds[offer.id])`), as the project's Zustand rule asks.

**Timers live beside the store, not in the component.** `holdOfferAction(offerId, action, { send, onUndo })` records the hold, schedules `send` with `setTimeout`, and keeps the timer id, the notice's id and `onUndo` in a module `Map`; `cancelOfferHold(offerId)` clears the timer, closes the notice, drops the hold and calls `onUndo`. `send` is the existing mutation's `mutate`, captured when the hold starts, so `useOfferActions` stays the one place that refreshes and words errors. A second Decline on a held offer is impossible, since the card hides its actions while held.

**Pure parts in `features/offers/hold.ts`** (tested): `HOLD_MS = 5000`, `holdNotice(action)` and `holdLine(action)` (the message for each), and the store's pure transitions `withHold(holds, offerId, hold)` / `withoutHold(holds, offerId)`. They import only `m` and types.

**The notice is `addActionToast` with `timeout: HOLD_MS`**, its Undo calling `cancelOfferHold`. When the card's Undo cancels first, the store's `cancelOfferHold` also closes the notice (it keeps the toast id with the timer). Undo reuses `m.chat_undo()`, which reads "Undo" in every locale.

**Focus.** Decline/Withdraw start the hold inside `flushSync`, then focus the card's Undo (a ref). The card's Undo cancels inside `flushSync` and focuses the button that started the hold (refs on Decline and Withdraw). The card passes that focus move as `onUndo`, so Undo from the notice lands there too; it reads a ref, so with the thread unmounted it does nothing.

## Risks / Trade-offs

- [The offer changes during the hold (the partner withdraws or counters, or it expires)] → the held request is refused; the existing refusal notice and refresh run, and the card shows the offer's real state.
- [Two tabs] → each holds its own; the second to send is refused as above.
- [A slow network after the hold] → the card shows the mutation's loading state on the restored button as today.
- [Tests cover pure parts only] → the timing and focus behaviour is checked in the browser with the offer requests blocked, so no offer is declined.

## Migration Plan

Client-only; ships with the web image. Rollback is a revert.

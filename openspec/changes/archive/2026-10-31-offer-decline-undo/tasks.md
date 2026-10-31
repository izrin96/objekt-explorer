# Tasks

## 1. Pure hold rules

- [x] 1.1 Add `apps/web/src/features/offers/hold.ts` with `HOLD_MS = 5000`, `holdNotice(action)`, `holdLine(action)`, `withHold` and `withoutHold`, and the four messages (`offer_toast_declined` "Offer declined", `offer_toast_withdrawn` "Offer withdrawn", `offer_declining` "Declining…", `offer_withdrawing` "Withdrawing…") in en, ja and ko. Verify: `hold.test.ts` covers each action's notice and line and that `withHold`/`withoutHold` add and remove one offer without touching others; `bun run check` passes.

## 2. The hold store

- [x] 2.1 Add `apps/web/src/stores/offer-holds.ts`: an in-memory Zustand store of holds by offer id, with `holdOfferAction(offerId, action, { send, onUndo })` (records the hold, opens the notice with `addActionToast` and `timeout: HOLD_MS`, schedules `send`) and `cancelOfferHold(offerId)` (clears the timer, closes the notice, drops the hold, calls `onUndo`). When the timer fires it drops the hold and calls `send`. Verify: lint, typecheck and `bun run build --filter=web` pass.

## 3. The offer card

- [x] 3.1 In `apps/web/src/features/offers/offer-body.tsx`, Decline and Withdraw start a hold instead of mutating, with refs for focus; while the card's offer is held, its actions are replaced by the pending line and an Undo button, which cancels the hold. Focus moves to Undo on start and back to the starting button on Undo. Verify in the browser on local thread 360 (O-258) with every `/rpc/offer/` write blocked: Decline shows the notice and "Declining…", Undo restores the buttons with focus on Decline and no request; a second Decline left alone sends exactly one `offer/decline` request after about 5 s (blocked, so the refusal notice shows and nothing changes); opening another thread inside the window still sends it. Lint, typecheck and build pass.

## 4. Docs

- [x] 4.1 Add one line to `apps/web/AGENTS.md` naming `stores/offer-holds.ts` as where a held Decline or Withdraw lives until it is sent, or state that no convention changed. Verify: `bun run check` passes.

## Workflow follow-up

- Archive with `/opsx:archive` once applied and committed.

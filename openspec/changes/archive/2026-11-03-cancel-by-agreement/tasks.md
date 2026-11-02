# Tasks

Every task ends with `bun run lint`, `bun run typecheck` and `bun run build` passing for the package it touches (`--filter=<package>`).

## 1. Database

- [x] 1.1 Add `tradeCancelRequest` to `packages/db/src/schema.ts` (columns, status check, partial unique index on `trade_id` where pending, index on `(trade_id, asked_at)`) and its relations, and add `agreed` to `trade.cancelReason`'s type and `trade_cancel_reason` check; verify `bun run --filter=@repo/db db:generate` writes one migration holding only the new table and the replaced check.
- [x] 1.2 With the user's approval, apply the migration to the local database only (`.env.local` points `DATABASE_URL` at local); verify with `\d trade_cancel_request` on local. Production needs its own approval.

## 2. Rules and schemas (`packages/api`)

- [x] 2.1 Add `agreed` to `TRADE_CANCEL_REASONS`, `cancel_asked` and `cancel_declined` to `TRADE_EVENTS`, the refusal codes `cancel_asked`, `cancel_wait` and `no_cancel_request` to `OFFER_REFUSALS` (mapped in `services/offer/core.ts`), and to `TradeView` the optional `cancelRequests`, `cancelRequest` and `cancelAskOpensAt` with defaults; verify typecheck, and that a `TradeView` payload without the new fields still parses (test in `schemas/`).
- [x] 2.2 Add `cancelAskWait` and `cancelAnswerRefusal` to `lib/offer-rules.ts` with tests in `offer-rules.test.ts` covering: asking again inside and after 24 hours, the asker answering, a non-asker withdrawing, no pending request, an ended trade; verify `bun test` passes.

## 3. Server procedures (`packages/api`)

- [x] 3.1 Move `cancelTrade`'s ending writes into one helper taking the reason and `cancelledBy`, which also sets the trade's pending wrong copies to `declined`; keep `cancelTrade`'s behaviour unchanged. Verify existing tests pass, and read-only check that `cancelTrade`'s request and refusals are unchanged.
- [x] 3.2 Add `askCancel`, `answerCancel` and `withdrawCancel` (`services/offer/cancel-request.ts`), each taking the trade row `FOR UPDATE` before the request row, with the refusals of the design, the notes (`cancel_asked` to the partner, `cancel_declined` to the asker, `cancelled` with reason `agreed` to the asker) and `publishTouched`; mount them on the offer router. Verify by typecheck and a local run against the local database: ask, a second ask refused, withdraw, ask, decline, an ask refused within 24 hours, then (with the wait shortened locally or a fresh trade) accept ending the trade `cancelled`/`agreed` with open legs closed.
- [x] 3.3 Fill the `TradeView` additions in `fetchTrade` (one read of the trade's requests; a pending row counts only while the trade is `in_progress`, and on an ended trade reads as `lapsed`); verify on a local trade that the fields match the rows.
- [x] 3.4 Add `cancelAsk` to `DealRow.trade` in `readDeals`, `theyAskCancel` / `youAskCancel` to `dealOf` before `youDecide`, `theyAskCancel` to `NEEDS_YOU_STATES`, and the matching `EXISTS` to `needsYouSql`; extend the `chat-deal` tests with both states and their order against a different copy; verify `bun test` passes.

## 4. Trade page (`apps/web`)

- [x] 4.1 Load `vercel-react-best-practices`. Add `theyAskCancel` and `youAskCancel` to `stepKind` and `nextStep` (`next-step.ts`), their words in `next-step-text.ts` and tones in `STEP_TONE`, with cases in `next-step.test.ts` and `next-step-text.test.ts` (a request outranks a different copy and Your turn; an ended trade ignores a pending row); verify `bun test`.
- [x] 4.2 Banner buttons in `next-step-banner.tsx` (Decline and Accept with confirmation; Withdraw), the ask and accept dialogs in `cancel-trade.tsx`, Ask to cancel in `trade-menu.tsx` (after Cancel trade while `!canCancel && !cancelRequest`, disabled with `cancelAskOpensAt`), mutations in `actions.ts`, refusal texts in `refusal.ts`; verify in the browser on a local trade: the menu, both banners and every dialog in en, and keyboard reach of the disabled item.
- [x] 4.3 Timeline rows from `cancelRequests` and the `agreed` end row in `trade-clock.ts`, with cases in `trade-clock.test.ts` (an answered, a withdrawn and a lapsed request); the "cancelled by agreement" reason in `format.ts`; verify `bun test` and the Timeline of a locally cancelled-by-agreement trade.
- [x] 4.4 One line in `mark-received.tsx` pointing to Ask to cancel; verify the dialog in the browser.

## 5. Bell and Inbox (`apps/web`)

- [x] 5.1 Bell text for `cancel_asked`, `cancel_declined` and `cancelled` with reason `agreed` in `features/offers/format.ts`; verify on the local bell after 3.2's run.
- [x] 5.2 Deal-line words and tones for both states in `features/chat/deal-text.ts`, with cases in its test against the spec table; verify `bun test` and the Inbox row and Needs you chip on the local conversation.

## 6. Copy and locales

- [x] 6.1 Every new message in `en`, `ko` (statements in 합니다체) and `ja` (full-width ？, 。 mirroring en); verify `bun run paraglide:compile` and a browser pass of the trade page in ko and ja.

## 7. Integration and docs

- [x] 7.1 Full checks: `bun run check` and `bun run build` from the root.
- [x] 7.2 Update `packages/api/AGENTS.md` (a "Cancel by agreement" section: the table, the lock order, `agreed`, pending rows gated on trade status, the shared ending helper) and `apps/web/AGENTS.md` (Trade page: the two new step kinds); verify both read correctly beside their neighbours. No other package's conventions change.

## Workflow follow-up

- Production migration and deploy (migration, then web) only with the user's approval.
- Archive the change once the user has reviewed it.
- `report-help-and-reporter-note` also modifies Trade actions menu and Next-step states. Archive replaces whole requirement blocks, so before archiving whichever of the two changes goes second, copy those blocks again from the main spec and re-apply that change's edits.

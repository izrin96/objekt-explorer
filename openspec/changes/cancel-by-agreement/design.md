# Design

## Context

See proposal.md (Why) and the three spec deltas for behaviour.

Today `cancelTrade` (`packages/api/src/services/offer/trades.ts`) ends a trade alone when `cancelRefusal` (`lib/offer-rules.ts`) allows it, under the trade row's `FOR UPDATE` lock, the same lock the worker's verifier settles under. `confirmLeg` (`services/offer/confirm.ts`) and `acceptCopy` follow the same pattern. Trade notes go through `writeNotes` and group under `trade:<id>`. The trade page's state lives in the pure `next-step.ts`, `trade-clock.ts` and `exchange.ts`. The Inbox's deal comes from `readDeals` (`services/chat/deal.ts`), with `dealOf` (`schemas/chat-deal.ts`) and its SQL twin `needsYouSql`.

## Goals / Non-Goals

**Goals:**
- Two-party consent recorded on the server, race-safe against the verifier and each other.
- Every request kept, so the Timeline can show it and the 24-hour rule can be checked.
- Reuse the cancel path's writes, so an agreed cancel ends a trade exactly as a party cancel does, apart from its reason.

**Non-Goals:**
- No worker change. The verifier, expiry and reminders never read a request.
- No new UI primitives: the dialogs reuse `AlertDialog` as `cancel-trade.tsx` and `mark-received.tsx` do.

## Decisions

**A `trade_cancel_request` table, not columns on `trade`.** Columns: `id`, `trade_id` (FK, cascade), `asked_by` (FK user), `asked_at`, `status` (`pending | accepted | declined | withdrawn`, check), `answered_at`. A partial unique index on `trade_id WHERE status = 'pending'` enforces one open request. Columns on `trade` would hold only the latest request, which loses the Timeline's history and the decline the 24-hour rule reads. A request counts as open only while its trade is `in_progress`. A trade that ends any other way (completed, expired, broken, plain cancel) leaves its pending row. Every read gates on the trade's status, and `fetchTrade` reports such a row as `lapsed`, which the Timeline words as "No answer before the trade ended", so a pending request never shows as still waiting. That keeps the worker out of it. The alternative, closing the row in `finishSettle` and the expiry job, means a worker deploy for no visible gain.

**Reason `agreed`, `cancelled_by` = the asker.** It is added to `TRADE_CANCEL_REASONS` and the `trade_cancel_reason` check. `cancelledByYou` keeps meaning "you started the cancel", and the web words `agreed` as "You and X agreed to cancel" whichever side reads it. A separate status (`cancelled_agreed`) was rejected: every "cancelled" read (reputation, feedback, deal, filters) would need to learn it, while a reason changes only wording.

**Three procedures on the offer router**: `offer.askCancel({ tradeId })`, `offer.answerCancel({ tradeId, accept })`, `offer.withdrawCancel({ tradeId })`, each new, so no open tab sends a changed input. All three take the trade row `FOR UPDATE` first, then read or write the request row, which is the order the verifier and `cancelTrade` use, so they never deadlock.
- `askCancel` refuses `trade_ended`; `cancel_asked` while a request is pending (also from the unique index on a race); and `cancel_wait` within 24 hours of this asker's last declined request. It does not re-check whether a plain cancel is possible: asking when you could cancel alone is harmless, and the check would cost `cancelTrade`'s indexer wait. The web shows Ask to cancel only when `canCancel` is false.
- `answerCancel` refuses `trade_ended`, `no_cancel_request` (none pending, i.e. withdrawn or already answered) and `not_allowed` (the asker answering). Accept writes what `cancelTrade` writes (status, `ended_at`, `cancelled_by`, legs `open = false`) with reason `agreed`, and sets the trade's still-pending wrong copies to `declined`, so no copy is left pending on a closed leg. That shared write moves into one helper used by both.
- `withdrawCancel` refuses `no_cancel_request` and `not_allowed` (not the asker).

**Notes.** `TRADE_EVENTS` gains `cancel_asked` (to the partner) and `cancel_declined` (to the asker). An agreed cancel writes the existing `cancelled` event with reason `agreed`, to the asker only, as a party cancel notifies only the partner. Withdraw writes nothing. A withdraw and re-ask upserts into the same unread `trade:<id>` group row, so it can't flood the bell.

**`TradeView` additions** (optional with defaults, so a tab from before the deploy still parses): `cancelRequests: { byYou, at, status, answeredAt }[]` (`status` adds `lapsed` for a pending row on an ended trade) (oldest first, for the Timeline), `cancelRequest`, the pending one or null, and `cancelAskOpensAt` (24 hours after the viewer's last declined request while that is in the future, else null).

**Trade page.** `stepKind` gains `theyAskCancel` and `youAskCancel`, checked before `youDecide` while the trade is in progress. `nextStep` and `next-step-text.ts` word them, `next-step-banner.tsx` maps them to buttons (Decline and Accept, or Withdraw) and the amber tone, and `STEP_TONE` gains them. `trade-menu.tsx` adds Ask to cancel after Cancel trade while `!canCancel && !cancelRequest`, disabled with `cancelAskOpensAt`. `cancel-trade.tsx` gains the ask and accept dialogs beside the existing one, since they share the warning about sent objekts. `trade-clock.ts` turns `cancelRequests` into rows, and the `end` row reads `agreed`. `mark-received.tsx` gains one line pointing to Ask to cancel.

**Deal line.** `DealRow.trade` gains `cancelAsk: "you" | "them" | null`, read in `readDeals`'s statement from the pending request of an `in_progress` trade. `dealOf`'s `tradeState` returns `theyAskCancel` / `youAskCancel` before `youDecide`, matching `stepKind`. `NEEDS_YOU_STATES` adds `theyAskCancel`, and `needsYouSql` adds an `EXISTS` on a pending request asked by the other party of an `in_progress` trade. `deal-text.ts` and `STEP_TONE` word and tone both.

**Pure logic in tested modules.** The 24-hour rule (`cancelAskWait`) and who may answer or withdraw (`cancelAnswerRefusal`) go in `lib/offer-rules.ts` beside `cancelRefusal`, with tests. The web's `stepKind`, `dealOf` and `timelineRows` get cases in their existing tests.

## Risks / Trade-offs

- [A party asks to cancel to pressure the other into a worse deal] → Decline costs nothing, the trade carries on, and the 24-hour wait limits repeats.
- [The pair cancels after one side delivered, and the other never returns it] → The asking and accepting dialogs both say nothing is returned automatically. The receiver of the asking party's objekts had to agree, and chat Report stays open. This is the same exposure as today's Mark as received workaround, but now on the record as a cancel rather than a fake completion.
- [Rollback after an `agreed` trade exists] → The old server's `TradeView` output enum lacks `agreed`, so reading that trade would fail output validation. Roll back only together with a data fix that maps `agreed` to `party`, or keep the enum value in a rollback build.
- [Stale tabs] → An open tab from before the deploy shows a `cancel_asked` or `cancel_declined` note without its text, as `leg_confirmed` did, and an agreed cancel under the old catch-all as "an objekt left the wallet". It reloads on the next navigation.
- [Stale tabs drop live chat] → A tab from before the deploy validates each `chat_message` against its own deal states, so an event whose deal is `theyAskCancel` or `youAskCancel` fails and is dropped: that conversation's new messages stop appearing live until the tab reloads. Accepted for this deploy; the row schema now reads an unknown deal as none (`.catch(null)`), and the bell's cancelled text a reason it doesn't know as a plain "was cancelled", so the next new state or reason doesn't repeat it.
- [Ask and withdraw in a loop] → Both share a per-user limit (`trade-cancel-ask`, 6 an hour), so a loop can't flood the partner's bell or the Timeline.

## Migration Plan

1. One expand-only migration: create `trade_cancel_request` with its indexes, and replace `trade_cancel_reason`'s check with one that also accepts `agreed`. The code running from `main` never writes `agreed` or reads the table, so it is safe to run before the deploy. Apply it locally, and to production only with the user's approval.
2. Deploy web. The worker needs no deploy.
3. Rollback: see Risks. The table can stay.

## Context

`settleTrade` (`apps/worker/src/job/trade-verifier/index.ts`) runs one transaction per trade under its row lock. After recording verified legs and new wrong copies, `rescueBroken` lets each broken leg accept a pending copy sent before its break (`copyRescue`). `finishSettle` (`packages/api/src/services/offer/verify.ts`) then decides the outcome from `applied`: any broken leg makes the trade Failed when something was sent (a held copy counts), else Cancelled, and closes every open leg. Fault is read later by `atFault` (`lib/offer-rules.ts`) from which legs have `verifiedAt`, so a pending copy left on another leg makes both parties look like they still owe.

Expiry (`trade-expiry.ts`) handles the same shape by running `acceptPicked` with `firstPending` over every open leg before it ends the trade.

## Goals / Non-Goals

**Goals:**
- A break that ends the trade accepts the earliest pending copy on every other open leg, through the same `acceptPicked` path as expiry and the copy deadline, so notes, progress and the "accepted automatically" mark match.

**Non-Goals:**
- Changing `tradeOutcome`, `atFault` or `finishSettle`.
- Touching trades that already ended.

## Decisions

**Run after `rescueBroken`, only while a leg is still broken.** A rescued leg no longer ends the trade, so the extra accepts must wait until the rescue has run. If every broken leg was rescued, nothing else happens and the trade carries on as today.

**Which legs:** open legs whose result in `applied` is neither `verified` nor `broken`. A pure helper beside `copyRescue` in `packages/api/src/lib/trade-match.ts` (e.g. `breakAcceptLegs(applied)`) returns them, or none when no leg is still broken, and is unit-tested. The worker passes them to `acceptPicked` with `firstPending` and writes the results back into `applied`, as `rescueBroken` does.

**No time cutoff on the copy.** Expiry accepts any pending copy, and the trade ends at the moment the worker settles the break. A copy that arrived between the 72-hour mark and that run was sent in good faith before the sender could know; accepting it only shifts fault toward the party who broke the trade. Alternative considered: only copies sent before the break, like `copyRescue`; rejected because the leg that didn't break has no break time of its own and the stricter rule can blame nobody again.

**Counts:** the accepted legs join `verified` and `autoAccepted` passed to `finishSettle`, so the failed-trade note's progress counts them.

## Risks / Trade-offs

- [More notes in one run: one "accepted automatically" note per accepted copy, then the trade's Failed note] → Since cf55c7cc each lands as its own row under the trade's updates, nothing is overwritten.
- [Both parties' legs break in one run] → Nothing to accept on them; fault stays null, as today.
- [A copy whose transfer another leg took] → `acceptCopy` already skips it (unique index), as for expiry.

## Migration Plan

Worker-only code change, no data change. Deploy the worker; trades that break afterwards follow the new rule. Roll back by redeploying the previous worker image.

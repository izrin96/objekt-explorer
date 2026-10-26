# Design

## Context

`matchLegs` (`packages/api/src/lib/trade-match.ts`) decides every open leg from the indexer's transfers on each verifier run; nothing about a leg's state is stored between runs except what settling writes. For a specific leg it walks the token's transfers in time order: a move to a giver address clears `away`, a giver→receiver move verifies, a move away before the accept sets `away`, and any other move after the accept returns `broken` at once. `nearMisses` stops counting wrong copies at a broken leg's `at`. `tradeOutcome` turns any `broken` result into Cancelled or Failed, and `rescueBroken` accepts a pending copy sent before the break.

`matchOpenLegs` has two callers: the worker's `verifyRun`, which already reads the indexer head (`seenUntil`), and `cancelTrade`, which only needs to know whether something was sent. The non-transferable flow (`untransferable_at`, `recordStuck`, the `stuck` trade event, `leg.stuck` on the trade page) is the existing shape for "a leg needs a warning but stays open".

## Goals / Non-Goals

**Goals:**
- One rule for moves away, before and after the accept, with time read through `seenUntil` only.
- Re-deriving everything from transfers each run, as today, so a re-index or a missed run never leaves a wrong state.

**Non-Goals:**
- Storing a per-leg history of moves.

## Decisions

1. **Grace in the matcher.** `matchLegs` takes `seenUntil` (an options object with `used`). A move that takes the token from its holder chain to a non-giver, non-receiver address sets `away` at its timestamp; a later move to a giver clears it; a later move to a receiver verifies. At the end, a leg still `away` is `broken` (dated at `away.timestamp`) only when `seenUntil >= away + 24h`; otherwise it is `pending` with `awaySince: away.timestamp`. A null `seenUntil` never breaks. Alternative: a clock check in the worker after matching; rejected because the matcher is the pure, tested place, and the copy and expiry rules already measure against `seenUntil`.
2. **Delivery from any address after the accept.** In the specific-leg walk, a move of the leg's own token into a receiver address at or after `acceptedAt` verifies, whoever sends it. Before the accept the existing giver-only rule and `backWithGiver` stay, so an early send the receiver returned still doesn't count. Safe because the token is unique: if the receiver holds the asked-for objekt, the leg's purpose is met.
3. **`pending` carries `awaySince`, not a new kind.** Every caller treats a non-`pending` kind as decided (the worker's `decided` filter, `tradeOutcome`, the stuck override). An optional field keeps those paths unchanged. `nearMisses` uses `awaySince` as its end, like `broken.at`, so a copy sent after the objekt left is never held for that leg.
4. **`trade_leg.away_at`, mirroring `untransferable_at`.** A nullable timestamp holding when the objekt left, written by a `recordAway` step beside `recordStuck` under the trade's row lock: set (and both parties noted with a new `away` trade event carrying `breaksAt`) when a waiting leg first reports `awaySince` or reports a different one; cleared silently when it stops. The trade page reads `away_at` and shows `away_at + 24h`. Alternative: derive it on each page read from the indexer; rejected, the page would need the matcher and the indexer for every view.
5. **Constant in `schemas/offer.ts`.** `AWAY_GRACE_HOURS = 24` beside `REMIND_AFTER_HOURS` and `TRADE_EXPIRE_DAYS`, so the worker, the matcher and the web read one value.
6. **Web reuses the stuck surfaces.** The leg card and the next-step banner's warning line (as "Stuck beside a sendable leg") gain an away variant; the banner state order does not change. The notification gets a `notification_trade_away` message and a warning tone, as `stuck` has.

## Risks / Trade-offs

- [A real sale takes up to 24 hours to cancel or fail] → Both parties are told at once with the deadline, and the receiver can still cancel while nothing was sent.
- [A pending wrong copy now auto-accepts 24 hours after the sale instead of at once] → The receiver can accept it by hand at any time, as today.
- [A third party who bought the objekt sends it to the receiver and the leg verifies] → The receiver got exactly the objekt asked for; that is the leg's purpose.
- [The cron, not a transfer, ends the grace] → The verifier runs every 2 minutes, so the break lands within minutes of the 24 hours.

## Migration Plan

1. `db:generate` adds `trade_leg.away_at` (nullable, no default, no backfill); apply to local, then staging and production with the user's approval, before the worker that writes it deploys.
2. Deploy web and worker together. Open legs whose objekt is already away get `away_at` and a notice on the first run, and the 24 hours count from when the objekt left, so a move older than a day breaks on that first run as it would have before.
3. Rollback: redeploy the previous worker and web; the column can stay.

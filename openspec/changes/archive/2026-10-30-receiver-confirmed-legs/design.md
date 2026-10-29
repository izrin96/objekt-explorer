# Design

## Context

Legs close in two ways today. The verifier (`apps/worker/src/job/trade-verifier`) matches transfers with `matchLegs` (`packages/api/src/lib/trade-match.ts`) and settles under the trade's row lock through `finishSettle` (`packages/api/src/services/trade-verify.ts`). The receiver's Accept on a wrong copy (`acceptSubstitute`, `packages/api/src/services/offer/substitute.ts`) takes the same lock, writes the leg through `acceptCopy`, and calls `finishSettle` too. A closed leg is `open = false`. "Done" is `verified_at IS NOT NULL` everywhere it is counted: progress, the cancel lock, `tradeOutcome`, the trade page's `state`, and the unfinished `fault` CTE in `services/reputation.ts`.

The away grace is `AWAY_GRACE_HOURS` in `packages/api/src/schemas/offer.ts`. `matchLegs` measures it from the transfer that took the objekt away, against `seenUntil`. `trade_leg.away_at` only mirrors that time for display (`awayBreaksAt` in the trade read). Changing the constant therefore moves every open away leg's break, trade 69 included, with no data change.

## Goals / Non-Goals

**Goals:**
- A confirmed leg goes through the same lock and settle path as an accepted wrong copy, so completion, notes and reputation invalidation stay in one place.
- Every existing "done" count treats a confirmed leg as done without being touched.

**Non-Goals:**
- Any change to how the verifier matches transfers.

## Decisions

1. **`trade_leg.confirmed_at`, with `verified_at` set too.** Confirming writes `open = false`, `verified_at = now()` and `confirmed_at = now()`, leaving `tx_hash`, `verified_objekt_id` and `transfer_id` null. Every "done" count already reads `verified_at`, so progress, the cancel lock, `tradeOutcome` and the unfinished rule need no edit. The only reads that change are the ones that must tell the two apart: reputation's verified count, the rate refusal and the trade page. Alternative: a `confirmed_at` alone, with "done" redefined as either column. Rejected, because every count would change and each one missed would be a bug. The trap this leaves is that `verified_at` no longer implies a hash. `apps/worker/AGENTS.md` and `packages/api/AGENTS.md` record it.
2. **`offer.confirmLeg({ legId })` beside `acceptSubstitute`.** A new `services/offer/confirm.ts` finds the leg (NOT_FOUND unless the viewer is a party, refused as `not_receiver` unless they receive it), locks the trade `FOR UPDATE`, rechecks under the lock that the trade is `in_progress` and the leg is `open`, writes the leg, then calls `finishSettle` with that leg as `verified` and the other open legs as `pending`. A refusal reuses `refuseOffer` with a new `leg_closed` reason for a leg that is no longer open. Taking the verifier's lock means a confirm and a run that verifies or breaks the same leg serialize, and the loser sees `open = false`.
3. **A `leg_confirmed` trade event to the giver.** `finishSettle` notes both parties `leg_verified` for a partial settle. A confirmed leg instead sends `leg_confirmed` to the giver only, since the receiver did it. When the confirmation completes the trade, `finishSettle`'s `completed` note goes to both, as today. `finishSettle` gains an option to skip its own `leg_verified` note, and `confirm.ts` writes the `leg_confirmed` note itself.
4. **Reputation and rating read `confirmed_at`.** The `done` CTE adds `AND NOT EXISTS (SELECT 1 FROM trade_leg l WHERE l.trade_id = trade.id AND l.confirmed_at IS NOT NULL)`. `TradeState` gains `confirmedLegs`, and `rateRefusal` returns a new `confirmed_trade` refusal when it is above 0 on a completed trade. A failed trade keeps the deliverer's rating: only the party at fault is refused there, and a confirmed leg is no reason to shield them. Every caller, `services/chat/deal.ts` included, passes it, so the trade page, the chat deal strip and `offer.rate` agree. `forgetReputation` runs as for any completed trade. It is a no-op for the verified count, but it keeps the cache rule uniform.
5. **Grace as a constant only.** `AWAY_GRACE_HOURS = 72`. `trade-match.test.ts` rewrites its hard-coded 23/24/25/30/38/40-hour cases against the constant, so the next change to it is one line.
6. **Web reuses the wrong-copy surfaces.** The trade read returns `confirmedAt` per leg. The leg's `state` stays `verified`, and a `confirmed` flag drives the Confirmed mark, the Selected panel line and a Timeline row with no hash. Mark as received lives in the Selected panel for a waiting leg the viewer receives, and in the away note of the status card. It opens the same confirm dialog pattern as Accept #542 in `wrong-copy.tsx`, and calls the new procedure through `features/offers/actions.ts`. The link hint links to `/account/profiles`. A completed trade with a confirmed leg shows a line in place of the rating controls. `next-step.ts` keeps its state order: its completed step carries `confirmed`, `legChip` returns `confirmed`, and `canMarkReceived` hides the button while a wrong copy on the leg is pending (the server refuses `copy_pending` too, so a copy is never left pending on a closed leg). `finishSettle` marks a `completed` note `confirmed` when any leg was, so the notifications popover offers no Leave feedback for it.

## Risks / Trade-offs

- [Two alts confirm trades that never happened] → They gain no verified count and no ratings, so all they can produce is a Completed row in their own My trades.
- [A receiver confirms by mistake, or under pressure in chat] → The dialog says it closes the leg for good and that the trade won't count toward verified trades. There is no undo, the same as Accept on a wrong copy.
- [Real sales now take up to 72 hours to break] → Both parties are still told at once with the deadline. The receiver can cancel while nothing was sent, and can now confirm.
- [Old `away` notifications show the 24-hour time] → The trade page reads `awayBreaksAt` live and shows the right one. The note is past history.
- [A code path reads `verified_at` and expects a hash] → Search for `txHash` and `verifiedObjektId` reads while applying. The Timeline and the leg card are the known ones.

## Migration Plan

1. Ship the grace first if trade 69 or a similar leg needs it: task group 1 deploys alone with no migration, worker and web together (web first, so the page's deadline matches the worker's).
2. `db:generate` adds nullable `trade_leg.confirmed_at` (no default, no backfill). Apply it to local, then staging and production with the user's approval, before the web build that writes it deploys.
3. Deploy web, then the worker (the worker only needs the new constant and `TRADE_EVENTS`).
4. Rollback: redeploy the previous web and worker. Confirmed legs stay closed with `verified_at` set and read as ordinary verified legs. The column can stay.

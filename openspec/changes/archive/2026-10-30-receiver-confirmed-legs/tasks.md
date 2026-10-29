# Tasks

## 1. Away grace to 72 hours (ships alone, no migration)

- [x] 1.1 In `packages/api/src/lib/trade-match.test.ts`, rewrite the "away after the accept" cases (23, 24, 25, 30, 38 and 40 hours) in terms of `AWAY_GRACE_HOURS`: just under the grace waits with `awaySince`, at the grace breaks dated when it left, a return after the grace changes nothing. They pass at 24 before the change. `bun test packages/api/src/lib/trade-match.test.ts` passes
- [x] 1.2 Set `AWAY_GRACE_HOURS = 72` in `packages/api/src/schemas/offer.ts`. The tests from 1.1 pass unchanged, and lint, typecheck and build pass for `@repo/api`, `worker` and `web`
- [x] 1.3 Check that no message or help text in `apps/web/messages/{en,ko,ja}.json` states "24 hours" for the away rule (they take `{date}` today). If any does, change it and run `bun run --filter=web typecheck`

## 2. Data and rules (packages/db, packages/api, pure)

- [x] 2.1 Add nullable `confirmed_at` (timestamptz) to `tradeLeg` in `packages/db/src/schema.ts` and generate the migration with `bun run --filter=@repo/db db:generate`. Apply it to the local database only. The SQL adds one nullable column and nothing else, and lint, typecheck and build pass for `@repo/db`
- [x] 2.2 In `packages/api/src/lib/offer-rules.test.ts`, add failing cases: `rateRefusal` returns `confirmed_trade` for a completed trade with `confirmedLegs > 0` (a failed one still takes the deliverer's feedback), and the existing cases hold with `confirmedLegs: 0`. Then add `confirmedLegs` to `TradeState` and the refusal, plus `confirmed_trade` and `leg_closed` to the refusal list and its messages. The tests pass, with lint, typecheck and build for `@repo/api`
- [x] 2.3 Pass `confirmedLegs` from every `TradeState` builder (`services/offer/trades.ts`, `services/chat/deal.ts`, and any other caller typecheck finds). Typecheck passes across the repo

## 3. Confirm procedure and reads (packages/api)

- [x] 3.1 Add `leg_confirmed` to `TRADE_EVENTS` in `schemas/offer.ts`. Give `finishSettle` an option to skip its `leg_verified` note, and mark its `completed` note `confirmed` when a leg of the trade was confirmed, so the popover offers no Leave feedback. Lint, typecheck and build pass for `@repo/api`
- [x] 3.2 Add `services/offer/confirm.ts` with `confirmLeg(me, legId)` as design decision 2 describes: find the leg, refuse a non-receiver, lock the trade, recheck in progress and open, refuse `copy_pending` while a wrong copy on the leg is pending, write `open = false`, `verified_at` and `confirmed_at`, then settle through `finishSettle`. Write the giver's `leg_confirmed` note when the trade stays in progress, then `forgetReputation` and `publishTouched` as `acceptSubstitute` does. Add `offer.confirmLeg` with a `{ legId }` schema to `routers/offer.ts`. Lint, typecheck and build pass for `@repo/api`
- [x] 3.3 Exclude trades with a confirmed leg from the `done` CTE in `services/reputation.ts`. The trade read in `services/offer/trades.ts` returns `confirmedAt` per leg, and `canRate` is false for a confirmed trade. Check every read of `txHash` / `verifiedObjektId` on a verified leg (search `packages/api/src` and `apps/web/src`) for a null hash. Lint, typecheck and build pass for `@repo/api`

## 4. Worker (apps/worker)

- [x] 4.1 Confirm that `loadOpenLegs` (`l.open`) and the run's settle skip confirmed legs with no change. Nothing else in the worker reads `confirmed_at`. Lint, typecheck and build pass for `worker`

## 5. Web (apps/web)

- [x] 5.1 Add en/ko/ja messages: Mark as received, the confirm dialog (title, body saying it closes the leg for good and the trade won't count toward verified trades or take ratings, confirm and cancel), "Confirmed by {name}", the Confirmed status mark, the Timeline row, the completed-with-confirmation line, the receiver's link-or-confirm away line, the `leg_confirmed` notification, and the two refusals. `bun run --filter=web typecheck` (which compiles Paraglide) passes
- [x] 5.2 Add `confirmLeg` to `features/offers/actions.ts` (with the existing trade invalidation) and a confirm dialog that follows Accept in `wrong-copy.tsx`. Show Mark as received in `selected-objekt.tsx` for a waiting leg the viewer receives. Lint, typecheck and build pass for `web`
- [x] 5.3 Render confirmed legs: the `confirmed` leg chip (`legChip` in `next-step.ts`, grouped under Verified) and its mark in `trade-exchange.tsx`, "Confirmed by" with the time and no hash in `selected-objekt.tsx`, a separate no-hash row in `trade-timeline.tsx`, and the completed-with-confirmation line in place of rating controls in `next-step-banner.tsx`. `next-step.ts` keeps its state order; its completed step carries `confirmed`, and `canMarkReceived` decides where the button shows (never while a wrong copy is pending). Add cases to `exchange.test.ts` / `next-step.test.ts` for a confirmed leg. `bun run test`, lint, typecheck and build pass for `web`
- [x] 5.4 In the away line of `next-step-banner.tsx`, for the receiver only, add the hint that a profile linked before the deadline counts (linking to `/account/profiles`) and Mark as received. Render `leg_confirmed` in `features/offers/format.ts` and give it a tone in `features/notifications/tone.ts`. Lint, typecheck and build pass for `web`
- [ ] 5.5 On the dev server against the local database only, check `/trade/mine/$tradeId` in en, ko and ja for: an away leg seen by the receiver (hint and action) and by the giver (neither); confirming a leg mid-trade (giver notified, cancel locked); confirming the last leg (Completed, no rating, line shown); the Timeline row; and the giver's notification in the popover. Production is read-only, so a confirm against it is verified up to the request only

## 6. Wrap-up

- [x] 6.1 Run `bun run check` and `bunx oxfmt --check` at the root. Both pass
- [x] 6.2 Update `packages/api/AGENTS.md` (a confirmed leg has `verified_at` with no hash; reputation and rating read `confirmed_at`) and `apps/worker/AGENTS.md` ("Trade verifier": the grace is `AWAY_GRACE_HOURS`, now 72, and confirmed legs leave matching through `open`). State that no other package's `AGENTS.md` changes

## Workflow follow-up

- Group 1 can be deployed on its own, web then worker, to give open away legs (trade 69) the 72 hours before the rest lands. That needs the user's go-ahead to commit and deploy.
- Apply the `confirmed_at` migration to staging and production with the user's approval, before the web build that writes it deploys.

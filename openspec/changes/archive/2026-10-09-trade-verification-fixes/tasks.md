## 1. Estimated serials: shared rule and API

- [x] 1.1 Add `packages/lib/src/serial.ts` with `V1_CUTOFF_MS`, `isSerialEstimated(mintedAt)` and `shownSerial(serial)` (0 becomes `null`). Write `serial.test.ts` covering:
  - just before the cutoff, exactly at it and after it;
  - serial 0.

  Then have `apps/worker/src/lib/serial-math.ts` import the cutoff from it. Verify that the new test and `serial-math.test.ts` pass, and that lint, typecheck and build pass for `@repo/lib` and `worker`.
- [x] 1.2 Make `hydrateCards` read `minted_at` and return `serial(id): { serial, estimated }`. Add `serialEstimated` to `CandidateItem`, `OfferItemView` and the trade leg view, set in `toCandidate`, `itemViews` and `fetchTrade`. Verify with `offer.trade` and `offer.views` against a trade holding an objekt from after the cutoff: it returns `serialEstimated: true`, and a pre-cutoff objekt returns `false`. `@repo/api` lint, typecheck and build pass.

## 2. Estimated serials: web

- [x] 2.1 Render the marked serial:
  - `itemLabel` prints `~#n`;
  - `ItemLabel` and `candidate-tile.tsx` add an `sr-only` "estimated";
  - en/ja/ko text.

  Verify in the builder, in an offer card in chat, on `/trade/mine` and on a trade page, at 1280 and 390 px: a post-cutoff objekt reads "~#n", a 2025 objekt reads "#n", and the accessibility tree names the first as estimated. Web lint, typecheck and build pass.
- [x] 2.2 Add `EstimatedSerialNote` under the builder's sides, and under the trade page's table, shown only when a shown serial is estimated. Verify that it appears once with an estimated objekt picked and is absent otherwise. Web lint, typecheck and build pass.

## 3. Transfer identity and window

- [x] 3.1 Check read-only on production that no two verified `trade_leg` rows share `(tx_hash, verified_objekt_id)`, and record the result. Stop and ask if any do.
  - Result (2026-10-09): production has no `trade`, `offer` or `trade_leg` table yet (this branch's migrations aren't applied there), so no duplicates can exist. The local database has 6 verified legs and no duplicate pair.
- [x] 3.2 In `packages/db/src/schema.ts`:
  - add `tradeSubstitute` (decision 1), with its relation;
  - add the unique index `trade_leg_transfer_uniq` (decision 9).

  Run `db:generate`, and verify that the generated SQL only creates the table and the two indexes. Do not apply it without approval. `@repo/db` lint and typecheck pass.
- [x] 3.3 In `lib/trade-match.ts`:
  - key transfers by `hash:tokenId`, and take `verified.objektId` from `tokenId` (decision 9);
  - add `copyWindowStart`, and order legs as specific first, then by `acceptedAt`, then by id (decision 10).

  Extend `trade-match.test.ts`:
  - a transfer whose key is in `used` under a new uuid doesn't verify (the re-index case);
  - an any-copy transfer 11 minutes before the accept doesn't verify, and one at 9 minutes does;
  - a specific transfer before the accept, after the offer, does verify;
  - two trades' any-copy legs go to the one accepted first.

  Verify that `bun test packages/api/src/lib/trade-match.test.ts` passes, and that `@repo/api` lint and typecheck pass.
- [x] 3.4 Make `matchOpenLegs` select `token_id`, build `used` from `trade_leg (tx_hash, verified_objekt_id)`, and pass `accepted_at` through for the window. Make `settleTrade` treat a unique violation on either index as "taken". Verify against production read-only that the current open legs give the same `results` as before, apart from any-copy legs that only matched before their window. List any such legs in the task notes. `@repo/api` and `worker` lint, typecheck and build pass.
  - Result (2026-10-09): production has no trade tables yet, so this ran on the local database's open legs against the production indexer (read-only). The 4 open legs (102, 103, 105, 107) give the same results as the HEAD matcher: all pending. No any-copy leg matched only before its window. `settleTrade` already treats any unique violation as taken, so the new index needed no change there.

## 4. Wrong copies: matching

- [x] 4.1 Make `matchLegs` also return its `taken` set, and add a pure `nearMisses(legs, transfers, taken)`. Add tests for:
  - a different copy from giver to receiver is reported;
  - the leg's own token is not;
  - a transfer that verified another leg is not;
  - a move before `copyWindowStart` is not;
  - a move between the giver's own addresses is not;
  - an any-copy leg reports none.

  Verify that the tests pass, and that `@repo/api` lint and typecheck pass.
- [x] 4.2 In `matchOpenLegs`, look up collection uuids for every open leg, widen the copies read to all of them, and return `{ results, nearMisses }`. Update `cancelTrade` and the worker for the new shape. Verify against production read-only that the run's logged time stays in line with before. `@repo/api` and `worker` lint, typecheck and build pass.
  - Result (2026-10-09): on the local open legs against the production indexer (read-only), `matchOpenLegs` took 860–1370 ms over three runs, against 882–894 ms before. Same results, no near misses.

## 5. Wrong copies: worker

- [x] 5.1 Move the outcome-and-notes step of `settleTrade` into `finishSettle(tx, …)` in `services/trade-verify.ts`. The worker calls it with no change in behaviour. Verify that the existing `trade-match` tests pass, and that the worker's lint, typecheck and build pass.
- [x] 5.2 In `settleTrade`, insert near misses into `trade_substitute` (`ON CONFLICT DO NOTHING`), and write a `wrong_copy` note to both parties for each new row. Settle a trade with near misses even when no leg was decided. Add both collections to `refreshWatch`. Add the `wrong_copy` and `wrong_copy_declined` events and the optional `copy` payload to `tradePayloadSchema`. Verify on a local database (`.env.local`) with a seeded trade and transfer:
  - one row and two notifications appear;
  - a second run adds none.

  Without a local database, record it as read-only verified. `worker` and `@repo/api` lint, typecheck and build pass.
  - Result (2026-10-09): the migration was applied to the local database only, with approval. Local leg 102 was pointed at a real transfer from the production indexer (`0x2e4c…1aac`, cream02-sun-081z #3105, asking for #1). One run recorded one `trade_substitute` row and wrote two `wrong_copy` notifications with both serials; a second run added none. The leg was restored afterwards.
- [x] 5.3 Make `expiredOutcome` take a count of held wrong copies, and have `expireStalls` count pending and declined substitutes. Extend the `expiredOutcome` tests so that 0 verified legs with 1 held copy gives `failed`. Verify that the test passes, and that `worker` lint, typecheck and build pass.

## 6. Wrong copies: API

- [x] 6.1 Add `services/offer/substitute.ts` with `acceptSubstitute` and `declineSubstitute` (design.md decision 4), the routes `offer.acceptSubstitute` and `offer.declineSubstitute`, and the refusal codes `not_receiver`, `substitute_closed` and `substitute_taken`. Verify on a local database:
  - accept verifies the leg with the substitute's hash and completes a one-leg-left trade;
  - decline notifies the giver;
  - the giver's accept is refused.

  Without a local database, verify read-only up to the request boundary. `@repo/api` lint, typecheck and build pass.
  - Result (2026-10-09, local database): accepting a wrong copy verified leg 102 with its hash and time (`transfer_id` left null) and completed the one-leg trade T-86. Decline set it declined and sent the giver `wrong_copy_declined`. The giver's accept got `not_receiver` (403). Accepting the same transfer on another trade's leg got `substitute_taken` (409) and left that trade unchanged.
- [x] 6.2 Make `cancelRefusal` and `TradeView.cancelLocked` count held wrong copies, and lock `cancelTrade` on unrecorded near misses. Add `substitutes`, `verifiedSerial` and `verifiedSerialEstimated` to the leg view in `fetchTrade`. Verify with `offer.trade` on a trade with a pending substitute: `canCancel` is `false`, `cancelLocked` is `true`, and the substitute is listed. `@repo/api` lint, typecheck and build pass.
  - Result (2026-10-09, local database): with a pending wrong copy on T-86, `offer.trade` returned `canCancel: false`, `cancelLocked: true` and listed the copy; `offer.cancelTrade` was refused with `locked` (409).

## 7. Wrong copies: web

- [x] 7.1 In `LegTable`, render the wrong-copy row under a leg:
  - the receiver's Accept (with an `AlertDialog` confirm) and Decline;
  - the giver's sentence;
  - Declined;
  - "#n in place of #m" on a leg verified with a substitute.

  Mutations invalidate the trade query. Add en/ja/ko text and the refusal wording in `refusal.ts`. Verify as both parties at 1280 and 390 px, with no sideways scroll, and that the confirm dialog's dismiss reads Cancel. Web lint, typecheck and build pass.
  - Result (2026-10-09, local database): checked as giver and receiver at 1280 and 390 px, with no sideways scroll. The receiver sees Accept #3105 and Decline; the confirm dialog's dismiss reads Cancel. The giver sees the hint, both see Declined after a decline, and the accepted leg reads "#3105 in place of #1".
- [x] 7.2 Add `wrong_copy` (a new `warning` icon, tone `warning`) and `wrong_copy_declined` (a neutral arrow) to `notificationTone` and `tradeNotificationText`, and extend `tone.test.ts`. Verify that `bun test apps/web/src/features/notifications/tone.test.ts` passes, and that the bell renders both kinds. Web lint, typecheck and build pass.
  - Result (2026-10-09, local database): the bell showed a `wrong_copy` row with an amber warning sign and a `wrong_copy_declined` row with a neutral arrow, each naming T-86 and both serials.

## 8. Checks

- [x] 8.1 Run `bun run check` and `bun run build` from the root and verify both pass. Run `openspec validate trade-verification-fixes --strict` and verify it passes.

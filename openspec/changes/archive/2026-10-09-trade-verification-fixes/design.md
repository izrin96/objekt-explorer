## Context

See proposal.md for why.

**Verification today:**
- `apps/worker/src/job/trade-verifier` runs `loadOpenLegs` and `matchOpenLegs` (`packages/api/src/services/trade-verify.ts`). It runs every 2 minutes, and sooner when the indexer's `transfers` pub/sub names a watched objekt or collection. It then settles each trade in its own transaction, under the trade row's `FOR UPDATE` lock.
- `matchLegs` (`lib/trade-match.ts`) is pure. Specific legs claim their own token, then any-copy legs claim a copy. A `taken` set keeps one transfer to one leg, and the unique `trade_leg.transfer_id` index backs that up. Legs are ordered by leg id, and every leg's window starts at the offer's `created_at`.
- `transfer.id` is a `Bun.randomUUIDv7()` assigned at index time (`apps/indexer/src/main.ts`), so a rebuild gives every transfer a new id. `transfer.token_id` is not null and equals `objekt.id`.
- `matchOpenLegs` reads transfers of the specific tokens, plus transfers of any-copy collections from the givers' addresses.
- `cancelTrade` (`services/offer/trades.ts`) locks the trade when `matchOpenLegs` finds a verifiable leg, even one not yet recorded, and checks again under the row lock.
- `expireStalls` ends a trade Failed when at least one leg verified (`expiredOutcome`), else Cancelled.

**Serials today:**
- The indexer stores `objekt.serial` (not null). Objekts minted from `V1_CUTOFF_MS` (`apps/worker/src/lib/serial-math.ts`) on carry 0 until `populate-serial` numbers them.
- Trade views get serials through `hydrateCards` (`services/chat/cards.ts`), which reads `objekt.id, serial`, and through `toCandidate` (`services/offer/picker/shared.ts`).
- The web shows them with `itemLabel` / `ItemLabel` (`features/offers/format.ts`, `item-label.tsx`) and in `candidate-tile.tsx`.

## Goals / Non-Goals

**Goals:**
- Wrong copies are found by the same pass, over the same transfer read, that verifies legs. That way "one transfer verifies at most one leg" stays enforced in one place.
- Accepting a wrong copy writes the leg exactly as the verifier would, so progress, completion, reputation and notifications don't need a second path.

**Non-Goals:**
- Mod console changes. `features/moderation/console/trades.tsx` keeps showing a leg's verified state, and an accepted wrong copy reads as Verified there.
- Changing how the worker computes serials.

## Decisions

**1. A `trade_substitute` table, not columns on `trade_leg`.** One leg can see several wrong copies, and each needs its own decision. The columns:
- `id` serial;
- `trade_leg_id` (fk, on delete cascade);
- `tx_hash` text;
- `objekt_id` varchar(255), the transfer's `token_id`;
- `transferred_at` timestamptz;
- `status` text, `pending | accepted | declined`, with a check;
- `decided_at`;
- `created_at`.

Indexes: unique `(trade_leg_id, tx_hash, objekt_id)`, and one on `trade_leg_id`. The key is not unique without the leg: one wrong copy may sit against two waiting legs (in two trades) until one of them takes it. No indexer uuid is stored (see decision 9).

Alternative considered: compute wrong copies on every trade page read and store only decisions. Rejected, because the notification has to fire once, which needs a record of what was already seen, and the cancel lock needs a stable answer.

**2. `nearMisses` in `lib/trade-match.ts`, run after `matchLegs`.** The input is the same legs, the same transfers and the final `taken` set. For each specific leg still `pending`, it returns the transfers that:
- are of the leg's collection, with a different `objektId`;
- go from the giver to the receiver;
- happened at or after the leg's `copyWindowStart` (see decision 10);
- are not in `taken`.

`matchLegs` returns its `taken` set alongside the results, so no transfer is both verified and offered as a wrong copy in the same run. This function is pure and gets unit tests next to `trade-match.test.ts`.

`matchOpenLegs` widens the copies read from any-copy collections to the collections of every open leg. Specific legs need a collection uuid, so the slug lookup now covers all legs. The watch set in `refreshWatch` gains those collections too, so a wrong copy is found on the pub/sub trigger and not only on the 2-minute cron. The read stays bounded by `from IN givers` and `timestamp >= since` on indexed columns.

**3. Recording runs in `settleTrade`'s transaction.** The trade is in progress under the row lock, and the verifier inserts the trade's near misses with `ON CONFLICT DO NOTHING`. Each row it actually inserts writes a `trade` notification with the new event `wrong_copy`. That notification goes to both parties, and its payload carries both serials and their estimated flags. A trade that only gained wrong copies (no leg decided) now also gets `settleTrade`, so the skip test becomes "nothing decided and no near misses".

**4. Accept and decline live in `packages/api`, in `services/offer/substitute.ts`.** The routes are `offer.acceptSubstitute({ substituteId })` and `offer.declineSubstitute({ substituteId })`. Under the trade row lock, each checks:
- the viewer is the leg's `to_user_id`;
- the trade is `in_progress`;
- the leg is open;
- the substitute is `pending`.

**Accept:**
- It updates the leg as `settleTrade` does: `open = false`, `verified_at = transferred_at`, `tx_hash` and `verified_objekt_id`, leaving `transfer_id` null.
- A unique violation on `(tx_hash, verified_objekt_id)` (another leg took the transfer first) is refused as `substitute_taken`.
- It then applies `tradeOutcome` to the whole trade and closes the trade's legs when it ended. It writes the same `leg_verified` or `completed` notes, and the API publishes them with `publishTouched`.

The outcome and note step is pulled out of `settleTrade` into a shared `finishSettle(tx, …)` in `services/trade-verify.ts`, so the worker and the API end a trade the same way. On a completed trade, the reputation cache delete moves with it.

**Decline:** it sets `declined` and `decided_at`, and notifies the giver with `wrong_copy_declined`.

Refusals go through `refuseOffer` with the new codes `not_receiver` and `substitute_closed` (plus `substitute_taken`), worded in `refusal.ts`.

**5. The cancel lock and expiry count a held wrong copy.**
- `cancelRefusal` takes a `heldCopies` count: substitutes with status `pending` or `declined` on the trade's legs.
- The pre-check in `cancelTrade` also locks on near misses that `matchOpenLegs` now returns but the verifier hasn't recorded yet. This mirrors today's lock on an unrecorded verified transfer.
- `expiredOutcome(verifiedLegs, heldCopies)` returns `failed` when either count is above 0.
- `tradeOutcome(results, alreadyVerified, heldCopies)` fails a broken trade the same way. The worker records the run's wrong copies before it decides the outcome, so a copy spotted in the same run counts.
- A held copy is pending or declined, and its transfer has not verified a leg anywhere: a copy another trade took doesn't hold this one.
- `TradeView.cancelLocked` uses the same rule.

**6. Estimated serials are decided on the server.**
- `V1_CUTOFF_MS` moves to `packages/lib/src/serial.ts` with `isSerialEstimated(mintedAt)` and `shownSerial(serial)` (0 becomes `null`). `serial-math.ts` re-exports it from there, so the worker's math and tests are unchanged.
- `hydrateCards` reads `minted_at` and returns `serial(id): { serial: number | null; estimated: boolean }`.
- `CandidateItem`, `OfferItemView` and the trade leg view each gain `serialEstimated: boolean`. These are new output fields, so tabs still open on the old build ignore them.

On the web:
- `itemLabel` prints `~#88` when the serial is estimated. `ItemLabel` wraps the number in a `<span>` with an `sr-only` "estimated".
- `CandidateTile` does the same.
- One `EstimatedSerialNote` (muted text and an info icon) renders under the builder's sides, and under the trade page's table when any shown serial is estimated.

Alternative considered: send `mintedAt` and decide on the client. Rejected, because the cutoff rule would then live in two bundles.

**7. The trade page shows wrong copies inside `LegTable`.** `tradeLegViewSchema` gains:
- `substitutes`: `{ id, objektId, serial, serialEstimated, txHash, at, status }[]`, the pending and declined ones while the leg is open;
- `verifiedSerial` and `verifiedSerialEstimated`, for a leg verified with a different objekt.

A leg with substitutes renders a full-width row under it (`colSpan={3}`, stacking below `sm`):
- **The receiver** sees "Sent #1207, this trade asks for #1203", the short hash and the time, then Accept #1207 and Decline buttons. Accept opens the existing `AlertDialog` pattern, with `m.common_modal_cancel()` beside the confirm button.
- **The giver** sees the matching sentence and "They can accept it, or send #1203".
- Once declined, both see "Declined" in place of the buttons.

A verified leg whose `verifiedObjektId` differs from `objektId` reads "#1207 in place of #1203". Mutations invalidate the trade query. Live updates come from the existing `chat_changed` and notification events.

**8. Notification tones.** `TRADE_EVENTS` gains `wrong_copy` and `wrong_copy_declined`. `notificationTone` maps:
- `wrong_copy` to a new `warning` icon (Phosphor `WarningIcon`) with tone `warning`;
- `wrong_copy_declined` to a `neutral` arrow.

`tradeNotificationText` words both. The payload gains an optional `copy: { asked, sent }`, each a `{ serial, estimated }`, so older stored rows still parse.

**9. A transfer's identity is `(tx_hash, token_id)`, not the indexer uuid.**
- `MatchTransfer` gains `tokenId`. `matchLegs`, `nearMisses` and the `used` set key transfers as `` `${hash}:${tokenId}` ``.
- `matchOpenLegs` builds `used` from `trade_leg (tx_hash, verified_objekt_id)` for the candidates' hashes, not from `transfer_id`.
- `verified.objektId` takes `tokenId`, never `objektId ?? ""`.
- A new unique index `trade_leg_transfer_uniq` on `(tx_hash, verified_objekt_id)` where `tx_hash IS NOT NULL` replaces `trade_leg_transfer_id_uniq` as the race guard in `settleTrade` and in accept.
- `transfer_id` keeps being written by the verifier for debugging, but nothing reads it. Its unique index stays until a later change drops the column.

One transaction can move several tokens (a batch send), and each is its own key. The same token moving twice in one transaction isn't expected. If it happened, the second move couldn't verify a second leg, which errs on the safe side.

Alternative considered: make the indexer's ids deterministic (for example a uuid v5 of hash and log index). Rejected, because it touches the indexer (see the indexer minimal-change rule), and existing rows would still carry random ids.

**10. The window and ordering by leg type.** `MatchLeg` gains `copyWindowStart`, which is `accepted_at` minus 10 minutes, and `acceptedAt` already exists.
- A specific leg keeps `windowStart` (the offer's `created_at`). Its own token is unambiguous, so an early send still counts.
- Any-copy legs and `nearMisses` use `copyWindowStart`. The 10 minutes cover a party who sends a copy just before pressing Accept. `matchOpenLegs`'s `since` stays the earliest `windowStart`, which already covers both.
- The leg order becomes: specific legs first, then by `acceptedAt`, then by leg id. A transfer that two trades' any-copy legs could take goes to the trade accepted first.

Alternative considered: start every window at the accept. Rejected, because a giver who sends with their offer would never be counted.

## Risks / Trade-offs

- [A tab on the old build receives a `wrong_copy` notification] → Its `switch` has no case for it, so the item shows no text until the tab reloads. The bell still links to the trade. Accepted, since it's brief and nothing breaks.
- [The wider transfer read costs more per run] → It's bounded by giver addresses and `since`, which are already used for any-copy legs, over the indexed `from` and `collection_id` columns. Watch the run's logged duration after deploy.
- [A receiver accepts a cheaper copy by mistake] → Accept confirms with both serials shown, and is never automatic.
- [One transfer is listed against two legs] → Accepting it on one leg makes the other leg's accept fail with `substitute_taken`, and the next verifier run drops it from view, since the `used` set now holds that transfer's key.
- [An estimated serial is shown without its "~" somewhere outside the trade surfaces] → This is out of scope by design (see proposal Non-goals).

## Migration Plan

1. Before generating, check read-only that no two verified legs share `(tx_hash, verified_objekt_id)` (a `GROUP BY ... HAVING count(*) > 1`). If any do, stop and ask: the unique index would fail.
2. Run `bun run --filter=@repo/db db:generate` for `trade_substitute` and the new unique index. This adds a new migration and edits no earlier one.
3. Applying the migration needs the user's approval. It must be live before the worker and API deploy, since both read the table.
4. Rollback: deploy the previous build. The table and the index can stay: nothing older reads the table, and the older verifier writes legs that satisfy the index.

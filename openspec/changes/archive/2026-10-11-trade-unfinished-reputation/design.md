## Context

See proposal.md for why.

- `computeReputation` (`services/reputation.ts`) counts completed trades and ratings in one grouped read. Results are cached per user in Redis (`rep:<id>`, 600 s), and the worker deletes the keys of both parties when a trade completes (`trade-verifier/index.ts:194`, through `publishAll`).
- `rateRefusal` (`lib/offer-rules.ts:276`) allows only completed trades. `rateTrade` and `fetchTrade.canRate` both use it.
- `firstSender` orders by verified count, then account age. `suggestFirstSender` passes in `TradeParty` (`verified`, `createdAt`).
- A trade ends Failed in two places:
  - the verifier's `settleTrade`, when a leg breaks after another verified;
  - `expireStalls`, after `TRADE_EXPIRE_DAYS`.

## Goals / Non-Goals

**Goals:**
- One definition of "delivered" and "at fault", used by the reputation count, the rating rule and the trade page alike.

**Non-Goals:**
- Storing the at-fault party. It follows from the legs, and the read is cheap.

## Decisions

**1. Derive "at fault" from the legs, in SQL and in TS.** For a failed trade, a party *delivered* when every `trade_leg` they gave has `verified_at`. The other party is *at fault* when they gave at least one leg without `verified_at`. If both still owed something, nobody is at fault.
- **SQL:** `computeReputation` adds an `unfinished` CTE over `trade` with status `failed`, joined to `trade_leg` and grouped per trade and giver: `bool_and(verified_at IS NOT NULL)`. It counts trades where the account owed something and the other party had delivered. The read hits `trade_user_a_idx`/`trade_user_b_idx` and `trade_leg_trade_id_idx`, and stays one round trip.
- **Following the wallet:** the CTE counts a failed, at-fault trade toward an account in two cases:
  - the account itself is the at-fault user;
  - any of the at-fault side's `from_addresses` (the lowercase snapshot taken at accept) is among the account's current `user_address` rows (lowercased), checked with `&&` (array overlap) and `DISTINCT` per trade.

  Failed trades are a small set, so the read starts from `trade.status = 'failed'`. If that grows, a GIN index on `trade_leg.from_addresses` can be added in a later change. Completed counts and ratings keep matching on the user only.
- **TS:** a pure `atFault(legs, userA, userB): string | null` in `lib/offer-rules.ts`, with tests, used by `rateRefusal` and `fetchTrade`.

A party who gives no legs, such as a cash buyer, owed nothing the site can see, so they count as having delivered and are never at fault. Take a cash sale of two objekts where one verified and the other was sold elsewhere: the seller is at fault, and the buyer can rate them. The site can't see money, so it never treats a buyer who didn't pay as at fault.

Alternative considered: a stored `at_fault_user_id` column on `trade`, written at failure. Rejected for now, because it would need a backfill for nothing the derived rule can't do.

**2. Rating a failed trade.** `rateRefusal(trade, now, viewer, faultyUser)`:
- `completed` behaves as today;
- `failed` is allowed only when `faultyUser !== null && faultyUser !== viewer`, within `RATE_WINDOW_DAYS` of `endedAt`;
- anything else is refused with `not_completed`.

`trade-feedback.tsx` takes `canRate` as today, plus a heading for the failed case: "Rate {name}: they didn't send their part". Ratings are stored as now in `trade_feedback`, so the positive share picks them up unchanged.

**3. The reputation shape and the cache.**
- `reputationSchema` gains `unfinished: z.number().default(0)`. The default lets a cached entry written before deploy still parse, and the 600 s TTL replaces it.
- The worker adds the at-fault user to `reputations` when `settleTrade` or `expireStalls` ends a trade Failed. Both parties are invalidated, to keep it simple. `expireStalls` currently passes no `reputations`, so it gains them.

**4. Non-transferable objekts.**
- **Detection.** The verifier, which already loads open legs, reads `objekts.transferable` for the specific objekts of open legs in the same chunked read that offer upkeep uses for owners. Offer upkeep adds `transferable` to its owner read.
- **Offers.** An open offer holding a non-transferable objekt is cancelled with the new reason `not_transferable`, through the same path as `token_moved`.
- **Trades, nothing sent.** In `settleTrade`'s transaction, a trade with a stuck leg and nothing verified is cancelled with the new `cancel_reason` `not_transferable`, and its legs close. This reuses the "broken" path.
- **Trades, something sent.** The leg gets `untransferable_at = now()` when it's null, and a `trade` note with the new event `stuck` goes to both parties, once per leg. When the objekt is transferable again, `untransferable_at` goes back to null.
- **Unfinished count.** A stuck leg still counts as owed. `untransferable_at` only drives the trade page note and the `stuck` notice; the CTE and `atFault` ignore it. Gridding a first-class objekt makes it non-transferable, so an owner can cause it themselves, and excusing it would let someone receive, grid, and fail clean.

A held wrong copy counts as something sent, as it does for the cancel lock (`trade-verification-fixes`, already applied).

The `stuck` notification uses the amber clock tone of the stall reminder, which the bell spec already lists. That avoids changing the bell requirement, which `trade-verification-fixes` also changes. Cancelled offers and trades keep the red cross.

The migration adds `trade_leg.untransferable_at timestamptz`, and widens the `offer_cancel_reason` and `trade_cancel_reason` checks to include `not_transferable`. A tab still on the old build shows these new reasons without reason text until it reloads.

Alternative considered: excusing a stuck leg from the unfinished count. Rejected, because the owner can make an objekt non-transferable themselves by gridding it, so the excuse would let someone receive the other side, grid theirs, and let the trade fail clean.

**5. Who sends first.** `TradeParty` gains `unfinished`, and `firstSender` compares it first (more sends first), then the existing order. Tests in `offer-rules.test.ts` cover the new first comparison.

**6. TrustLine.**
- With `verified > 0`, "· N unfinished" sits after the verified count, using the same `text-destructive` ink as other failure text, so it isn't the only cue.
- With `verified === 0 && unfinished > 0`, the line reads `m.trust_none_unfinished({ count })`.
- The `sr-only` label carries the same words, plus what the word means: "failed trades where they didn't send their part". The same text is the hover `title` on the unfinished count.

## Risks / Trade-offs

- [A Cosmo wallet that genuinely changes hands brings the old owner's unfinished trades with it] → This is rare, and it errs toward warning partners. The trade itself stays visible to moderators through reports. If it becomes a real complaint, moderators could be given a way to clear one.
- [The address match adds work to a cached read] → It's only one more condition on the failed-trade CTE. The result is cached for 600 s, as today.

- [A party is counted unfinished because of an indexer gap: they sent, but the transfer wasn't seen before the trade failed] → A trade only fails from a seen move away or from expiry, and `trade-indexer-lag` (already applied) holds expiry while the indexer is behind.
- [Honest failures, such as someone whose objekt was made non-transferable by something other than their own grid] → The count is shown beside the verified count, not instead of it. A moderator can still look at the trade through Report a problem.
- [A negative rating by the delivered party is retaliation for something else] → They can only rate in the clear-cut case, where the other party really didn't deliver.

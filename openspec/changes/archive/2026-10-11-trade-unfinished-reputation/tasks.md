## 1. Rules

- [x] 1.1 Add `atFault(legs, userA, userB)` to `lib/offer-rules.ts` (design decision 1), and extend `rateRefusal` (decision 2) and `firstSender` (decision 5). Add tests in `offer-rules.test.ts` covering:
  - one side delivered;
  - both owed;
  - a party with zero legs;
  - rating inside and outside 14 days;
  - the at-fault party refused;
  - a cancelled trade refused;
  - the first-sender ordering;
  - a stuck leg (`untransferable_at` set) still owed, so its giver is at fault.

  Verify that `bun test packages/api/src/lib/offer-rules.test.ts` passes, and that `@repo/api` lint and typecheck pass.

## 2. Non-transferable objekts

- [x] 2.1 Add `trade_leg.untransferable_at` and `not_transferable` to both cancel-reason checks in `packages/db/src/schema.ts` and the API enums, then run `db:generate`. Verify that the SQL only adds the column and swaps the two checks. Do not apply it without approval. `@repo/db` and `@repo/api` lint and typecheck pass.
- [x] 2.2 Add the transferability read and the cancel path to offer upkeep and the verifier, plus `untransferable_at` with the `stuck` note (design decision 4). Put the per-leg decision (cancel, stuck, clear or nothing) in a pure function in `lib/trade-match.ts`, with tests. Verify that the tests pass, and against production read-only that the current open legs and offers produce no unexpected decisions. `worker` and `@repo/api` lint, typecheck and build pass.
- [x] 2.3 Show "can't be sent right now" under a stuck leg, and word the `not_transferable` reason and the `stuck` notification, with en/ja/ko text. Verify at 1280 and 390 px with a stuck leg mocked locally. Web lint, typecheck and build pass.

## 3. Reputation

- [x] 3.1 Add the `unfinished` CTE to `computeReputation`, including the wallet match (design decision 1, "Following the wallet"), and add `unfinished` (with `.default(0)`) to `reputationSchema` and `toReputation`. Verify read-only against production: `reputationOf` for a few accounts returns the same `verified` and `positive` as before, plus `unfinished`. Check by hand one failed trade, if any exists, and use `EXPLAIN` to check the CTE stays cheap. Also verify the wallet rule with a test SQL fixture or a local database: an account that links an at-fault side's address gets its trade counted once, and keeps it after the other account is gone. `@repo/api` lint, typecheck and build pass.
- [x] 3.2 Have the worker add both parties to `reputations` when `settleTrade` or `expireStalls` ends a trade Failed. Verify by reading the code path and on a local database if available, otherwise record it as read-only verified. `worker` lint, typecheck and build pass.

## 4. Trade page and line

- [x] 4.1 Pass `unfinished` into `TradeParty` in `fetchTrade`, and compute `canRate` with `atFault`. Verify with `offer.trade` on a completed trade that nothing changed, and on a failed one (if any) that `canRate` matches the rule. `@repo/api` lint, typecheck and build pass.
- [x] 4.2 Update `TrustLine` and `trade-feedback.tsx` (decisions 2 and 6), with en/ja/ko text, including the hover and screen reader explanation of "unfinished". Verify on Trade, For you, chat and a trade page, at 1280 and 390 px, using a reputation with and without unfinished trades (mocked in the browser if production has none). Check that the screen reader text matches. Web lint, typecheck and build pass.

## 5. Checks

- [x] 5.1 Run `bun run check` and `bun run build` from the root and verify both pass. Run `openspec validate trade-unfinished-reputation --strict` and verify it passes.

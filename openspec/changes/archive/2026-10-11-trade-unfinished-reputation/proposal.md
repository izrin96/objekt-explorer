## Why

Reputation counts only completed trades and the ratings on them, and only completed trades can be rated. Someone can receive another person's objekt, never send theirs, and keep a spotless "31 verified · 100%". The trade ends Failed, which shows up nowhere on their reputation, and the person they cheated can't rate them. That is the main harm verified trades exist to expose.

A reserved objekt can also become non-transferable after the accept, for example when its owner uses it in a Cosmo grid. Today nothing notices: the trade waits 14 days and nobody is told why. Because gridding is the owner's own choice, a stuck objekt is not an excuse once the other party has delivered.

## What Changes

- **"Unfinished" on the reputation line.** An account gets an unfinished trade when a trade fails while it still owed a transfer and the other party had delivered everything they owed. Only those clear-cut cases count. The line reads, for example, "31 verified · 2 unfinished · 100% · since Mar 2025". It shows the count only when it's above 0, so a new account with none still reads "No verified trades yet". A new account that has one shows "No verified trades · 1 unfinished". The line explains the word to screen readers and on hover: failed trades where they didn't send their part.
- **Unfinished trades follow the wallet.** Someone can unlink their Cosmo wallet, or delete their account, then link the same wallet to a fresh account and start clean. To stop that, an account's unfinished count also includes trades where the side at fault used an address the account has linked now. Verified trades and ratings stay with the account, so good history can't move with a wallet.
- **The party who delivered can rate a failed trade.** In the clear-cut case, the party who sent everything can rate the other for 14 days after the trade ended, as on a completed trade. The rating counts toward the positive share. The party who didn't deliver can't rate.
- **Objekts that can no longer be transferred.** On each run, the verifier checks the transferability of the objekts in open offers and in-progress trades.
  - An open offer holding one is cancelled with the reason "an objekt can no longer be transferred".
  - An in-progress trade where nothing has been sent yet is cancelled with that reason, and its reservations are released.
  - When something has been sent, both people are told at once and the trade page marks the leg as stuck. The trade carries on. If it fails, the party whose objekt was stuck is counted unfinished like anyone else who didn't deliver: the owner can make an objekt non-transferable themselves, by gridding it.
- **Who sends first takes unfinished trades into account.** When both parties give objekts, the one with more unfinished trades is asked to send first. After that, the existing rules apply: fewer verified trades, then the newer account.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-verified-trades`: changes to Reputation, Feedback (failed trades) and Who sends first, plus a new requirement for objekts that can no longer be transferred.

## Non-goals

- Stopping someone who runs many accounts. That is still being decided, for example as "verified with N people".
- Counting trades that ended Cancelled, or failed ones where both parties still owed something. Those aren't clear-cut, and Report a problem covers them.
- New notification settings. The new notices use the existing trade notification settings.
- A way for moderators to clear a wrongly counted unfinished trade. Report a problem still reaches them, and a clearing tool can come in a later change if it's needed.

## Routes

Wherever the reputation line shows: Trade, For you, chat and `/trade/mine/$tradeId`, plus the trade page's rating panel.

## Impact

- **`packages/api`:**
  - `services/reputation.ts`: one more grouped count;
  - `schemas/reputation.ts`: `unfinished`;
  - `lib/offer-rules.ts`: `rateRefusal`, `firstSender` and the shared "at fault" rule;
  - `services/offer/trades.ts`: `canRate` and the rating panel.
- **`packages/db`:** `trade_leg.untransferable_at`, and `not_transferable` added to the offer and trade cancel-reason checks, in migration `20261009232256_trade_not_transferable` (done, task 2.1). Applying it needs approval.
- **`apps/worker`:** a transferability check in the verifier and offer upkeep. The reputation cache is also invalidated when a trade fails, not only when it completes.
- **`apps/web`:** `trust-line.tsx`, `trade-feedback.tsx`, the cancel-reason and notification text, and en/ja/ko text.

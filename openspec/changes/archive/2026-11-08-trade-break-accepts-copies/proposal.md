## Why

When one leg of a trade breaks (its objekt sold elsewhere and away for 72 hours), the trade fails, but a pending wrong copy on any other leg is left unaccepted. The fault check then sees both parties still owing and blames nobody: the party who sold the objekt gets no unfinished mark, keeps the copy, and the other party can't leave feedback. Expiry already accepts every open leg's pending copy before it ends a trade, so the same trade blames the right party if it reaches day 14 and nobody if it breaks first.

## What Changes

- When a break ends a trade, each other open leg holding a pending wrong copy accepts its earliest one, as expiry does, before the trade's outcome and fault are decided.
- The accepted copies are marked accepted automatically and notified like any other automatic accept.
- A declined copy is still never accepted.
- No change to when a leg breaks, to a broken leg's own rescue by a copy sent before the break, or to the Cancelled/Failed rule.

Routes: the trade page `/trade/t/$id` shows the result (legs Verified "in place of", the trade Failed with the right party at fault); no route changes. The work is in the worker's trade verifier.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-verified-trades`: the "Wrong copy sent" requirement gains a fourth trigger for automatic accept: the trade ending because another leg broke.

## Impact

- `apps/worker/src/job/trade-verifier/index.ts` (`settleTrade`, after `rescueBroken`), reusing `acceptPicked` and `firstPending`.
- `packages/api/src/lib/trade-match.ts`: a pure helper choosing which open legs accept on a break, with tests in `trade-match.test.ts`.
- Reputation: a failed trade of this shape now gives the breaking party an unfinished mark, and lets the other party rate. Past failed trades are not recomputed.
- No schema, migration, API input or web change.

## Non-goals

- Re-deciding fault on trades that already ended.
- Cash deals, expiry warnings or extending a trade (separate audit items).
- Accepting copies when a leg is stuck (non-transferable) rather than broken.

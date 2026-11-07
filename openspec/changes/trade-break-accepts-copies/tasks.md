## 1. Pure rule

- [x] 1.1 Add `breakAcceptLegs(applied)` beside `copyRescue` in `packages/api/src/lib/trade-match.ts`: the open legs to accept on when a leg is still broken (results neither `verified` nor `broken`), none otherwise. Tests in `trade-match.test.ts`: no broken leg gives none; a broken leg with a pending and a verified sibling gives the pending one; every broken leg rescued gives none. Verify: `bun test packages/api/src/lib/trade-match.test.ts` passes, lint + typecheck for `@repo/api` pass.

## 2. Worker

- [x] 2.1 In `settleTrade` (`apps/worker/src/job/trade-verifier/index.ts`), after `rescueBroken`, run `acceptPicked` with `firstPending` on `breakAcceptLegs(applied)`, write its results into `applied`, add the accepted legs to `verified` and to `autoAccepted` passed to `finishSettle`, and add its notified users to the publish list. Verify: lint + typecheck + build for `worker` pass, and `bun test apps/worker` passes.
- [x] 2.2 Check the scenario on the local DB only, with the user's approval for the test rows: a trade with a pending copy on A's leg and B's objekt away past 72 hours ends Failed, A's leg Verified "in place of", `atFault` names B. Otherwise record it as read-only verified with the code path traced. Read-only verified (no test rows approved): `acceptOnBreak` runs `acceptPicked`/`acceptCopy`, which sets the leg's `verified_at`; `finishSettle` gets the broken result plus sent legs, so `tradeOutcome` is Failed; `atFault`/`faultSql` read `verified_at`, so only B still owes.

## 3. Docs

- [x] 3.1 Update `apps/worker/AGENTS.md` if it describes the verifier's automatic accepts (deadline, expiry, break); otherwise state in the task that no package `AGENTS.md` changed. Done: `apps/worker/AGENTS.md` names the new break accept; `packages/api/AGENTS.md` (`acceptCopy` serves the break) still holds. Verify: `bun run lint` and `bun run typecheck` pass.

## Workflow follow-up

- `/opsx:archive trade-break-accepts-copies` once applied and deployed.

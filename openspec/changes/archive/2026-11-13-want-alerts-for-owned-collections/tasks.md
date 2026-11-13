# Tasks

Each group ends with `bun run lint --filter=worker`, `bun run typecheck --filter=worker`, `bun run test --filter=worker` and `bun run build --filter=worker` passing. Tests are `bun test` on pure modules only: the root `.env` is production, so no test touches the database, Redis or Cosmo. No `git stash`, no commits, no database reads or writes, no migration.

## 1. Starting point

- [x] 1.1 Confirm the deltas still match the main specs: `openspec validate want-alerts-for-owned-collections --strict` passes. Compare each MODIFIED requirement with its block in `openspec/specs/<capability>/spec.md`: Want-list alerts may differ only in the removed "a collection the user already owns a copy of." bullet, the added "Whether the user already owns a copy…" sentence and the "Already owned" scenario; A hidden post comes back only in its second sentence and the "Already held" scenario. If another change has edited either requirement since, stop and ask the owner.

## 2. Worker

- [x] 2.1 `apps/worker/src/lib/want-alert-match.ts`: remove the wanter's-copy check from `tradable`, with its `want` parameter and `skip` result, update `judge` and `selectUnhides`, and drop the `copyKey` import.
- [x] 2.2 `apps/worker/src/lib/want-alert-match.test.ts`: a wanter holding a copy alerts forward and reverse, a pair whose wanter holds a copy but whose offer is not owned yet is unowned, and a hidden pair whose wanter holds a copy unhides and alerts in the same run. Verified by `bun test apps/worker/src/lib/want-alert-match.test.ts`.
- [x] 2.3 `apps/worker/src/job/want-alerts/context.ts`: pass only the offer side's copy pairs to `fetchHoldings`.
- [x] 2.4 Confirm `grep -n "wanterHolds\|copyKey" apps/worker/src/lib/want-alert-match.ts` finds nothing, and `grep -n "wantListId" apps/worker/src/job/want-alerts/context.ts` finds nothing.

## 3. Agent docs

- [x] 3.1 `apps/worker/AGENTS.md`, Want alerts: the unhide's condition no longer names the wanter's copies, and a sentence records that a copy the wanter already holds never skips an alert or an unhide, as For you never reads it. No other `AGENTS.md` changes: the API, web and database conventions are untouched.

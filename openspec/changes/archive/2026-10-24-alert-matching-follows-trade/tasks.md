# Tasks

## 1. Shared partner rules in `packages/api`

- [x] 1.1 Add `tradePartnerSql(viewer, partner)` to `packages/api/src/services/trade-lists.ts`: not hidden by `viewer` (`hidden_trade_partner`), `notBlockedEither`, `notTradeSanctioned(partner)` (design D1). Verify: `bun run lint --filter=@repo/api` and `bun run typecheck --filter=@repo/api` pass.
- [x] 1.2 Export `listedCte` from `packages/api/src/services/trade-feed/query.ts` (the `listed` set now inline in `trade-matches/candidates.ts`) (design D2). Verify: lint + typecheck for `@repo/api` pass.
- [x] 1.3 Switch `trade-matches/candidates.ts` `partner_lists` to `listedCte` and `tradePartnerSql(userId, l.user_id)`, with no change in results. Verify: `bun test` in `packages/api` passes, lint + typecheck + `bun run build --filter=web` pass, and For you for one signed-in account shows the same people and counts before and after (read path, exercised for real).

## 2. Alerts use the shared rules

- [x] 2.1 Confirm the worker-safe import chain: list every module `trade-feed/query.ts` and `trade-lists.ts` import, transitively, inside `packages/api`, and check none is `env.ts` or `services/redis`. Verify: the list is reported in the apply summary, and none is present.
- [x] 2.2 In `apps/worker/src/job/want-alerts/pairs.ts`, add `WITH ${postsCte}, ${listedCte}`, filter `cand` with `l.id IN (SELECT id FROM listed)`, and replace the pair-level `notBlockedEither` / partner `notTradeSanctioned` with `tradePartnerSql(recipient, partner)` for each direction. Keep `notTradeSanctioned(recipient)`. Verify: `bun run lint --filter=worker` and `bun run typecheck --filter=worker` pass.
- [x] 2.3 Remove the hidden check from `context.ts` (`hiddenRows`) and `want-alert-match.ts` (`AlertInput.hidden`, `hiddenKey`), and update `want-alert-match.test.ts`: drop the two hidden tests, which now live in SQL. Verify: `bun test` in `apps/worker` passes, plus lint + typecheck for `worker`.

## 3. 24-hour ownership re-check

- [x] 3.1 In `apps/worker/src/lib/want-alert-state.ts`, add `recheck?: [number, number][]` to `State`, accept it as missing or as a valid array in `parseState`, and add a pure `nextRecheck(previous, unownedIds, nowMs)`: keep the earliest `firstSeenMs` for each id, drop entries older than 24 hours, cap at 20,000 dropping the oldest, and return the dropped count (design D3, D4). Test it in `want-alert-state.test.ts`: merge, age-out at exactly 24 hours, cap order, and an old row without `recheck` parsing. Verify: `bun test` in `apps/worker` passes, plus lint + typecheck.
- [x] 3.2 Make `selectAlerts` return `{ alerts, unowned }`, where `unowned` is the pairs failing only on the ownership verdict with the recipient's pref on. Cover forward and reverse in `want-alert-match.test.ts`, including that a pref switched off or a wanter holding a copy never lands in `unowned`. Verify: `bun test` in `apps/worker` passes, plus lint + typecheck.
- [x] 3.3 In `job/want-alerts/index.ts`, read `fetchPairs(e.id = ANY(recheck ids))` into the run's pairs, map `unowned` to entry ids, store `nextRecheck(...)` in the next `State`, add `rechecked` to the heartbeat, and log one `warn` when the cap dropped any. Verify: lint + typecheck + `bun run build --filter=worker` pass, and a local worker against the local database (`.env.local`) runs `want-alerts` twice with no error and keeps a `recheck` key in `worker_progress.state` (read-only check of the row, no test data written without approval). Done: a dry run with recheck on the local database, then two real runs (first set the cursor, second saved `recheck: []` and parsed it back).

## 4. Docs and checks

- [x] 4.1 Update `apps/worker/AGENTS.md` "Want alerts" with the `recheck` list (24 hours, the cap, kept in `State` beside the cursor) and that the partner filter comes from `@repo/api` `tradePartnerSql` / `listedCte`. Add one line to `packages/api/AGENTS.md` saying that For you and want alerts share those two, so a partner rule changes there. Verify: both files read correctly, and no other package's conventions changed (state that in the summary).
- [x] 4.2 Run `bun run check` and `bun run build --filter=web --filter=worker`. Verify: all pass, and `openspec validate alert-matching-follows-trade --strict` reports valid.

## Workflow follow-up

- `/opsx:archive alert-matching-follows-trade` once applied and checked.
- The nudge (the API publishes after a list save, and the worker starts `want-alerts` early) is a separate change with no spec delta.

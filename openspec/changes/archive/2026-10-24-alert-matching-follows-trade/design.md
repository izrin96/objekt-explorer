# Design

## Context

For you builds its candidates in `packages/api/src/services/trade-matches/candidates.ts`. The partner side is the `partner_lists` CTE:
- discoverable and on Trade (`takesPartInTradeSql`)
- in `listed`, the set of not-idle lists derived from `postsCte` / `listedPost` in `services/trade-feed/query.ts`, where a have list and its linked want list share one freshness
- not hidden by the viewer, `notBlockedEither`, `notTradeSanctioned`

The worker's `want-alerts` builds pairs in `apps/worker/src/job/want-alerts/pairs.ts` with its own `cand` CTE (discoverable and on Trade only), then applies the following in JS (`apps/worker/src/lib/want-alert-match.ts` `selectAlerts`):
- the recipient's hidden list (loaded in `context.ts`)
- prefs
- the ownership verdict (`collectionVerdict`)
- the "wanter holds a copy" skip

Alerts and their progress (`cursor` + `State` in `worker_progress`) commit together in `recordRun`. An entry's pairs are read once past the cursor, plus a 10-minute overlap re-read, so a pair that fails ownership is never seen again.

The worker may import from `@repo/api` only modules whose import chain stays clear of `env.ts` (see `apps/worker/AGENTS.md`). `trade-feed/query.ts` imports `@repo/db`, `drizzle-orm`, `lib/trade-feed`, `lib/trade-rank`, `schemas/*`, `safety` and `trade-lists`, none of which reach `env.ts`.

## Goals / Non-Goals

**Goals:**
- One source of truth for "which of another account's lists take part", used by For you and alerts.
- An ownership failure that is only waiting on a transfer gets 24 hours of re-checks.

**Non-Goals:**
- Changing For you's results. Its switch to the shared pieces is a pure refactor.
- Moving prefs, the "already own a copy" skip or the ownership verdict into SQL. They stay alert-only JS, already covered by `want-alert-match.test.ts`.

## Decisions

**D1. A shared partner predicate in `trade-lists.ts`.** `tradePartnerSql(viewer, partner)` (both `SQL | string`) bundles three checks: not hidden by `viewer`, `notBlockedEither(viewer, partner)` and `notTradeSanctioned(partner)`.
- For you's `partner_lists` uses it with `viewer = userId` and `partner = l.user_id`.
- `pairs.ts` uses it on each pair with the recipient as viewer and the lister of the new entry as partner. Forward: viewer is `want_user_id` and partner is `offer_user_id`. Reverse: viewer is `offer_user_id` and partner is `want_user_id`.
- Alerts keep `notTradeSanctioned(recipient)` on top, as the spec already requires.
- The hidden check leaves `context.ts` and `selectAlerts`: `AlertInput.hidden` and `hiddenKey` go.
- Alternative: keep the hidden check in JS and share only SQL fragments. Rejected, because the two sides would keep differing in where the rule lives.

**D2. The not-idle rule comes from `listed`, shared as a CTE.** `trade-feed/query.ts` exports `listedCte` (today's `listed` CTE from `candidates.ts`, built on `postsCte` + `listedPost`). Both `candidates.ts` and `pairs.ts` write `WITH ${postsCte}, ${listedCte}` and filter the partner list with `l.id IN (SELECT id FROM listed)`.
- In `pairs.ts` that filter applies to `cand`, the new entry's list, which is always the partner's.
- The recipient's own list keeps no idle filter, matching For you, where the viewer's own lists count whether listed or not.
- Alternative: a per-list `listedSql(alias)` predicate. Rejected, because it re-derives the have/want pairing that `postsCte` owns, which is a second copy that can drift.
- Cost: `postsCte` reads every discoverable trade list once per run, every 5 minutes. That is the same read For you makes on every uncached request.

**D3. A 24-hour re-check list in the run's `State`.** `State` gains `recheck?: [entryId, firstSeenMs][]`.
- `selectAlerts` returns `{ alerts, unowned }`. `unowned` holds the pairs whose only failing check was the ownership verdict (`not_owned` / `not_transferable`), after the recipient's pref is known to be on, so a type that's switched off never queues.
- `index.ts` maps those pairs to entry ids through `Pair.entryId`. An id already in `recheck` keeps its `firstSeenMs`.
- Each run also calls `fetchPairs(sql\`e.id = ANY(<recheck ids>)\`, "entry", null)` and adds the result to `pairs`.
- The next `recheck` keeps the ids that are still `unowned` and younger than 24 hours. An entry that was deleted, alerted, or left the shared filter yields no `unowned` pair and drops out.
- `want_alert_sent` still dedupes, so a re-read pair that already alerted (for example, another want list on a reverse entry) never repeats.
- Cap: 20,000 ids, oldest dropped first, with a `warn` per run that drops any, following worker logging rules.
- Why `State` and not a table: it commits in the same transaction as the cursor and alerts, so the cache-loss, crash and overlap guarantees carry over unchanged, with no migration for data that lives 24 hours.
- Alternatives:
  - Widen the overlap re-read to 24 hours. Rejected, because it re-pairs a day of entries every 5 minutes.
  - A `want_alert_pending` table. Rejected, because it needs a migration for short-lived data.
  - The entry's `created_at` as the clock. Rejected, because entries of a newly discoverable list can be months old.

**D4. Pure logic stays pure and tested.** The `recheck` bookkeeping (merge, age out, cap) is a function in `want-alert-state.ts` beside `keepMarks`. `parseState` accepts a missing `recheck`, so the first deploy reads old rows without stalling. `selectAlerts`'s new `unowned` output and the removed hidden input are covered in `want-alert-match.test.ts`.

## Risks / Trade-offs

- [The worker crashes on start if the `trade-feed/query.ts` chain ever reaches `env.ts`] → The task greps the chain and boots the worker locally. A test-free guard is the worker's own start.
- [A re-check list that keeps hitting the cap during a mass listing of unowned objekts] → The oldest are dropped with a `warn`, and those entries simply don't alert, the same as today's behaviour.
- [The `listed` filter changes no alert today, since an edit or turn-on refreshes the list] → This is accepted. Its value is that a future idle rule change reaches alerts too.
- [Moving the hidden check into SQL could change results if the JS and SQL disagreed] → Both read `hidden_trade_partner` with recipient → partner. The For you query already uses the same shape.

## Migration Plan

No schema or data migration. Deploy the worker and web together, though either order is safe: For you's refactor doesn't change results, and the old worker ignores no new column. On rollback, an old worker reads a `State` with an extra `recheck` key, which `parseState` passes through untouched.

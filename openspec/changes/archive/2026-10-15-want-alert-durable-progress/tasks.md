`@repo/db` and `@repo/api` have no build script, so for them "build" is `bun run build --filter=web`, which bundles both. The worker's is `bun run build --filter=worker`.

## 1. Schema and migration (held for approval)

Never run `db:migrate` or `db:push`: the user reviews and applies the migration.

- [x] 1.1 Add `workerProgress` to `packages/db/src/schema.ts` as in design decision 1:
  - `name` text primary key;
  - `cursor` as `bigint` with `{ mode: "number" }`;
  - `state` as `jsonb`, with no `$type`;
  - `updatedAt` as a `timestamp` with `{ mode: "string", withTimezone: true }`, not null, `defaultNow()`.

  Run `bun run --filter=@repo/db db:generate`, then verify:
  - the generated `migration.sql` only creates `worker_progress`;
  - lint and typecheck pass for `@repo/db`;
  - `bun run build --filter=web` passes.

  Then stop and ask the user to apply it before anything is deployed.

## 2. Floor and marks (pure)

- [x] 2.1 In `apps/worker/src/lib/want-alert-state.ts`:
  - move `OVERLAP_MS` here, and add `MARK_SPACING_MS`;
  - add `overlapFloor(marks, cursor)` and `keepMarks(marks, mark)`, as in design decision 4;
  - change `parseState` to take a parsed value (`unknown`), and also check that `marks` holds number pairs.

  Update `want-alert-state.test.ts` to cover:
  - a 5-minute cadence: the floor is the mark at least 10 minutes before the previous run, so an entry assigned 9 minutes before the previous run and committed after it is above the floor;
  - a 1-hour gap: the floor comes from marks at or before the last run before the gap minus 10 minutes, not from the newest mark;
  - a 15-run crash loop 10 s apart after normal runs: `keepMarks` keeps the anchor, the list stays at 11 or fewer, and the floor's mark is at least 10 minutes older than the newest;
  - a single mark (just after a first run): the floor is that mark's id, capped at `cursor`;
  - `parseState` rejects a non-object, missing arrays, and malformed marks.

  Verify `bun test apps/worker/src/lib/want-alert-state.test.ts` passes, and lint, typecheck and build pass for `worker`.

## 3. Progress in the database

- [x] 3.1 Add `apps/worker/src/job/want-alerts/progress.ts` (design decision 3):
  - `loadProgress(maxId)` returns one of: `{ kind: "row", cursor, state }`, `{ kind: "seed", cursor, state }`, `{ kind: "first" }` or `{ kind: "unreadable" }`;
  - the seed path reads `alerts:cursor` and `alerts:state` with `redis.get` only, and applies the `max(id)` guard to the cursor and every mark;
  - `saveProgress(tx, cursor, state, { first })` upserts the `want-alerts` row with `updated_at = now()`, or, for a first run, inserts it with `ON CONFLICT DO NOTHING`.

  Verify lint, typecheck and build pass for `worker`.
- [x] 3.2 Rename `recordAlerts` in `record.ts` to `recordRun(alerts, now, progress)` (design decision 2). It always opens the transaction and takes the advisory lock, skips the inserts when `alerts` is empty, and calls `saveProgress` last. Then change `index.ts`:
  - `loadProgress` replaces the Valkey reads, `CURSOR_KEY`, `STATE_KEY` and the `redis.del`;
  - `unreadable` logs an error and returns without writing;
  - `first` writes through `recordRun([], …)`;
  - the floor comes from `overlapFloor`, and the new marks from `keepMarks`;
  - `recordRun` is called every run, and `publishUsers` after it;
  - the log line adds `behind` and `since last run` (design decision 5), and says when the run seeded from Valkey.

  Verify:
  - lint, typecheck, `bun test` and build pass for `worker`;
  - read-only: the `max(id)` query and the seed guard's inputs (`GET alerts:cursor` and `GET alerts:state` on the production Valkey) show that production would seed rather than start over.

## 4. Realtime retry

- [x] 4.1 In `packages/api/src/lib/realtime-requests.ts`, give `publishRequest`, `broadcastRequest`, `batchRequest` and `activityRequest` an `idempotency_key` on each publication, as in design decision 6: one key per request, plus the index for each batch command. Extend `realtime-requests.test.ts`: each publication has a key, and a batch's commands each have distinct keys. Verify `bun test packages/api/src/lib/realtime-requests.test.ts` passes, lint and typecheck pass for `@repo/api`, and `bun run build --filter=web` passes.
- [x] 4.2 In `packages/api/src/realtime.ts`, make `call()` send the same request body a second time, once, on a thrown error (including the timeout) or a 5xx. A 4xx or an `error` in the reply is logged once and not retried. Keep the doc comment's "logged and dropped" rule for the second failure. Verify lint and typecheck pass for `@repo/api`, `bun run build --filter=web` passes, and the worker's build passes.

## 5. Verify

- [x] 5.1 Run `bun run check`, `bun run build --filter=worker` and `bun run build --filter=web`, and verify all pass. Don't start the worker locally: it also refreshes the shared Cosmo token and writes to the indexer. The first deploy's log is the end-to-end check (Migration Plan step 3), and the user reads it.

## 6. AGENTS.md

- [x] 6.1 Add a "Want alerts" section to `apps/worker/AGENTS.md`:
  - progress lives in the `worker_progress` row `want-alerts` and is saved in the same transaction as the alerts;
  - a worker reads and writes progress only in the database it alerts on; Valkey's `alerts:*` keys are only a one-time seed;
  - the floor rule: anchor on the previous run's mark minus 10 minutes, keep marks by age with spacing, and never cut the anchor.

  State that the root, `packages/db` and `packages/api` `AGENTS.md` are unchanged. Verify lint and typecheck pass for `worker`.

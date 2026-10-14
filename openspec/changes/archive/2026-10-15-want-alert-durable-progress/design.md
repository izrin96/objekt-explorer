## Context

See proposal.md for why. Current state (`apps/worker/src/job/want-alerts/index.ts` unless named):
- **Progress lives in Valkey.** `alerts:cursor` is the highest entry id read. `alerts:state` is JSON `State` (`lib/want-alert-state.ts`): `discoverable`, `marks` (`[nowMs, max(id)]` per run) and `progress` (newly discoverable lists not yet read to the end). `saveProgress` writes both keys after `recordAlerts` has committed and after `publishUsers`.
- **A missing key is a first run** (lines 42–49). The worker saves `max(id)` as the cursor, marks every discoverable list known, and returns. If the progress can't be read, it deletes the cursor (lines 53–56), so the next run is a first run too.
- **Where Valkey runs.** Compose's `valkey` service has no volume, and the `valkey/valkey` image declares none. A recreated container (a `:latest` pull, `down`, `--force-recreate`) therefore starts empty. A plain restart probably reloads the last snapshot. That rolls progress back, which is safe: the worker re-reads, and `want_alert_sent` drops the repeats.
- **Shared Valkey.** The worker's `dev` script loads the root `.env` (production `REDIS_URL`), then `.env.local`, which usually overrides only `DATABASE_URL`. `sendWantAlerts` isn't gated by `WORKER_INDEXER_WRITES`. A local run reads production's cursor and writes back its own `discoverable` and a mark holding the local `max(id)`. Ten minutes later production's floor drops to that id:
  - the overlap read has no limit, so it re-reads almost all of `list_entries`;
  - production's lists all look newly discoverable and are read whole;
  - old entries never alerted on start alerting.
- **The floor** (lines 67–70) is the newest mark at or before `now − 10 min`. Take an entry whose id was assigned at `t_a` and whose transaction committed at `t_c`, missed by the run just before `t_c`. The next run skips it once `t_a` falls before that floor. With runs 5 minutes apart, that leaves `t_c − t_a > 10 − 5 = 5` minutes, so the guaranteed window is 5 minutes, not 10. After a gap `G` it is `10 − G`, so after an outage longer than 10 minutes, entries still in flight at the last run before it are skipped.
- **Marks** are kept as the last 12 (`MARK_LIMIT`, line 112). Twelve runs within 10 minutes, as in a crash loop (every worker start runs the job, `src/index.ts:105`), leave no mark 10 minutes old. The fallback `marks[0]` is then too new.
- **The transaction.** `recordAlerts` (`record.ts`) is the only transaction. It takes `pg_advisory_xact_lock(hashtext('want-alerts'))`, and runs only when there are alerts (line 105).
- **Realtime.** `call()` (`packages/api/src/realtime.ts`) makes one attempt with a 1.5 s timeout, then logs any failure and drops it. The web turns polling off while the live connection is open (`pollUnlessLive`), so a dropped `notifications_changed` leaves the bell stale until the window regains focus. Router callers await the publish (`routers/notifications.ts`, `chat.ts`).
- **No key/value table exists** in `schema.ts`. Other worker state in Valkey (rarity cache, verifier heads, image lock) is a cache or a lock, not progress.

## Goals / Non-Goals

**Goals:**
- Alerts and the progress that produced them commit together.
- Progress lives with the database it describes, so it can't be shared across databases.
- Any entry whose transaction commits within 10 minutes of its id being assigned is read, whatever the gap between runs.

**Non-Goals:**
- Exactly-once realtime delivery beyond Centrifugo's idempotency window.
- Locking out overlapping runs.

## Decisions

1. **A `worker_progress` table.**
   - Columns: `name text PRIMARY KEY`, `cursor bigint NOT NULL`, `state jsonb NOT NULL`, `updated_at timestamptz NOT NULL DEFAULT now()`.
   - The want-alert job uses the row `name = 'want-alerts'`.
   - No `$type` on `state`, because `@repo/db` must not import worker types. The worker validates the value with `parseState`.
   - The migration is expand only and generated with `db:generate`. The code still on `main` never reads the table.
   - **Not chosen:** a key/value table typed `text`. A cursor and a state are all any job needs, and typed columns keep the cursor out of JSON.
   - **Not chosen:** keeping Valkey and adding AOF or a volume. That fixes loss, but not sharing across databases, and leaves progress outside the alert transaction.

2. **One transaction per run** (`record.ts`, `recordRun(alerts, now, progress)`). Every run, the first run included, opens a transaction that:
   1. takes the existing advisory lock;
   2. inserts alerts as today, skipping the insert when there are none;
   3. upserts the progress row and sets `updated_at = now()`. A first run inserts with `ON CONFLICT DO NOTHING` instead, so a first run that loses a race never overwrites a seeded row with the current `max(id)`.

   `publishUsers` runs after the commit, as it does today. A crash before the commit loses nothing: the next run reads the same entries again.

3. **Loading progress** (`job/want-alerts/progress.ts`).
   - **Row present.** Run `parseState` on `state` and check `cursor`. If either is unreadable, log an error and return without writing. The job stalls loudly instead of starting over.
   - **Row missing.** Read `alerts:cursor` and `alerts:state` once.
     - Use them as the seed only if they parse and neither the cursor nor any mark's id is above this database's `max(id)`. Above it, the keys belong to a bigger database: the production Valkey seen from a local database.
     - With a seed, the run goes on normally, and its transaction inserts the row.
     - With no seed, the run is a first run, as today, but written through decision 2.
     - Log which case applied.
   - The worker never writes or deletes the Valkey keys again. `parseState` takes a parsed value. The seed path calls `JSON.parse` first.

4. **The floor anchors on the previous run** (`lib/want-alert-state.ts`, pure).
   - **`overlapFloor(marks, cursor)`.** Let `anchorAt` be the newest stored mark's time minus `OVERLAP_MS`. The floor is the id of the newest mark at or before `anchorAt`, else the oldest mark's id (only just after a first run), capped at `cursor`.
     - Proof sketch: suppose the run after run `k` misses an entry `x` that run `k` read too early. Then `x ≤ floor`, so `x`'s id was assigned before a mark at or before `t_k − 10 min`. And `x` committed after `t_k`. So `t_c − t_a > 10` minutes, whatever the gap.
   - **`keepMarks(marks, mark)`.**
     - Append `mark` only when the newest kept mark is at least `MARK_SPACING_MS` (1 minute) older. Otherwise keep the older mark: the floor only gets lower, which is safe.
     - Then drop every mark older than the anchor, the newest mark at or before `newest − OVERLAP_MS`.
     - Spacing bounds the list at 11 (at most 10 marks within the last 10 minutes, plus the anchor), with no cap that could cut the anchor. `MARK_LIMIT` goes.
   - **Not chosen:** a cap that slices off the oldest marks. A crash loop then drops the anchor, the G4 failure.

5. **The log line** gains `behind <maxId − nextCursor>` and `since last run <minutes>` (`nowMs` minus the newest stored mark), so a stall or a backlog shows in the log.

6. **Realtime retry with idempotency keys.**
   - `lib/realtime-requests.ts` gives every publication its own `idempotency_key`: one `crypto.randomUUID()` per request, plus the command's index inside a batch. Centrifugo matches keys per channel and drops a repeat within 5 minutes. A batch can put several publications on one channel (every activity item goes to `ACTIVITY_CHANNEL`), so one shared key would drop all but the first. A broadcast's single key is fine, because each channel gets one publication. The request, and so the keys, is built once per `call` and sent unchanged on the retry.
   - `call()` retries once, immediately, on a network error, a timeout or a 5xx. It doesn't retry on a 4xx or an `error` in the reply.
   - `disconnect` has no key. Repeating it is harmless.
   - The live feed already ignores duplicate transfer ids, and the key makes duplicates rare anyway.
   - **Not chosen:** polling while connected. It costs every open tab a request a minute, to cover a failure the retry now mostly absorbs.

## Risks / Trade-offs

- **[Overlapping runs.]** During a deploy two workers can run at once, and the last writer wins. Under the advisory lock, the later run finds its alerts already sent, so its progress row is at most a run behind. It re-reads, and nothing is skipped. → Accepted; no extra lock.
- **[Seed from a database that isn't production.]** A staging database cloned from production can pass the `max(id)` guard against production's keys, but staging uses its own Valkey. → Accepted; the first-run fallback is the same as today.
- **[A stalled job on bad state.]** Alerts stop until someone fixes the row. → The error repeats every 5 minutes; better than a silent skip.
- **[A retry slows a request.]** A failing awaited publish now costs up to 3 s instead of 1.5 s. → Only while Centrifugo is failing.

## Migration Plan

1. Apply the generated migration (the user does this) before deploying.
2. Before deploying, the user checks that `alerts:cursor` exists with a read-only `GET`. The same deploy must not recreate the `valkey` container.
3. Deploy. The first run logs that it seeded from Valkey, then writes the row.
4. Rollback: the code on `main` still reads the Valkey keys, which this change no longer updates. Their marks are all older than 10 minutes, so its floor equals the stale cursor and the overlap read is empty. It catches up from the cutover cursor, 5,000 entries a run, and `want_alert_sent` drops the repeats. The cost is catch-up time.
5. Later, once the row exists in production: a follow-up change removes the seed path, and the user deletes the two keys.

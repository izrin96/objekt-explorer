# Tasks

## How every task is checked

- **Package checks.** A task ends with `bun run lint`, `bun run typecheck` and `bun run build` passing for each package it touches (`--filter=@repo/cosmo`, `worker` or `web`). `@repo/cosmo` has no build script, so a task touching it also builds `worker`.
- **Tests.** They cover pure modules only, run with `bun test` beside the code, and never touch the database, Redis or Cosmo. Fixtures use made-up session ids and times.
- **Cosmo and production.** No task sends a request to Cosmo or writes to production. The touch call and the phase are verified up to the request boundary: the debug log of what would be sent, with a stubbed `touchSession`. They are recorded as "read-only verified". Seeding a local `cosmo_session` row needs the owner's approval first, and never carries a real cookie.
- **Owner steps.** Tasks marked **(owner)** deploy, change the VPS `.env`, reconnect an account or read production. Only the owner runs them.
- **Wording.** "Decision N" means this change's design.md, Decisions, section N. Names follow Cosmo's terms for sessions (signed out, sign-in), never the words of Objekt Tracker's own lock feature. Only the `collection-media` job lock is called a lock.

## 1. Cosmo client: the touch call

- [x] 1.1 In `packages/cosmo/src/server/session.ts`, add `touchSession(cookie)` (Decision 4):
  - `GET /bff/v4/users/me` on `cosmoSessionApi`, with `sessionCookieHeader(cookie)` and `responseType: "text"`, inside `guard(true, …)`;
  - it returns `void` and never reads or parses the body;
  - a doc line says it reads only the status.

  In `packages/cosmo/README.md`, QR sign-in and sessions, add `touchSession` to the bullet listing `fetchSessionUser`.

  Check that `session-parse.test.ts` covers `errorKindOf(401, '{"error":…}', true)` given as a string (a text body). If it does not, add that case and a non-JSON text 403 (`unavailable`). `bun test packages/cosmo` passes. Lint and typecheck pass for `@repo/cosmo`; build passes for `worker`.

## 2. Pure rules (`apps/worker/src/lib/media-sync.ts`)

- [x] 2.1 Add to `lib/media-sync.ts` (Decisions 2, 3, 6, 8), reusing the file's `hashId`:
  - `keepAliveAgeMs(id)`: `25 min − (hashId(id) % 6) min`, so 20 to 25 minutes.
  - `lastUseOf({ lastUsedAt, createdAt })`: the later of the two, with a null `lastUsedAt` giving `createdAt`. Times are epoch ms.
  - `KEEPALIVE_SLICE = 20` and `KEEPALIVE_BACKOFF_SLICE = 5`.
  - `planKeepAlive(sessions, now)`: from rows `{ id, lastUsedAt, createdAt, cookieExpiresAt }`, it drops rows at or past `cookieExpiresAt` and rows younger than their own age. It returns the rest as `{ id, idleMs }[]`, ordered by last use ascending, then id. The phase, not the planner, applies the slice, since the slice counts requests sent (Decision 3).
  - `endedWhileKept(lastUse, now)`: true when `now − lastUse < 45 min`.
  - `keepAliveSwitch(raw)`: `{ on, unknown }`, trimmed and lowercased. `on` gives on. `undefined`, `""` and `off` give off. Anything else gives off with `unknown: true`.

  `media-sync.test.ts` adds:
  - the age range over ids 1 to 1,000, all within 20 to 25 minutes, and stable for one id;
  - `lastUseOf` with a null `lastUsedAt`, an older one (a reconnected row) and a newer one;
  - `planKeepAlive` with a session one second short of its age (left out) and one at it (kept);
  - an expired session (left out);
  - 25 due sessions in touch order (longest unused first, ties by id) with their idle times;
  - an empty input;
  - `endedWhileKept` at 44:59 and at 45:00;
  - `keepAliveSwitch` for unset, `""`, `"on"`, `" ON "`, `"off"` and `"yes"`.

  `bun test apps/worker` passes. Lint, typecheck and build pass for `worker`.

## 3. Worker: last use stamped on success

- [x] 3.1 In `job/collection-media.ts`, `syncSession` (Decision 2):
  - The pre-request update sets only `lastAttemptAt`. It still returns the id, so the "reconnected since read" check stays.
  - The update after `fetchSessionUser` answers sets `cosmoNickname` and `lastUsedAt` (the answer time) together, through `ownRow`.

  Read the diff:
  - no other writer of `last_used_at` exists (`grep -rn lastUsedAt apps packages --include='*.ts'`);
  - a failed `users/me` leaves `last_used_at` unchanged.

  Lint, typecheck and build pass for `worker`.

## 4. Worker: the keep-alive phase

- [x] 4.1 In `job/collection-media.ts`, add `keepAlivePhase(run, sessionKey, backingOff)` and wire it into `runSyncOnce` (Decisions 1, 3 to 6, 8, 10):
  - Read the switch once per process with `keepAliveSwitch(process.env.COSMO_SESSION_KEEPALIVE)`, next to `writeModes`. An unknown value logs one `warn` per process. With the switch off, the phase returns before any query.
  - **Selection** (Decision 3): read the query of Decision 3 (limit 200), with the columns `planKeepAlive` and the cookie opening need (`id`, `userId`, `cosmoAddress`, `cookieSealed`, `lastUsedAt`, `createdAt`, `cookieExpiresAt` as epoch ms, as `dueSessions` does). Walk `planKeepAlive`'s list until `KEEPALIVE_SLICE` requests are sent (`KEEPALIVE_BACKOFF_SLICE` while `backingOff`); a session whose cookie does not open costs no place. The sessions not reached are `capped`. Add `capped`, and the largest idle time among the touched in minutes (through `mediaBeat.max`), to the heartbeat. Log one `warn` with the count when `capped > 0` and not backing off.
  - **Per session**:
    - Open the cookie as `syncSession` does. A failure counts `keepalive key_unreadable` and writes nothing.
    - Stop when `!run.budget.canRequest()`.
    - Then `pace(run)`, then `touchSession(cookie)`.
  - **Outcomes** follow Decision 4's table, with every write through `ownRow`:
    - **2xx:** set `lastUsedAt` to the answer time. Set `run.cosmoAnswered` only when not backing off.
    - **`dead`:** set `run.cosmoAnswered` when not backing off, call `markDead(run, session, "session_dead", now)`, and record the lifetime (`now − createdAt`, in hours) as kept or idle by `endedWhileKept`, in a run list without ids.
    - **`busy` or `unavailable` with `!run.cosmoAnswered` and not backing off:** set `run.cosmoDown` and stop the phase.
    - **Any other failure:** count `keepalive failed <kind>`, write nothing, and go on. While backing off, stop at the first non-`dead` failure.
  - **Wiring**: `keepAlivePhase` runs before the sync in both cases. `syncPhase` runs only when `!backingOff && !run.cosmoDown`. The backoff write and clear after it stay as they are, so a touch during a backoff neither clears nor extends it (Decision 5).
  - **Logs** (Decision 10):
    - The `info` summary's condition already includes `run.markedDead`. When touches marked sessions dead, it gains `keep-alive ended: kept <h>, …; idle <n>`.
    - One `warn` when touches marked more than 5 sessions dead in the run.
    - Per-session lines are `debug` with the session id and error kind only.
  - **Failure isolation:** the phase sits in its own try/catch. Our own error logs one `warn` with `errorCode(error)`, and the sync and apply phases still run.

  Read-only verified, with the owner's approval for one seeded local `cosmo_session` row (made-up address, a cookie sealed under a local test key, `last_used_at` 30 minutes ago):
  - With `COSMO_SESSION_KEEPALIVE=on`, `WORKER_LOG_LEVEL=debug` and `touchSession` stubbed to resolve, one run stamps the row's `last_used_at` and logs the touch at `debug`.
  - Stubbed to throw `new CosmoSessionError("dead", 401)`, the row is marked dead and the summary shows `kept` or `idle`.
  - Stubbed to throw `unavailable` as the first request, no sync runs and the backoff key is written.
  - With the switch unset, no query reads the row for keep-alive.

  No request reaches Cosmo. Remove the seeded row afterwards. `import-boundary.test.ts` passes. Lint, typecheck and build pass for `worker`.
- [x] 4.2 Add `COSMO_SESSION_KEEPALIVE` to the `worker` service's `environment` list in `docker-compose.yml` (not `web`). In `.env.example`, add `COSMO_SESSION_KEEPALIVE=` beside `COSMO_SESSION_KEY`, with a comment: `on` touches live sessions about every 25 minutes so Cosmo keeps them; empty is off; read by the worker only. `docker compose config` exits 0, and its `worker` service lists the variable. No package code changes, so no package check applies; task 4.1's checks cover the code that reads it.

## 5. Web: consent clause

- [x] 5.1 Replace `cosmo_session_stored` in `apps/web/messages/en.json`, `ko.json` and `ja.json` with Decision 9's text. No other key changes, and no `.tsx` changes. Tell the owner the ko and ja texts are drafts for review. On the local dev server, `/account/collection-data` shows the new line in each locale. Lint, typecheck and build pass for `web`.

## 6. Review and rollout

- [x] 6.1 Before the deploy, run `/code-review` and the `security-auditor` agent on the branch, against:
  - Decision 1 (one job, one budget, no second lock);
  - Decision 2 (last use only after an answer; the age never above 25 minutes);
  - Decision 3 (the slice inside the run budget; syncs keep 30);
  - Decision 4 (no body read; no write but `last_used_at` or `markDead`; no `last_error` or park from a touch);
  - Decision 5 (backoff neither cleared nor extended by touches);
  - Decision 10 (no nickname, address or cookie in any log line, and no new `error` line);
  - wording (`grep -rniwE 'lock|unlock|locked'` over the diff finds only the job lock).

  Fix what they find, or record why not in design.md, Risks. Lint, typecheck and build pass for every package the fixes touch.
  - *Run 2026-11-20, after the deploy (the code was already live), on the code as split by a4652e1a: every decision holds. Security audit: no high or medium finding. Code review: one medium finding, fixed the same day (the dead count no longer resets on a non-dead answer; the guard's test now covers a busy and a refused answer between dead ones). The low findings and notes are recorded in design.md, Risks, Review findings. Worker lint, typecheck, test and build pass.*
- [x] 6.2 **(owner)** Deploy the worker and web with `COSMO_SESSION_KEEPALIVE` unset (Migration Plan 1). Then:
  - set `COSMO_SESSION_KEEPALIVE=on` in the root `.env` and restart the worker;
  - reconnect the owner's Cosmo account.

  Check:
  - the worker logs no unknown-value `warn`;
  - within 10 minutes, the reconnected session's first sync succeeds: `last_synced_at` is set, and `last_used_at` lies between the reconnect and `last_synced_at`.
  - *Done by 2026-11-20: the worker runs with `COSMO_SESSION_KEEPALIVE=on`, and the first keep-alive deaths logged from 2026-11-19 06:25. The owner's session was not reconnected after the deploy; it predates it (connected 2026-11-17 20:29) and keep-alive has kept it alive since.*
- [ ] 6.3 **(owner)** After 24 hours, check read-only (`PGOPTIONS='-c default_transaction_read_only=on'`) on the owner's own `cosmo_session` row (filter by the owner's user id): `dead_at is null`, `last_error is null`, and `now() - last_used_at` under 36 minutes (Decision 2's worst case).
  - In the worker logs (`collection-media` heartbeat lines), the `keepalive touched` counts for the 24 hours sum to about 58 per live session, `keepalive idle_max_min` stays at or below 38, and no `keepalive capped` appears.
  - After the first scheduled sync (72 to 78 hours after the reconnect), `last_synced_at` has moved past the connect and the row is still live.
  - Record the result in design.md, Open Questions (the `users/me` question).
  - *Interim 2026-11-20 02:20 UTC, read-only: the owner's row is live, `last_error` null, last use 20 min ago, 53.7 h after connect. Heartbeat for 64 min: `keepalive touched 28` across 12 live sessions (about 2.2 an hour each, about 52 a day), `idle_max_min 30`, no `keepalive capped`. Still to check: the first scheduled sync, due 72 to 78 hours after connect (2026-11-20 20:29 to 2026-11-21 02:29 UTC).*
- [ ] 6.4 **(owner)** A week after 6.2, read the `info` lines with `keep-alive ended:` and run Decision 8's query read-only. Record in design.md, Open Questions:
  - the `kept` lifetimes, and whether they cluster at one value (the absolute lifetime);
  - the `idle` count;
  - whether keep-alive stays on.
  - *Interim 2026-11-20, Decision 8's query from 2026-11-18: seven `session_dead` rows, all ended while kept (25 to 30 min idle), lived 0.5, 2.7, 18.9, 20.1, 23.5, 36.8 and 40.6 h. Scattered so far, so no single absolute lifetime yet; no idle deaths. Due 2026-11-25.*

## 7. Docs

- [x] 7.1 Update the agent docs:
  - **`apps/worker/AGENTS.md`**, Collection media:
    - a **Keep-alive** bullet before **Sync**: the phase runs first in every run when `COSMO_SESSION_KEEPALIVE=on`;
    - the age of 20 to 25 minutes, from `greatest(last_used_at, created_at)`;
    - 20 touches a run inside the 50-request budget, and 5 during a backoff, stopping at the first failure and leaving the backoff alone;
    - `users/me` with no body read;
    - `dead` marks as the sync does, and any other failure writes nothing;
    - the lifetime clause in the summary.
    - The **Sync** bullet says `last_used_at` is stamped only after Cosmo answers.
  - **`packages/db/AGENTS.md`**, Cosmo sessions: one sentence that `last_used_at` is the last successful Cosmo answer to the session, written only by the worker, and that the keep-alive reads it with `created_at`.
  - **Root `AGENTS.md`**, Environment: `COSMO_SESSION_KEEPALIVE`, `on` or off, worker only, read once per start, pointing to `apps/worker/AGENTS.md` (Collection media).
  - **`packages/cosmo/README.md`**: done in 1.1.
  - `packages/api/AGENTS.md` and `apps/web/AGENTS.md` need no change (no API or component change); say so in the summary.

  `bun run check` and `bun run build` pass at the root, and `bun run format` leaves no diff.

## Workflow follow-up

- Archive `cosmo-qr-collection-media` before this change. This change's `web-cosmo-session` delta adds a requirement to the capability that change creates.
- Archive this change with `/opsx:archive` once 6.3 is done; 6.4's findings go in design.md either way.
- A follow-up, only if 6.4 finds a short absolute lifetime: weigh whether keep-alive is worth its requests, and whether the Renew notice should come sooner.

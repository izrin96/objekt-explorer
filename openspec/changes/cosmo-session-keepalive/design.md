# Design

## Context

See proposal.md, Why. This change builds on `cosmo-qr-collection-media` (deployed, not archived) and sits beside `cosmo-objekt-ownership-data` (built, not archived). "QR change, Decision N" means the design.md of `cosmo-qr-collection-media`.

### Cosmo's web sessions

Measured on 2026-11-17.

- QR certify answers 201 with an empty body and sets only `user-session`. The cookie claims 6 months. Cosmo offers no refresh token and no refresh call for web sessions: the shop web has only sign-in, `users/me` and `logout-from-session`.
- Cosmo ends a web session after 45 to 60 minutes without use. One session answered 200 after 45 minutes idle and 403 after 60. Another, used about every 30 minutes, lived 3+ hours and died within 60 minutes of its last use. A third died within 2¾ hours of its last use.
- Whether a session also has an absolute lifetime beyond 3 hours is unknown. A change of the proxy's egress IP did not end a session, and neither did opening the Cosmo app.

### Our code

- **The run.** `job/collection-media.ts` runs every 5 minutes under `safeRun("collection-media")`, inside `if (indexerWrites)`, and only with `COSMO_SESSION_KEY`. It reads the backoff from Redis (`collection-media:backoff`). It skips the sync phase while backing off, and always runs the apply phase. All Cosmo calls leave through `COSMO_PROXY`, one at a time:
  - `pace(run)` spaces requests 1 to 1.5 s apart and spends `createRunBudget()`: 50 requests and 4 minutes a run, so at most 600 an hour.
  - The unarchived requirement "A fixed load on Cosmo" (`worker-collection-media`) states those numbers.
- **Errors.** `guard(true, …)` turns every failure into `CosmoSessionError`. `errorKindOf` gives `dead` for a 401 or 403 with Cosmo's JSON error body; it parses a text body too. A 403 without that body is `unavailable`, 429 is `busy`, and a 5xx or no answer is `unavailable`.
  - `isCosmoWideOutage(kind, cosmoAnswered)`: a busy or unavailable answer before anything in the run was answered sets `run.cosmoDown`. That starts the backoff: 5 minutes, doubling to 120. While no backoff is running, the next run clears it once anything answers.
  - `handleCosmoError` marks `dead` sessions through `markDead`. On any other failure it writes `last_error` and parks the session (`next_sync_at` + 6 h, `sync_requested_at` cleared).
  - Every session write is guarded by `ownRow` (id and the sealed cookie the run read), so a Renew in between is never overwritten.
- **`last_used_at`.** Its only writer is `syncSession`, which stamps it with `last_attempt_at` before any request, so a run that failed reads as use. Nothing reads it. The QR connect (`packages/api/src/services/cosmo-session/qr.ts`) leaves it alone. It sets `created_at` to the connect time on insert, and again on every reconnect (`createdAt: now` in the conflict update).
- **Lifetimes are lost.** A reconnect resets `created_at` and clears `dead_at`, and `deleteLongDead` deletes rows 30 days after `dead_at`.
- **Pure rules.** `lib/media-sync.ts` holds the sync's cadence, jitter (FNV hash of the session id), budget and backoff rules, tested in `media-sync.test.ts`.

## Goals / Non-Goals

**Goals:**

- A live session never sits idle long enough for Cosmo to end it while the worker runs on schedule and Cosmo answers.
- Cosmo's total load from the site stays where the existing requirement puts it: 50 requests a run, 600 an hour, one at a time.
- No new stored data, no migration, nothing read from Cosmo's answer.
- Measure, from the first week of use, whether sessions also have an absolute lifetime.

**Non-Goals:**

- Separate scheduling, locking or backoff state for keep-alive.
- Retrying a failed touch within the same run.
- Changing how the sync parks, orders or resumes sessions.

## Decisions

### 1. A phase of the existing run, before the sync

Keep-alive runs inside `runSyncOnce`, as `keepAlivePhase(run, sessionKey, backingOff)` before `syncPhase`. It reuses `pace`, the run budget, the backoff store, `markDead`, `ownRow` and the cookie-opening code. It reuses the existing job rather than adding one:

- **A separate cron job was rejected.** It would need its own lock. Two jobs could then send requests at once through the one egress, breaking the one-at-a-time rule. The budget and the hourly limit would need a counter shared across jobs, and a second backoff state could disagree with the first.
- **It runs before the sync, not after.** A sync resuming a large account can spend the whole 50 requests and 4 minutes for several runs in a row. A keep-alive placed after it would get nothing on those runs. A late sync costs nothing, but a missed touch kills a session.
- **Run length.** 20 touches at 1 to 1.5 s take about 25 s. They are counted in the run's 4 minutes, which leave the sync about 3.5 minutes. A run that overruns 5 minutes makes the next tick skip under the job lock; Decision 2's margin counts one skipped tick.
- **Its own outcome handling.** It does not go through `handleCosmoError`, which parks the session and writes `last_error`; Decision 4 explains why.

### 2. Last use and the keep-alive age

**Last use means the last successful answer.** A session's last use is the time Cosmo last answered one of its requests successfully:

- **The sync** stamps `last_used_at` after `users/me` answers, in the same update that stores the nickname. `last_attempt_at` stays the pre-request stamp. The sync's later pages are not stamped. That makes last use up to about 4 minutes earlier than the truth, which only makes the next touch come sooner, and saves a write per page.
- **A touch** stamps it after a 2xx.
- **A failure** stamps nothing. Under today's rule, a timed-out sync would read as fresh use, and the next touch would land too late.

**The planner's last use** is `greatest(last_used_at, created_at)` (`greatest` ignores a null). `created_at` is the connect or reconnect time, which is when Cosmo last answered (certify, then `users/me`). That covers a new row with no `last_used_at`, and a reconnected row whose `last_used_at` is older, so `qr.ts` needs no change.

**The keep-alive age** is 25 minutes minus `hashId(id) % 6` minutes, so 20 to 25 minutes, fixed per session. It uses the same FNV hash as `nextSyncAt`, so every process and restart agrees. The jitter subtracts from 25 and never adds, which keeps the worst case below. It spreads sessions connected together, for example everyone reconnecting after an outage, across runs.

**The margin.** The worst idle time before a touch, against the 45 minutes measured alive:

| Part | Minutes |
| --- | --- |
| Keep-alive age, at most | 25 |
| Wait for the next 5-minute tick | up to 5 |
| One skipped tick (a run overlapping the next, under the job lock) | up to 5 |
| Position in the run (20 touches, each taking the 10 s timeout; the pace counts from a request's start) | up to 3.3 |
| **Worst case** | **about 38** |

That is still under the 45 minutes known to be survived, by about 7.  Deploy downtime and the job lock's TTL after a crash add to the idle time on top of this; the table counts one skipped tick, and a restart's startup run touches first.

- **Ages of 25 to 30 were rejected.** The worst case would be about 43, leaving 2 minutes against a single measurement.
- **The heartbeat's `keepalive idle_max_min`** shows the real margin.

**Cost.** A session is touched on average at about 22.5 + 2.5 = 25 minutes idle, about 58 requests a day per connected account. That is the price of the margin over the brief's 30 minutes (48 a day).

### 3. Budget, slice and capacity

**Within the run's budget.** Touches spend the run's existing 50-request budget through `pace`, so the requirement "A fixed load on Cosmo" holds unchanged for everything the site sends with sessions.

- **The slice.** A run sends at most 20 touch requests (`KEEPALIVE_SLICE`), so syncs keep at least 30 requests. `canStartSession` still needs 2 requests left. The slice counts requests sent, not sessions planned: a session whose cookie does not open costs no request and takes no place. Otherwise, after a key change, 20 unreadable rows the sync has not flagged yet (it flags each only when its sync comes due, up to 72 hours later) would be the longest unused and starve every readable session.
- **No hourly counter.** The hourly cap follows from the slice: 20 × 12 runs = 240 touches an hour. A Redis counter was rejected. The sync bounds its 600 an hour the same way, from the run budget, and a restart's extra startup run is the only overshoot, as it is today.

**Capacity.** Each session needs about 2.4 touches an hour, so the slice keeps about 100 sessions alive.

- **Beyond that,** the planner touches the longest-unused sessions first. A session pushed past Cosmo's cutoff is found signed out at its next touch, marked dead and leaves the pool. Overload therefore ends sessions; it never raises the load.
- **The overflow is visible.** The run logs one `warn` with the count of sessions past their age that the slice left for later. The `warn` is skipped during a backoff, whose slice is 5 by design; the heartbeat's `keepalive capped` still counts. Only a person can act on it, by raising the slice (a code change, taken from syncs).
- **Syncs keep enough.** A typical sync costs about 10 requests every 72 hours, so 30 a run carries thousands of sessions.

**Selection.**

- **The query.** One app query reads live rows: `dead_at is null`, `cookie_sealed is not null`, `cookie_expires_at > now()`, `last_error is distinct from 'key_unreadable'`, and `greatest(last_used_at, created_at) <= now() - interval '20 minutes'`. It orders savable rows (last use under 45 minutes ago) before the rest, then by last use ascending, limit 200, so a pile of long-dead rows never fills the limit ahead of a session that can still be saved.
- **The planner.** The pure `planKeepAlive` applies each session's own age and returns the due sessions in touch order, each with its idle time: tier 1 is sessions last used under 45 minutes ago (still savable), tier 2 the rest, each tier longest unused first. Without the tiers, a few long-dead rows (a reconnect elsewhere, an outage) sort first by age and use the whole slice, one dead answer at a time, while savable sessions wait past 45 minutes and die. The phase walks that list until it has sent the slice; the sessions it did not reach are the run's `capped` count, and the largest idle time among those it touched goes to the heartbeat.
- **Expired rows** are left to the sync, which signs them out and marks them (QR change, Decision 7).
- **`key_unreadable` rows** are left out, since they cannot be opened. A row whose cookie fails to open before the sync has marked it is skipped and counted, and its row is left for the sync to park.
- **No index.** The table holds at most 3 rows per user, so the read is a small scan run every 5 minutes. The existing `cosmo_session_next_sync_idx` does not fit the predicate, and is not worth adding to at this size.

**Due for both.** A session due for its sync is not left out. The sync may not reach it in this run, and leaving it untouched could kill it. The cost is at most one extra `users/me` per session per 72 hours.

### 4. The touch call and its outcomes

**The call.** `touchSession(cookie)` in `packages/cosmo/src/server/session.ts` sends `GET /bff/v4/users/me` with the cookie, `responseType: "text"`, through `guard(true, …)`, and returns nothing.

- **Why `users/me`.** It is the lightest call that needs the session: one small object, and the call the sync already starts with.
- **Why not `fetchSessionUser`.** It parses the nickname and address. A 200 whose shape changed would throw `unexpected` though Cosmo did use the session, and holding the address invites comparing or storing it.
- **No address check.** The sealed cookie's AAD binds it to `user_id` and the lowercased address, so a cookie cannot move between rows. The sync reads the profile every 72 hours anyway.

**Outcomes.** Each write goes through `ownRow`; a row reconnected meanwhile is skipped.

| Answer | Write | Count |
| --- | --- | --- |
| 2xx | `last_used_at` = answer time | `keepalive touched` |
| `dead` (401/403 with Cosmo's JSON error) | `markDead(…, "session_dead")`, exactly as a sync: cookie erased, `dead_at`, `last_error` | `keepalive ended_kept` or `ended_idle` (Decision 8), and `run.markedDead` |
| `busy` or `unavailable` before anything in the run answered (no backoff running) | none; `run.cosmoDown = true`, the phase stops and the sync is skipped | the run's outage `warn`, as today |
| any other failure (`busy` or `unavailable` after an answer, `refused`, `unexpected`) | none | `keepalive failed <kind>` |

**Stops.** `createKeepAliveGuard` (pure, `lib/media-sync.ts`) judges each answer. While no touch in the run has had a 2xx:

- **5 dead answers in a row** stop the phase for the run, without marking further sessions, with one `warn` carrying the count. A Cosmo-wide change that answers every web session `dead` would otherwise erase every cookie within the hour; this caps one run at 5. The later 2xx rule means a run where sessions are genuinely alive is never stopped.
- **3 refused or unexpected answers in a row**, outside a backoff, stop the phase with one `warn` (count only): the touches are not working, and more requests would only add load.
- A 2xx anywhere in the run lifts both. A dead or ok answer breaks the failure streak.

Before each touch (before `pace`) one indexed query checks the row still matches `ownRow`; a row disconnected or renewed since the read is skipped, and costs no request.

**The call.** `touchSession` sends `redirect: "manual"` and reads the status with `.raw`, so a redirect is never followed and never a success: any non-2xx maps through `errorKindOf`, where a 3xx is `unexpected`, not `dead`.

**Why another failure writes nothing.** `last_error` and the park belong to the sync: the row shows "Cosmo was unavailable on the last sync", and a park would hold a session's sync back 6 hours over a failed touch. Leaving the row means the session stays longest unused, so the next run touches it first. That is right, since it is the most at risk.

**Probing.** Outside a backoff, a 2xx or a `dead` answer sets `run.cosmoAnswered`, as `handleCosmoError` does for `dead`. The touches are then the run's probe, and an expired backoff clears as today. This matters in the first runs after switch-on, when most touches answer `dead`.

### 5. During a backoff

The backoff's probes come at about 5, 15, 35 and 75 minutes after the first failure. Skipping keep-alive during a backoff would leave sessions 60 or more minutes idle after a 15-minute outage, which ends every session. So during a backoff:

- **At most 5 touches a run.** They are the 5 longest-unused sessions past their age, and the touches stop at the first `busy` or `unavailable`; `refused` and `unexpected` skip to the next session, still within the 5.
- **The backoff is left alone.** A 2xx stamps the session. During a backoff, touches set neither `run.cosmoAnswered` nor `run.cosmoDown`, so the run neither clears nor extends the backoff. The sync stays off until the backoff ends, as the requirement "Backing off from Cosmo" says.
- **Dead still counts.** A `dead` answer is Cosmo answering, so it marks the session as usual.
- **Why 5.** The load is at most 5 a run (60 an hour) against a Cosmo that may be rate-limiting, and only 1 request when Cosmo is still down. That keeps about 25 sessions alive through a long backoff; more are lost (Risks).

### 6. The switch: `COSMO_SESSION_KEEPALIVE`

`COSMO_SESSION_KEEPALIVE=on` turns keep-alive on.

- **Values.** Unset, empty or `off` is off. Any other value is off and logs one `warn` per start.
- **Parsing.** The pure `keepAliveSwitch(raw)` in `lib/media-sync.ts` returns `{ on, unknown }`. The job reads it once per process, as `COSMO_OBJEKT_WRITES` is read, so a change is an env edit and a restart.
- **Worker only.** Web never touches sessions. It goes in the worker's `environment` list in `docker-compose.yml` (a named list, so an unlisted variable never reaches the container), in `.env.example`, and in the root `AGENTS.md` Environment list.
- **Off by default.** That lets the owner deploy the stamping change first and see that syncs behave as before.
- **Not a comma list** like `COSMO_OBJEKT_WRITES`: there is one behaviour.
- **No age knob.** The age encodes the measured margin (Decision 2), and changing it should be a reviewed code change.
- **Staging never touches.** The job runs only with `indexerWrites`, so a staging worker (`WORKER_INDEXER_WRITES=false`) with a cloned app database never touches production users' cookies from another IP.

### 7. Sync interval stays 72 hours

The scheduled sync stays at 72 hours.

- **Why it was chosen.** The interval was set for Cosmo load (QR change, Decision 10). Collection fields are the same for every holder, so media gain little from fresher reads, and objekt reads re-judge transferability weekly anyway.
- **Keep-alive is the fix.** The scheduled sync now finds its session alive, which is what was broken.
- **A shorter interval** would spend the budget keep-alive now shares.
- **Users can still** press Sync now.

### 8. Measuring the absolute lifetime

A touch that finds a session `dead` judges how it ended:

- **Kept:** its last use was under 45 minutes before the answer, so Cosmo did not end it for idleness. Its lifetime lies between `last_used_at − created_at` and `now − created_at`.
- **Idle:** otherwise, for example after a long backoff or overload.

**The record.** The run's `info` summary, which already logs when sessions are marked dead, gains `keep-alive ended: kept 26.4 h, 3.1 h; idle 1`. It lists hours since `created_at`, one decimal, with no id, nickname or address. The heartbeat counts `keepalive ended_kept` and `keepalive ended_idle`.

- **Logs are the durable record.** Rows lose this as they are reconnected or deleted after 30 days.
- **The pure helper** `endedWhileKept(lastUse, now)` holds the 45-minute rule.

**What it cannot tell apart.** A Cosmo-wide sign-out looks the same as an absolute lifetime. Disconnect deletes the row, so it is never counted.

- **One value** that `ended_kept` lifetimes cluster at (24 hours, 7 days) is Cosmo's absolute lifetime.
- **Scattered values** are sessions Cosmo ended for other reasons.

**The owner's read-only query,** within 30 days of the deaths:

```sql
select id,
  round(extract(epoch from dead_at - created_at) / 3600, 1) as lived_h,
  round(extract(epoch from dead_at - last_used_at) / 60) as idle_min
from cosmo_session
where last_error = 'session_dead' and dead_at > '<switch-on time>'
order by dead_at;
```

### 9. Consent text

`cosmo_session_stored` says the sign-in is kept until disconnect, for 180 days at most. Using it about two to three times an hour is within "kept", but someone reading "store" would not expect the site to act with their sign-in around the clock, including when nothing syncs.

- **One clause is added** to that string. Nothing else changes: no new data is stored or read, so no reconnect or new consent marker is needed, and `objekts_consented` is untouched.
- **If keep-alive is switched off,** the text still holds: it says no more than the site may do.
- **The ko and ja texts are drafts for the owner's review.** ko is in 합니다체. ja is in です/ます, with full-width colons and a 。 for each en full stop: four sentences in each locale.

| Locale | `cosmo_session_stored` |
| --- | --- |
| en | What we store: an encrypted Cosmo sign-in, and your Cosmo nickname and wallet address. The sign-in is kept until you disconnect, for 180 days at most, and we use it about two to three times an hour to keep it active at Cosmo. Once it ends, your nickname and address are deleted within 30 days. The objekt details below stay. |
| ko | 저장하는 정보: 암호화된 Cosmo 로그인, Cosmo 닉네임과 지갑 주소입니다. 로그인은 연결을 해제할 때까지, 최대 180일 동안 보관하며, Cosmo에서 로그인이 유지되도록 시간당 2~3번 정도 사용합니다. 로그인이 끝나면 닉네임과 주소는 30일 이내에 삭제합니다. 아래의 Objekt 정보는 삭제하지 않고 남습니다. |
| ja | 保存する情報：暗号化されたCosmoのログイン、Cosmoのニックネームとウォレットアドレスです。ログインは接続を解除するまで、最長180日間保存し、Cosmoでログイン状態を保つために1時間に2〜3回ほど使用します。ログインの終了後、ニックネームとアドレスは30日以内に削除します。下記のObjektの情報は削除せず、残ります。 |

Two more strings change with it. Deleting an account removes its `cosmo_session` rows and signs them out at Cosmo (`revokeSessionsOf`, `signOutSealed`, from `anonymize.ts`), so the text may say so.

| Key | en | ko | ja |
| --- | --- | --- | --- |
| `cosmo_session_stop` | To stop, press Disconnect at any time. We sign out of Cosmo and delete the sign-in. Deleting your account here also ends it. | 중단하려면 언제든지 연결 해제를 누르세요. Cosmo에서 로그아웃하고 로그인을 삭제합니다. 이 사이트의 계정을 삭제해도 종료됩니다. | 停止するには、いつでも「接続を解除」を押してください。Cosmoからログアウトし、ログインを削除します。このサイトのアカウントを削除しても終了します。 |
| `cosmo_session_disconnect_unconfirmed` | Disconnected, but Cosmo did not confirm the sign-out. We deleted the sign-in, and Cosmo ends it on its own usually within an hour. | 연결을 해제했지만 Cosmo가 로그아웃을 확인하지 않았습니다. 로그인은 삭제했으며, Cosmo에서 보통 1시간 이내에 자동으로 종료됩니다. | 接続を解除しましたが、Cosmoがサインアウトを確認しませんでした。ログインは削除済みで、Cosmo側で通常1時間以内に自動的に終了します。 |

The consent requirement in the `web-cosmo-session` deltas of the two earlier changes names "how to stop (Disconnect, or deleting the account)".

### 10. Logs, errors and privacy

- **What is stored.** Nothing new. `last_used_at` exists. A touch reads only the status, and stores no nickname, address or profile field.
- **Heartbeat** (`collection-media`): `keepalive touched`, `keepalive failed <kind>`, `keepalive capped`, `keepalive key_unreadable`, `keepalive ended_kept`, `keepalive ended_idle`, and the maximum `keepalive idle_max_min`, recorded only on a 2xx as the time from last use to that answer. The existing `Cosmo requests` count includes touches.
- **`info`.** Touches alone do not make a run log, since a run that only kept sessions alive changed nothing a person needs to see. The summary gains the lifetime clause (Decision 8) only when a touch marked a session dead.
- **`warn`, one line per run with a count:**
  - sessions the slice left past their age (Decision 3), not during a backoff (the heartbeat still counts them);
  - a stop of the touches (Decision 4): 5 dead answers in a row, or 3 refused or unexpected in a row, each with its count only;
  - more than 5 sessions marked dead by touches in one run (Risks);
  - the unknown switch value, once per start.
- **Per-session lines** go to `debug` with the session id and error kind only, as the sync's do.
- **Errors.** Keep-alive adds no `error` line. `CosmoSessionError` messages are fixed strings with no URL, cookie or body. A phase failure of our own (the database) logs one `warn` with `errorCode(error)` and lets the sync and apply phases run. Anything that does reach Sentry passes `@repo/lib/error-scrub` as before.

### 11. Where the code goes

- **The pure rules** go in the existing `lib/media-sync.ts`, which already holds the sync's cadence, jitter and budget, with tests in `media-sync.test.ts`. A new module would split one set of rules across two files. The rules are `keepAliveAgeMs`, `lastUseOf`, `planKeepAlive`, `endedWhileKept`, `keepAliveSwitch` and `KEEPALIVE_SLICE` / `KEEPALIVE_BACKOFF_SLICE`.
- **The phase** goes in `job/collection-media.ts`, beside the code it shares.
- **The call** goes in `packages/cosmo/src/server/session.ts`, beside `fetchSessionUser`.

## Risks / Trade-offs

- **An absolute lifetime.** If Cosmo ends web sessions at a fixed age (24 hours, say), keep-alive buys at most that. → Decision 8 measures it in the first week. If the lifetime is short, the owner turns the switch off, since the touches would cost requests for little.
- **Cosmo notices the pattern.** About 58 `users/me` calls a day per account from one egress could be rate-limited or blocked. → They stay inside the existing 50-a-run budget. A 429 or firewall 403 backs off as today. The owner can turn the switch off without a deploy.
- **A thin measurement.** The 45-minute floor rests on one session. → The worst case is about 38 minutes. The heartbeat's `idle_max_min` and the `ended_kept` count show whether the margin holds, and a lower age is a one-line code change.
- **A longer exposure window.** Today a stored cookie dies within an hour, so a leaked database row plus `COSMO_SESSION_KEY` was useful only briefly. With keep-alive it stays usable for up to 180 days. → It is sealed with AES-256-GCM under a key used for nothing else, with the row's owner and address in the AAD. Disconnect, a ban and account deletion sign it out at Cosmo, and the 180-day limit signs it out. This is the exposure the QR change already accepted for its 180-day design.
- **Mass dead-marking.** Touching every session each cycle means a burst of JSON 401 or 403 answers (a Cosmo-wide sign-out, or a Cosmo change that answers every web session that way) marks every session dead within an hour, and the cookie erase cannot be undone. A stop is built in (Decision 4): with no 2xx in the run, 5 dead answers in a row end the phase, so at most 5 sessions go in a run, with a `warn`. A run that has had a 2xx is never stopped, since then the dead answers are real endings.
  - The sync applies the same rule and would mark the same sessions within 72 hours.
  - `dead` needs Cosmo's own JSON error, not a firewall page.
  → Besides the stop's `warn`, one `warn` when a run's touches mark more than 5 sessions dead, so the owner sees it the same hour. Users reconnect.
- **Long outages.** A Cosmo outage longer than about 20 minutes, or a backoff with more than about 25 sessions waiting, ends sessions. → Accepted: rows show signed out with Reconnect, and nothing is lost but the connection.
- **Over capacity.** Past about 100 live sessions, the longest unused are touched first and the rest are lost. → A `warn` each run with the count; raising the slice is a reviewed change.
- **The first runs after turning it on.** Sessions idle for hours are likely dead already. Touched first, they are marked signed out in the first runs. → Expected; the summary counts them as `idle`.
- **A mid-run outage parks sessions.** Touches now answer first in most runs, so a sync page that then fails busy or unavailable is that session's own failure: it is parked for 6 hours and gets no backoff. → That is today's rule for any failure after an answer. A Cosmo outage beginning at the run's first request still backs off.
- **Not done: a cap on sessions per person.** One person can connect up to 3 per site account and may hold several site accounts, each costing touches. A cap across accounts needs an expensive cross-account lookup, and the abuse limits itself: it spends the sessions' own slice and the owner's connections. The capped `warn` flags it.
- **A duplicate request.** A session past its age and due for its sync is touched and then synced in one run. → At most one extra request per session per 72 hours.

## Migration Plan

1. **Deploy** the worker and web with `COSMO_SESSION_KEEPALIVE` unset. There is no migration. Syncs behave as before, except that `last_used_at` is stamped only after Cosmo answers. The consent string shows the new clause.
2. **Switch on:** set `COSMO_SESSION_KEEPALIVE=on` in the root `.env`, and restart the worker only.
3. **Reconnect** the owner's account. Its current session is almost certainly dead. With the switch already on, the fresh session is kept from its first run. The brief's order (reconnect, then switch on) also works if the switch is on within 20 minutes of the reconnect.
4. **After 24 hours,** check that the owner's session is alive. After its first scheduled sync (72 to 78 hours), check that the sync succeeded (tasks 6.2, 6.3).
5. **After a week,** read the lifetimes (Decision 8, task 6.4).
6. **Rollback.** Unset the switch and restart the worker: touches stop, and sessions die as before. Nothing stored needs undoing. The consent clause may stay or be reverted in a later deploy.

## Open Questions

- **The absolute lifetime.** Measured after rollout (Decision 8). It changes only whether keep-alive is worth its requests, not how it is built.
- **Does a failed request count as use at Cosmo?** A 5xx or a timeout may still refresh the session. The design assumes not, which is the safe side.
- **Does Cosmo show the site's sign-in activity to the user** (a device or session list)? If so, the consent clause is the right place to warn of it.
- **The touch in the measurement.** Was the session used about every 30 minutes kept by `users/me` calls, or by page reads? The 24-hour check (task 6.3) answers it for `users/me`.

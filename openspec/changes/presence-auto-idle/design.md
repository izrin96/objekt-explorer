## Context

- `online-presence` (commit `519cc36a`): online means Centrifugo has a connection on `user:#<id>`. `onlineAmong` (`packages/api/src/services/presence.ts`) gates the asked ids through `presenceTargets`, reads them in one parallel `/api/batch`, and `presence.online` returns `{ online }`.
- The web has one poller per tab (`features/presence/use-presence-poller.ts`) that checks the ids on screen every 30 s while the tab is in front. `stores/presence.ts` holds `online`. `applyOnline` (`watch.ts`) merges each answer. `useOnline` feeds `OnlineAvatar` and the thread header.
- Centrifugo presence knows only that a connection exists, not whether anyone is using it. Its connection info is fixed when the connection is made, so it can't carry a state that changes.
- Valkey (`REDIS_URL`) already backs rate limits and caches through `services/redis.ts`. `redisFailOpen` returns `null` on failure.

## Goals / Non-Goals

**Goals:**
- Idle with no setting, worked out from activity across all of a person's tabs.
- No new socket traffic, no database write, no Centrifugo change.
- Old tabs and old servers stay compatible during the deploy.

**Non-Goals:**
- Pushing state changes. Viewers keep polling.
- Exact timing. Idle may show up to about 2 minutes after the 10-minute mark.

## Decisions

### 1. Activity as a last-active time in Redis, refreshed by the active tab
`presence.active` (authed, no input) sets `presence:active:<userId>` to the current time in epoch milliseconds, with an expiry of `ACTIVE_MARK_SECONDS` (7 days). A tab reports at most once every 60 s, and only after activity. A person is idle when their mark is at least `IDLE_AFTER_SECONDS` (600 s) old, so idle shows 10 to 11 minutes after the last activity in any tab, and any active tab keeps the person online.

A missing mark reads as online, not idle. That covers tabs opened before the deploy (they never report, and their owner may be using them) and marks lost when Valkey restarts or is recreated without a volume. The 7-day expiry keeps the keys from piling up; a person whose tab sits untouched for more than 7 days shows as online again, which is accepted.

- *Rejected: a mark whose expiry is the idle threshold, with a missing mark read as idle.* The first version did this. Every tab opened before the deploy showed its owner idle while they used it, until they reloaded, and a Valkey outage of more than 10 minutes showed everyone idle.
- *Rejected: tabs report "idle" and "active" transitions.* With several tabs, the server would have to combine their states, and a tab that closes while active would leave a stale "active". A timestamp needs no cleanup.
- *Rejected: reconnect to Centrifugo with idle in the connection info.* It churns the socket, and old tabs would never send it.
- *Rejected: a `last_active_at` column.* That is a production database write per active user per minute.

The mark is written whatever the person's switch says. It is read only for ids that already passed `presenceTargets`, so a hidden person's mark is never read. Limit: `refuseOverUserLimit("presence-active", id, 10, 60)`, which covers several tabs. The client ignores a refusal or a failure.

### 2. `presence.online` returns `idle` as a subset of `online`
After Centrifugo answers, `onlineAmong` sends one `MGET` of the online ids' marks through `redisFailOpen`. The pure `idleFrom(online, marks, now)` in `lib/presence.ts` (tested) returns the online ids whose mark is at least 10 minutes old. A missing or unparseable mark is not idle, and `null` marks (Valkey down) is nobody idle, so idle fails toward online. The output becomes `{ online, idle }`, with `idle` a subset of `online`.

Compatibility:
- A tab from before the deploy ignores `idle` and shows an idle person as green, as it does today. As the person shown, it never reports, so its owner has no mark and shows online.
- A new tab talking to an old server reads `idle ?? []`.
- The `/rpc` input is unchanged.

### 3. The activity reporter, beside the poller
`useActivityReporter()` is mounted in `SignedInActions` next to `usePresencePoller()`.
- It listens on `window` with passive, capture listeners for `pointerdown`, `pointermove`, `keydown` and `wheel`, and on `document` for `visibilitychange`. It does not listen for `scroll`: a capture listener on `window` gets every element's scroll, including the ones the app makes (a thread following a new message, scroll restoration), which would wake an idle person. A person's own scrolls start with a wheel, a key or a pointer press. `pointerdown` covers touch.
- On each event it reports only when the tab is visible and the pure `shouldReport(lastReport, now)` (`features/presence/activity.ts`, tested, 60 s) allows it.
- After a failed or refused report it sets `lastReport` to `failedReportAt(now)`, so the next activity retries after 10 s rather than a minute, and coming back from idle still shows within 60 s.
- It also reports once on mount, if the tab is visible.

The 60 s check is a single comparison, so `pointermove` is cheap. The first activity after idling always passes the check, because the last report is more than 60 s old. The viewer's next poll then shows the person green within about 30 s.

- *Why a new hook, not more poller code:* the poller asks about other people, while this tells the server about the viewer. They share only `SignedInActions`.

### 4. Client state and UI
- The store gains `idle: Record<string, true>`.
- `applyOnline` becomes `applyPresence(state, asked, answer)`. It updates both maps for the asked ids, and returns the same objects when nothing changed, so selectors don't re-render. `resetPresence` and `unwatchPresence` clear `idle` too.
- `useOnline` becomes `usePresenceStatus(userId): "online" | "idle" | null`. It is still `null` before hydration.
- `OnlineAvatar` picks the dot colour (`TONE_SOLID.success` or `TONE_SOLID.warning`) and the text (`m.presence_online()` or `m.presence_idle()`). Idle is a crescent: the amber dot with a `bg-background` circle covering its top-start corner, the same colour as the ring, as Discord's idle moon. Colour alone fails WCAG 1.4.1, and lime and amber look alike to deuteranopes.
- The thread header shows its visible word from the same status.

Amber follows the common convention for idle, and `warning` is the closest token in `lib/tone.ts`. The size and position stay the same as the online dot.

`online-presence` says an online person gets a green dot and "Online". Since idle is a kind of online, this change modifies that requirement to cover online people who are not idle.

## Risks / Trade-offs

- **Idle is late by up to about 2 minutes:** 10 to 11 minutes for the mark to run out, plus up to a 30 s poll. The spec allows that.
- **A person who reads without moving anything goes idle after 10 minutes.** That is accepted; the threshold is generous.
- **Valkey down: no idle, everyone online shows green.** That fails toward today's behaviour. Marks lost with Valkey also read as online.
- **A mark write that fails while reads work leaves the person's last mark in place**, so they may show idle until a report gets through. Retries come every 10 s on activity.
- **`REDIS_URL` may be shared with another stack.** The `presence:active:` prefix keeps the keys apart, and each key is a few bytes with a TTL.

## Migration Plan

Deploy web. There is no migration and no config change. Archive `online-presence` before this change, so the `web-presence` spec exists to add to.

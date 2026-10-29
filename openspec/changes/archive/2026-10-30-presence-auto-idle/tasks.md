# Tasks

## 1. Server

- [x] 1.1 In `packages/api/src/lib/presence.ts`, add `IDLE_AFTER_SECONDS` (600), `ACTIVE_REPORT_SECONDS` (60), `activeKey(userId)` (`presence:active:<id>`) and `idleFrom(online, marks)`: the online ids with no mark, or `[]` when `marks` is `null` (design decisions 1–2). Test it in `presence.test.ts`: none marked, all marked, mixed, `null` marks, and order kept. `bun test packages/api/src/lib/presence.test.ts` must pass.
- [x] 1.2 Add `markActive(userId)` to `services/presence.ts`: `SET` the key with an expiry of `IDLE_AFTER_SECONDS + ACTIVE_REPORT_SECONDS`, through `redisFailOpen`. Have `onlineAmong` return `{ online, idle }`, reading marks for the online ids with one `MGET` through `redisFailOpen`, and skipping it when nobody is online. Add `presence.active` (authed, no input, `refuseOverUserLimit("presence-active", id, 10, 60)`), and return `idle` from `presence.online`. Neither goes on `/api/v1`. Lint and typecheck must pass for `@repo/api`.

## 2. Client

- [x] 2.1 Add the pure `apps/web/src/features/presence/activity.ts` with `shouldReport(lastReport, now)`, which is true when there was no report or the last one was at least 60 s ago, and test it. Turn `applyOnline` in `watch.ts` into `applyPresence(state, asked, answer)` over `{ online, idle }`. It must return the same objects when nothing changed, and an id must never be in `idle` without being in `online`. Update `watch.test.ts`. `bun test` must pass for both.
- [x] 2.2 Add `idle` to `stores/presence.ts`, and clear it in `resetPresence` and `unwatchPresence`. Make the poller read `idle ?? []` and apply it with `applyPresence`. Add `useActivityReporter` (design decision 3) and mount it beside `usePresencePoller()` in `components/layout/app-nav.tsx`. Replace `useOnline` with `usePresenceStatus`. In `OnlineAvatar` and `thread-header.tsx`, show the warning-coloured dot and "Idle" for an idle person. Add `presence_idle` ("Idle") in en/ja/ko. Lint, typecheck and build must pass for `web`.

## 3. Verify and document

- [x] 3.1 On the local stack, with two seeded local sessions as in `online-presence` 5.1 (delete them afterwards):
  - B active shows green to A.
  - Delete B's `presence:active:` key in the local Valkey to stand in for 10 idle minutes, and A must see amber with "Idle" within 30 s.
  - B moves the pointer in their tab, and A must see green again within 60 s.
  - Stop the local Valkey briefly, and A must see B green with no error for either; then start it again.

  `bun run check` must pass.
- [x] 3.2 Update the Presence sections of `packages/api/AGENTS.md` (the activity mark, `idleFrom`, failing toward online) and `apps/web/AGENTS.md` (`usePresenceStatus`, the reporter beside the poller). The docs must read correctly against the code.

## 4. Review fixes

- [x] 4.1 Store the last-active time in the mark (`ACTIVE_MARK_SECONDS`, 7 days) and read a missing mark as online, so tabs from before the deploy and lost marks never show idle. `idleFrom` takes `now`; update its tests.
- [x] 4.2 Drop the `scroll` and `touchstart` listeners, and retry 10 s after a failed report (`failedReportAt`, tested).
- [x] 4.3 Draw idle as an amber crescent, not only a colour change.
- [x] 4.4 Modify "Online dot" in this change's spec to cover online people who are not idle, and drop "green" from `online-presence`'s Purpose.
- [x] 4.5 Fix the timing wording in `packages/api/AGENTS.md`; return a fresh object from `onlineAmong`; stop exporting `PresenceStatus`. `bun run check` must pass.

## Workflow follow-up

- Archive `online-presence` first, then this change, after review with `/opsx:archive`.

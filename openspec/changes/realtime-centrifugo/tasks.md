## 1. Centrifugo service

- [x] 1.1 Add `centrifugo/config.json` (v6 layout): Redis engine with a `centrifugo` prefix whose address comes only from `CENTRIFUGO_ENGINE_REDIS_ADDRESS`, never `REDIS_URL` (design §1), and `engine.type: memory` for local dev, `client.allowed_origins` from `SITE_URL`, `client.token.hmac_secret_key` from `CENTRIFUGO_TOKEN_SECRET`, `http_api.key` from `CENTRIFUGO_API_KEY`, personal subscription on namespace `user`, namespaces `user` and `activity` as in design §3, anonymous connections allowed; verify `centrifugo checkconfig` passes in the container
- [x] 1.2 Add the `centrifugo` service to `docker-compose.yml` (`restart: always`, `/health` healthcheck, internal port 8000, no public `/api`), and `CENTRIFUGO_URL`, `CENTRIFUGO_API_KEY`, `CENTRIFUGO_TOKEN_SECRET`, `CENTRIFUGO_ENGINE_REDIS_ADDRESS`, `VITE_CENTRIFUGO_URL` to `.env.example`; verify that the local Centrifugo runs the memory engine or the compose Valkey and never connects to the Valkey in the root `.env`, and `docker compose config` is valid and a local `docker compose up centrifugo` reports healthy
- [x] 1.3 Proxy `/connection` (with `ws: true`) to `localhost:8000` in `apps/web/vite.config.ts`; verify a browser on the dev server opens `ws://localhost:<vite>/connection/websocket` and gets Centrifugo's connect reply; lint + typecheck + build pass for `web`
- [x] 1.4 Write the Dokploy/Traefik route for `PathPrefix(/connection)` on the site host as a deploy note in `design/` (not applied); verify the note names the service, port and env vars

## 2. Shared schema and server-API client

- [x] 2.1 Add `packages/api/src/schemas/realtime.ts` with `realtimeEventSchema` (design §4), `SESSION_REVOKED_CODE = 4501`, channel names (`user:#<id>`, `activity:feed`); keep `userSocketMessageSchema` exported until §7; add `realtime.test.ts` covering each event parsing and an unknown type being rejected; verify `bun test` passes; lint + typecheck pass for `@repo/api`
- [x] 2.2 Add `CENTRIFUGO_URL`, `CENTRIFUGO_API_KEY`, `CENTRIFUGO_TOKEN_SECRET` to `packages/api/src/env.ts` and the worker env; verify typecheck passes for `@repo/api` and `worker`
- [x] 2.3 Add `packages/api/src/realtime.ts` (server-only): `publishUser`, `publishUsers` (broadcast), `publishBatch`, `publishActivity`, `disconnectUser` over the HTTP API with `X-API-Key`, logging and swallowing failures; keep request-body building in a pure helper with a test; verify `bun test` passes and lint + typecheck pass for `@repo/api`
- [x] 2.4 Add the protected ORPC procedure `realtime.token` returning a 10-minute HS256 JWT `{ sub }` signed with `jose`; claims building in a pure, tested function; verify an unauthenticated call is refused and a signed-in call returns a token Centrifugo accepts on the local stack (read-only: no data written); lint + typecheck + build pass for `@repo/api` and `web`

## 3. Publishers (dual publish: Centrifugo and the existing Valkey channel)

- [x] 3.1 Add `loadConversationRow(me, id)` to `services/chat/inbox.ts` reusing `listConversations`' select with an id filter; verify for an existing conversation it returns the same row the list endpoint returns for that viewer (read-only); lint + typecheck pass for `@repo/api`
- [x] 3.2 In `sendMessage`, after commit, build one `chat_message` per member with `toChatMessages(rows, memberId)`, `loadConversationRow`, `unreadConversationCount`, `requestConversationCount`, and send them in one `publishBatch`; offer messages keep `chat_changed`; verify read-only that the payload a flagged message would publish has the caution only in the recipient's copy (inspect the built batch without sending); lint + typecheck pass for `@repo/api`
- [x] 3.3 Route `publishNotify`'s other events (`chat_changed`, `chat_typing`, `chat_unsent`, `notifications_changed`) from `services/chat`, `services/offer`, `routers/notifications.ts` and `mod-console.ts` through `realtime.ts` as well as Valkey; verify by grep that every `publishNotify` call site also reaches `realtime.ts`; lint + typecheck pass for `@repo/api`
- [x] 3.4 Make the ban path in `mod-console.ts` call `disconnectUser` alongside `publishSessionRevoked`; verify read-only up to the request boundary (the disconnect request body and code 4501); lint + typecheck pass for `@repo/api`
- [x] 3.5 Publish through `realtime.ts` in worker `lib/trade-publish.ts` and `job/want-alerts` alongside the Valkey publish. Leave `publishAll`'s reputation cache delete (`DEL rep:<id>`) as it is, and fix its comment to say a completed or failed trade; verify lint + typecheck + build pass for `worker`
- [x] 3.6 Add worker job `activity-relay`: subscribe Valkey `transfers`, run the enrichment moved from `packages/api/src/activity.ts` into a shared function, `publishActivity` the batch; start it from `apps/worker/src/index.ts`; verify on the local stack, where the worker only reads `transfers` from the root `.env` Valkey and publishes only to the local Centrifugo, that an indexed transfer batch lands in `activity:feed` history (Centrifugo `history` API); lint + typecheck + build pass for `worker` and `@repo/api`

## 4. Client

- [x] 4.1 Add `centrifuge` to the root catalog and `apps/web`; add `apps/web/src/lib/realtime.ts`: a lazy per-tab `Centrifuge` singleton on `VITE_CENTRIFUGO_URL` or same-origin `/connection/websocket`, `getToken` calling `realtime.token` (empty token when signed out, `UnauthorizedError` on refusal); verify the dev server connects one socket per tab, signed in and signed out; lint + typecheck + build pass for `web`
- [x] 4.2 Put the thread and list cache patches for `chat_message` in a pure module (append with id dedupe, upsert the row into the matching unfiltered box list, set badge counts) beside `features/chat/queries.ts`, with tests for dedupe, ordering and the box match; verify `bun test` passes; lint + typecheck pass for `web`
- [x] 4.3 Rewrite `use-user-socket.ts` on the singleton: handle server-side `publication`s by `realtimeEventSchema`, run today's open routine only when `subscribed` is not a successful recovery (design §7), set `useUserSocketLive` from connection state, map disconnect code 4501 to the sign-out path; verify in two browser tabs on the dev stack that a message appears in the other tab with no `chat.thread` or `chat.list` request in the network log (local database only, with the user's approval for test data); lint + typecheck + build pass for `web`
- [x] 4.4 Rewrite `use-activity-socket.ts` on the singleton: subscribe `activity:feed`, seed from `history({ limit: 50, reverse: true })`, keep hover-hold and id dedupe; verify on `/activity` signed out that live rows arrive and a 20-second offline toggle in DevTools adds the missed rows once each; lint + typecheck + build pass for `web`

- [x] 4.5 Add `previousMessageId: number | null` to `chat_message` in `schemas/realtime.ts`, read in `sendMessage`'s transaction as the conversation's `last_message_id` before the append (design §4, "Gaps between live messages"), and pass it through `buildChatMessages`. In `live-message.ts`, append only when the cached thread's newest id equals `previousMessageId` (a duplicate stays a no-op); otherwise report a gap so `applyChatMessage` calls `fetchNewer` for that conversation. Add tests: in order, duplicate, gap, first message (`previousMessageId` null on an empty thread). Verify on the local stack that a lost publish heals: send one message with the recipient's tab open but its `chat_message` withheld (for example, publish the next send's event through the local server API with its real `previousMessageId` while skipping the one before), and check the tab fetches and shows both in order. Stopping Centrifugo doesn't test this, since the reconnect refetch would hide it. `bun run check` passes; lint, typecheck and build pass for `@repo/api` and `web`.

## 5. Verification against the specs

- [x] 5.1 Walk the delta scenarios in `specs/web-chat`, `specs/web-notifications` and `specs/web-activity` on the local stack (cross-origin refusal, no session, sign-out renewal refusal, short vs long drop, ban read-only up to the disconnect request); record each as passed or read-only verified in this file; `bun run check` and `bun run build` pass

Walked on the local stack (local Postgres and Valkey, memory-engine Centrifugo, two test users `rt-test-a`/`rt-test-b` and a test moderator in the local database, signed with the local auth secret; Chrome DevTools contexts per user). "Passed" means exercised end to end; "read-only verified" means checked up to the request boundary.

web-chat
- Live: passed. With both threads open, a send showed in the other tab with no `chat.thread` request; on `/messages?box=requests` the row and the Requests badge updated with no list or count request. The recipient's own mark-read then echoes a `chat_changed` and refetches the lists, as before.
- Viewer's own view: passed. A flagged send ("send first pls, pay to wise") showed the caution in the recipient's tab and none in the sender's other tab.
- Short drop: passed. 3 messages sent while the recipient was offline for about 20 s appeared in order on reconnect, with no thread refetch succeeding after it.
- Offline then back: passed by proxy. A 10-minute drop cannot be waited out, so the replay window was ended by restarting the memory-engine Centrifugo (history lost); the 3 missed messages appeared in order on reconnect through the refetch path.
- Not a member: passed. A client with a valid token for user A got `103 permission denied` subscribing to `user:#<B>`; an anonymous client got the same for both users' channels.

web-notifications
- Live arrival: passed. A moderator warning made the recipient's bell read "1 unread" within 3 s.
- Cross-site page: passed. An upgrade with `Origin: https://evil.example` got 403 and no events.
- No session: passed. An anonymous connection cannot subscribe to any `user:` channel, a forged token is disconnected (3500), and an unauthenticated `realtime.token` call gets 401.
- Signed out elsewhere: passed. With the session expired in the database, the tab's token renewal was refused, the connection ended without reconnecting and the tab went to the sign-in page. The renewal was triggered through the dev module rather than waiting out the 10 minutes.
- Banned: passed against the local database, through the real `moderation.act` ban. Both of the user's tabs lost their connection within 3 s, did not reconnect for 15 s and showed the sign-in page.

web-activity
- Hover holds: passed. No row moved while the pointer was over the table; on leave the 3 held rows appeared on top, highlighted.
- Short drop: passed. 4 rows published during a 20 s offline toggle appeared once each, in order, highlighted as one batch.
- Signed out: passed. A visitor with no session received live rows over one anonymous connection, and the history seeded a new page.

`bun run check` and `bun run build` (web, worker) pass.

Gap between live messages (task 4.5), local stack with a second pair of test users: with the recipient's thread open, an in-order send appended with no `chat.thread` request (only the reader's own mark-read and list echo followed), and the first message of a conversation appended to an empty thread. With one message inserted in the local database and never published, the next send's event carried the real `previousMessageId`; the tab did not append it, fetched through `chat.thread`, and showed both messages in order.

## 6. Removal (after the client has been live for a day; needs the user's go-ahead)

- [ ] 6.1 Remove the `/ws` and `/ws/me` upgrades and websocket handlers from `apps/web/server.ts`, delete `apps/web/dev-websocket.ts`, the `dev:ws` script, `VITE_ACTIVITY_WEBSOCKET_URL` and `VITE_USER_WEBSOCKET_URL`; verify by grep that nothing references them; lint + typecheck + build pass for `web`
- [ ] 6.2 Delete `packages/api/src/user-socket.ts` and `packages/api/src/activity.ts`, the Valkey publishes added beside Centrifugo in §3 (but keep the reputation cache delete in `trade-publish.ts`, which is cache invalidation, not a nudge), `notifyChannel`/`NOTIFY_PREFIX` and `userSocketMessageSchema`; verify by grep and `bun run knip` that none remain; lint + typecheck + build pass for `@repo/api`, `worker` and `web`
- [ ] 6.3 Update `AGENTS.md` (real-time row, embedded WebSocket server wording, Docker services) and `.env.example`; verify both describe Centrifugo and no longer mention the embedded server

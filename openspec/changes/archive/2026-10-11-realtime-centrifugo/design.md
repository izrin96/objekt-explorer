## Context

See proposal.md for why. Today:

- `apps/web/server.ts` upgrades `/ws` (public activity) and `/ws/me` (per user, after `authorizeUserSocket` checks `Origin` and the Better Auth session). `dev-websocket.ts` serves the same on :3001 in dev.
- `/ws/me`: `packages/api/src/user-socket.ts` subscribes `notify:<userId>` on Valkey per user with an open socket and relays frames matching `userSocketMessageSchema` (`notifications_changed`, `chat_changed`, `chat_typing`, `chat_unsent`); `session_revoked` closes sockets with 4001. Publishers: `publishNotify` / `publishSessionRevoked` (api: chat `send.ts`, `notify.ts`, offer `state.ts`, `index.ts`, `mod-console.ts`, `routers/notifications.ts`), worker `trade-publish.ts` and `want-alerts` (`redis.publish(notifyChannel(id), "1")`).
- `/ws`: `packages/api/src/activity.ts` subscribes the indexer's Valkey `transfers` channel, enriches each batch (`fetchPublicNicknames`, `mapOwnedObjekt`), keeps the last 50 in memory and broadcasts; a client asks for that history with `request_history` on open.
- Client: `use-user-socket.ts` reconnects with backoff and, on every open, refetches notifications, chat and offer lists, every cached thread (`fetchNewerEverywhere`) and unsends (`syncUnsentEverywhere`). Messages arrive as nudges; `fetchNewer` then calls `chat.thread({ after })`.
- Thread messages are viewer-specific: `toChatMessages(rows, viewerId)` sets `mine`, hides the caution from its sender, and builds the offer view for that viewer.

## Goals / Non-Goals

**Goals:**
- One real-time server for both feeds; the web process holds no sockets and no Valkey subscriptions.
- A chat message reaches an open thread with its content; short gaps are replayed, not refetched.
- Every publish keeps today's server-side checks (blocks, mutes, Seen-and-typing settings).

**Non-Goals:**
- Client-side publishing, RPC over the socket, presence, Centrifugo PRO.
- Changing the indexer or the staging `transfers-relay` job.

## Decisions

### 1. Self-hosted Centrifugo v6 with the Redis engine on the existing Valkey
One `centrifugo/centrifugo:v6` container, `engine.type: redis` pointing at the stack's Valkey with a `centrifugo` key prefix. History and recovery state then survive a Centrifugo restart, and a second node can be added without changes.
- *Alternative: memory engine.* Simpler, but a restart drops all history, so every tab falls back to a full refetch on each deploy.

**Each stack's Centrifugo uses its own Valkey, set separately from `REDIS_URL`.** Centrifugo nodes broadcast to each other through the engine, so two stacks sharing one Valkey and prefix would deliver each other's publications: a local test message to `user:#<id>` would reach that user's open tabs on staging. The engine therefore takes its address from Centrifugo's own setting (`engine.redis.address`, set through `CENTRIFUGO_ENGINE_REDIS_ADDRESS`), never from the app's `REDIS_URL`, which a local run inherits from the root `.env` (staging). Local dev runs `engine.type: memory`, or the Valkey from `docker-compose.yml`; staging and production each point at their own Valkey.
- *Alternative: keep Bun sockets and add our own history in Valkey streams.* That is rebuilding Centrifugo's recovery protocol by hand.

### 2. Connection JWT minted by the web app, not the connect proxy
A new ORPC procedure `realtime.token` (protected) returns an HS256 JWT `{ sub: userId, exp: now + 10 min }` signed with `CENTRIFUGO_TOKEN_SECRET` via `jose`. centrifuge-js calls it through `getToken` on connect and before expiry; a refused call (no session) ends the connection for good. Signed-out tabs pass no token and connect anonymously, which only the public activity namespace accepts. `client.allowed_origins` is `[SITE_URL]`, keeping the cross-site refusal.
- *Alternative: connect proxy forwarding `Cookie`.* Centrifugo would call the web app on every connect and reconnect, so a web deploy or overload storms reconnects; it also needs Centrifugo on the same cookie domain. The JWT path makes connects independent of the web app for 10 minutes.
- Session revocation is handled by Decision 6 rather than by waiting for expiry.

### 3. One client per tab, server-side personal subscription
A module singleton `apps/web/src/lib/realtime.ts` owns one `Centrifuge` instance per tab, created lazily. `user_subscribe_to_personal: true` with namespace `user` subscribes each authenticated connection to `user:#<userId>` server-side; the `#` user boundary means no client can subscribe another user's channel, and the client never names it. `/activity` adds a client-side subscription to `activity:feed` on the same connection, so a signed-in tab holds one socket instead of two.

Namespaces:
- `user`: `history_size: 100`, `history_ttl: 300s`, `force_recovery: true`.
- `activity`: `history_size: 50`, `history_ttl: 3600s`, `force_recovery: true`, subscribe and history allowed for clients and anonymous connections, publish not allowed.

`useUserSocket` and `useActivitySocket` keep their names and their `useUserSocketLive` contract, so callers do not change. The existing `stores/user-socket.ts` store is reused rather than adding a new one.

### 4. Typed events with per-viewer chat payloads
`userSocketMessageSchema` in `schemas/notification.ts` becomes `realtimeEventSchema` (moved to `schemas/realtime.ts`):

| Event | Payload | Client action |
| --- | --- | --- |
| `chat_message` | `conversationId`, `message: ChatMessage`, `previousMessageId` (the conversation's message before this one, or null), `collections`, `conversation` (the viewer's inbox row), `unread`, `requests` | append to the cached thread (dedupe by id) only when its newest message is `previousMessageId`, else `fetchNewer` for that conversation, upsert the row in the matching unfiltered box list, set both badge counts; searched lists (`q`) are invalidated |
| `chat_changed` | `conversationId` | as today: lists invalidated, `fetchNewer` (reads, accepts, settings, offer state) |
| `chat_typing` | `conversationId` | `showTyping` |
| `chat_unsent` | `conversationId`, `messageId` | `applyUnsent` |
| `notifications_changed` | — | invalidate notification keys |

`sendMessage` builds the payload once per member with `toChatMessages(rows, memberId)` and a new `loadConversationRow(memberId, id)` that reuses `listConversations`' select with an id filter, so the live copy is exactly what the endpoints would return for that viewer. Text and card messages publish `chat_message`; offer messages, whose card changes with offer state, and everything else keep `chat_changed`.
**Gaps between live messages.** Centrifugo replays what a dropped connection missed, but not a publish that never reached it: a server API call that failed or timed out. A tab that then appends the next message by id would skip the lost one for good, since later fetches only ask for messages newer than its newest. So `chat_message` carries `previousMessageId`, read in the same transaction that appends the message (the conversation's `last_message_id` before the update), and the client appends only when its cached thread ends at that id. Otherwise it calls `fetchNewer`, which returns the lost message and the new one together. A thread that isn't cached ignores the event as before. An offer message in between (published as `chat_changed`) can also make the ids differ; the result is one extra `fetchNewer`, which is harmless.
- *Alternative: one shared payload with the viewer fields computed client-side.* The sender's tabs would receive the caution the server hides from them, and the client would duplicate the viewer logic in `toChatMessages`.

### 5. One server-API client for every publisher
`packages/api/src/realtime.ts` (server-only) wraps Centrifugo's HTTP API with `X-API-Key`: `publishUser(userId, event)`, `publishUsers(userIds, event)` (one `broadcast`), `publishActivity(batch)`, `disconnectUser(userId)`. Several per-viewer publishes go in one `batch` call. Failures are logged and swallowed as `publishNotify` does today: a lost event is recovered by the next refetch, and a publish must never fail a committed write. It runs only after the transaction commits, as now. The worker imports it like it imports the schemas today.

### 6. Ban disconnects with a terminal code
`publishSessionRevoked` becomes `disconnectUser(userId)`: the server API `disconnect` with code `4501`, reason `session_revoked`. Codes 4500–4999 tell centrifuge-js not to reconnect. The client's `disconnected` handler maps 4501 to today's sign-out path (`currentUserOptions` invalidate + `router.invalidate()`); the existing `SESSION_REVOKED_CLOSE_CODE` constant moves to the shared schema module so the client stops hard-coding it.

### 7. Recovery first, refetch only when it fails
On the personal subscription's `subscribed` event: `ctx.wasRecovering && ctx.recovered` means Centrifugo replayed the gap, so nothing is refetched. Otherwise (first connect, gap older than 300s or past 100 events) the current open routine runs: notifications, chat and offer lists, `fetchNewerEverywhere`, `syncUnsentEverywhere`. A replayed `chat_message` whose id the thread already holds is dropped.

### 8. The worker enriches and publishes transfers
A new worker job `activity-relay` subscribes Valkey `transfers` with `createSubscriber`, runs the enrichment moved verbatim from `activity.ts`, and calls `publishActivity`. `/activity` reads the last 50 with `sub.history({ limit: 50, reverse: true })` after subscribing, replacing `request_history`; rows already shown are skipped by transfer id as today.
- *Alternative: keep enrichment in the web process.* It would keep a Valkey subscription per web replica, each publishing the same batch.

### 9. Same-origin routing
Traefik routes `PathPrefix(/connection)` on the site host to `centrifugo:8000`. In dev, Vite proxies `/connection` (with `ws: true`) to `localhost:8000`, replacing `dev:ws` and both `VITE_*_WEBSOCKET_URL` overrides; `VITE_CENTRIFUGO_URL` stays an optional override. Centrifugo's admin UI and `/api` are not exposed publicly.

## Risks / Trade-offs

- [A local or staging Centrifugo on another stack's Valkey cross-delivers publications] → the engine address is Centrifugo's own setting, never `REDIS_URL`; local dev uses the memory engine (decision 1).
- [Removing the Valkey publishes also removes the reputation cache delete in `trade-publish.ts`] → that `DEL rep:<id>` is cache invalidation, not a nudge; it stays in Valkey after §6 (tasks 3.5, 6.2).
- [Centrifugo or its route is down] → the tab falls back to focus and 60-second polling, as with a dead socket today; Docker `restart: always` and a healthcheck on `/health`.
- [Worker down stops the activity feed] → the feed's first page still loads by HTTP; worker restarts are already supervised. Previously the web process owned it.
- [Per-viewer payloads double send-path work: two `toChatMessages` and two row loads] → both are single-row queries; `sendMessage` already runs one `toChatMessages`. Measure on staging.
- [Payload size: a card message carries collections] → one or two collections per message, well under Centrifugo's 64 KB default; offers keep the nudge.
- [Rollout drops every open socket once] → clients reconnect with backoff and refetch, the same as a web deploy today.
- [HS256 secret shared by web and Centrifugo] → a dedicated `CENTRIFUGO_TOKEN_SECRET`, never `BETTER_AUTH_SECRET`.

## Migration Plan

1. Add Centrifugo to compose and Dokploy, the `/connection` route, and the env vars; deploy it with nothing connecting.
2. Ship server and worker publishing to Centrifugo **and** Valkey (dual publish), plus the token procedure, while clients still use `/ws` and `/ws/me`.
3. Ship the client on Centrifugo. Old open tabs keep working on the dual-published Valkey path until they reload.
4. After a day, remove `/ws`, `/ws/me`, `user-socket.ts`, `activity.ts`, `dev-websocket.ts`, the Valkey publishes and the old env vars.

Rollback: before step 4, revert the client; the dual publish keeps `/ws/me` working.

## Open Questions

- Whether Dokploy's Traefik needs an explicit WebSocket timeout raise for `/connection` (Centrifugo pings every 25s, so the default should hold).

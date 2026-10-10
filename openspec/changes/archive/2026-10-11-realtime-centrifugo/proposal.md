## Why

Real-time delivery is hand-rolled: the web process holds every WebSocket (`/ws`, `/ws/me`), keeps a per-user Valkey subscription per open account, and relays bare "refetch" nudges. Anything published while a socket or the Valkey link is down is lost, so every reconnect refetches every list and every cached thread, and each chat message costs the recipient a second round trip. Holding sockets in the web process also ties them to its deploys and drains. Centrifugo gives us a dedicated, horizontally scalable real-time server with channel history, gap recovery, presence and a server API, so the web process goes back to serving HTTP.

## What Changes

- Add a self-hosted Centrifugo v6 service (Redis engine on each stack's own Valkey, configured separately from `REDIS_URL`; memory engine in local dev) to `docker-compose.yml`, the dev stack and the deploy. Browsers connect to it directly over `/connection/websocket` on the site's origin.
- **BREAKING (internal)**: remove the `/ws` and `/ws/me` upgrades from `apps/web/server.ts`, `dev-websocket.ts`, `packages/api/src/user-socket.ts`, the activity relay in `packages/api/src/activity.ts`, and the `notify:<userId>` Valkey channels. `redis-subscriber.ts` stays only for the worker's transfer relay.
- Connection auth: a new ORPC procedure mints a short-lived Centrifugo connection JWT for the signed-in user; the client refreshes it through `getToken`. No session, no token.
- Each user is subscribed server-side to a personal channel `user:#<userId>` with history and forced recovery.
- **Full payloads for chat**: a sent message is published to each member as that member sees it (the same `ChatMessage` the thread endpoint returns for that viewer, plus its collections and the inbox row), so the open thread appends it and the inbox patches it with no refetch. Unsend, typing, Seen and notification changes become typed events on the same channel.
- Publishers (`packages/api` services, worker `trade-publish`, `want-alerts`) publish through one small Centrifugo server-API client instead of `redis.publish`.
- A ban disconnects the user through the server API with a terminal code, so their tabs sign out and do not reconnect.
- The activity feed becomes a public `activity:feed` channel. The worker subscribes to the indexer's existing Valkey `transfers` channel, enriches the batch (nicknames, `mapOwnedObjekt`) as the web process does now, and publishes it; channel history (50) replaces the in-memory `transferHistory`.
- The client hooks `use-user-socket.ts` and `use-activity-socket.ts` move to `centrifuge` (centrifuge-js); `useUserSocketLive` keeps its meaning.

Routes covered: `/messages`, `/messages/<id>`, the bell and Messages badge on every signed-in route, `/activity`, `/mod/reports` (ban), and the removed `/ws`, `/ws/me`.

## Non-goals

- No change to the indexer: it keeps publishing `transfers` to Valkey.
- No client-to-client publishing: every publish still goes through the server, which applies blocks, mutes, Seen-and-typing settings and rate limits.
- No presence UI ("online now") and no Centrifugo PRO features.
- No change to how messages are stored, paged or fetched on open; the thread endpoint stays the source of truth after a long gap.
- Offers and trades keep their notification nudges; only chat gets full payloads.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-chat`: Realtime delivery carries the message itself and recovers short gaps without refetching.
- `web-notifications`: Open tabs stay current over a token-authenticated connection that ends when the session ends.
- `web-activity`: Live updates fill the gap after a short drop, and a new page starts from the recent live history.

## Impact

- New service: Centrifugo (container image `centrifugo/centrifugo:v6`), new env `CENTRIFUGO_URL`, `CENTRIFUGO_API_KEY`, `CENTRIFUGO_TOKEN_SECRET`, `CENTRIFUGO_ENGINE_REDIS_ADDRESS` (Centrifugo's own engine address, never taken from `REDIS_URL`), `VITE_CENTRIFUGO_URL` (optional, same-origin by default); `VITE_ACTIVITY_WEBSOCKET_URL`, `VITE_USER_WEBSOCKET_URL` and `dev:ws` removed.
- Reverse proxy (Dokploy/Traefik) routes `/connection/` on the site origin to Centrifugo.
- Code: `apps/web/server.ts`, `apps/web/dev-websocket.ts`, `apps/web/src/features/{notifications,activity,chat}`, `packages/api/src/{user-socket,activity}.ts`, `packages/api/src/services/{chat,offer,mod-console}`, `packages/api/src/routers/notifications.ts`, `packages/api/src/schemas/notification.ts`, `apps/worker/src/lib/trade-publish.ts`, `apps/worker/src/job/want-alerts`, a new worker activity relay.
- Dependencies: `centrifuge` (client) in the catalog; JWTs signed with `jose`, already in `@repo/lib`.

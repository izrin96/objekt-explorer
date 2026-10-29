## Context

- Every signed-in tab already holds one Centrifugo connection. `useUserSocket` mounts in `components/layout/app-nav.tsx`, and `subscribe_to_user_personal_channel` subscribes that connection, on the server side, to `user:#<id>` (`userChannel` in `packages/api/src/schemas/realtime.ts`).
- Centrifugo (`centrifugo/config.json`, image `centrifugo/centrifugo:v6`) runs the `memory` engine locally; staging and production switch it to their own Valkey through `CENTRIFUGO_ENGINE_TYPE` and `CENTRIFUGO_ENGINE_REDIS_ADDRESS` (`docker-compose.yml`), so there presence lives in Valkey. Its namespaces have no presence yet, and it reads its config only on start.
- The server talks to Centrifugo through `packages/api/src/realtime.ts`. Its `call()` is fire-and-forget and never returns a reply; request bodies are built in the pure `lib/realtime-requests.ts`.
- Account-wide visibility settings live on `user`: `show_social` is a Better Auth additional field (`services/auth.ts`, `returned: true`), saved by `user.updateAccount` from the General form (`features/account/sections/general.tsx`), which saves on Save and then invalidates every query. Chat-only settings (`allow`, `show_activity`) live in `message_pref`.
- Blocks are checked with `notBlockedEither` (`services/safety`).
- The places that show a dot already carry the person's user id:
  - conversation rows and the thread header: `partner.user`;
  - Trade person rows: `person.userId`, rendered in `TradeHeader`;
  - the profile: `profile.userId`, set only when the profile belongs to a linked account.
- Browse and For you are virtualized (virtua), and their payloads are cached: the matches cache, and stale-while-revalidate on `trade-feed`.

## Goals / Non-Goals

**Goals:**
- One cheap request per visible tab every 30 s, however many rows are on screen.
- No presence in cached or SSR payloads.
- Visibility rules applied on the server only.

**Non-Goals:**
- Pushing presence changes. Join/leave on `user:#X` reaches only X's own connections, so it would need a new fan-out.

## Decisions

### 1. Presence from Centrifugo, read in one batch
Turn on `presence: true` for the `user` namespace. A person is online when `presence_stats` on `user:#<id>` reports `num_clients > 0`. For N people the server sends one `POST /api/batch` with one `presence_stats` command per channel. The replies come back in the same order, each either `{ presence_stats: { num_clients, num_users } }` or `{ error }`.

The request builder and the reply parser live in the pure `packages/api/src/lib/presence.ts`, next to `realtime-requests.ts`, and are tested. A new `query(request)` in `realtime.ts` returns the parsed JSON, or `null` when Centrifugo is unset, times out or answers non-2xx. It makes one attempt with no retry, because the next poll is the retry. An error reply, or `null`, counts as offline (fail closed).

- *Rejected: a `last_seen_at` column touched by a heartbeat.* It means a write per tab per interval on the production database, and it duplicates what Centrifugo already tracks.
- *Rejected: N separate `presence_stats` calls.* That is N round trips.
- If, against a local v6, batch turns out to reject `presence_stats`, fall back to `Promise.all` of single calls behind the same `query` function. The spec does not change.

### 2. A separate `presence.online` procedure, polled
`presence.online({ userIds: string[] })` is authed. It takes at most 100 unique ids and returns `{ online: string[] }`. It is not folded into `trade.browse`, `trade.forYou`, `chat.list` or `chat.thread`: those are cached or SSR'd, so presence there would either bust the cache or go stale. The procedure lives in a new `routers/presence.ts`, because it serves Trade and profiles as well as chat.

`services/presence.ts` `onlineAmong(viewerId, ids)`:
1. Drop the viewer's own id.
2. One query reads `user.show_online` for every asked id, and drops any id with a block either way (`notBlockedEither`). The viewer's own switch is not read: it hides only them.
3. Batch the ids that are left and return the online ones.

The rule is `showsOnlineTo({ shownShows, blocked, self })` in `lib/presence.ts`, and it is tested. It does **not** reuse `showsActivityTo`, because it has no request rule: Trade rows already show the dot to any signed-in viewer, so hiding it inside a chat request would protect nothing.

Limit: `userRateLimited("presence", userId, 60, 60)`, shared by every tab and device of the account. A visible tab ticks twice a minute, and each scroll stop or return to the tab adds a check, so 60 leaves room for fast scrolling and two windows. Over the limit, the procedure refuses, and the client treats that as "no change" and keeps waiting for the next tick. No Redis cache: the rule query reads by primary key, and the batch runs with `parallel: true`, so on the Valkey engine a hundred lookups don't run one after another into the 1.5 s timeout.

### 3. Client: one watched-ids store, one poller
New `apps/web/src/features/presence/`:

- `watch.ts` (pure, tested). Refcounted `watch`/`unwatch` over a `Map<string, number>`, `dueIds(watched, lastChecked, now)`, and chunking into groups of 100.
- `stores/presence.ts` (Zustand). Holds `online: Record<string, true>` and the refcounts. Components read it through selectors only.
- `useOnline(userId | undefined)`. Watches the id for as long as the component is mounted and returns `online[userId] === true`. It returns false before hydration, so SSR and the first client render match.
- `usePresencePoller()`. Mounted once beside `useUserSocket()` in `app-nav.tsx`, for signed-in users only. While `document.visibilityState === "visible"` it checks every watched id every 30 s, and checks ids that are newly watched after a 300 ms debounce. It checks everything at once when the tab comes back to the front. Each response replaces the online state of the ids it asked about.
- `OnlineAvatar`. Takes `PersonAvatar`'s props plus `userId`. It wraps the avatar in a `relative` span and adds the dot: `bg-success` from `lib/tone.ts`, `ring-2 ring-background`, bottom-end, and an sr-only "Online". It replaces `PersonAvatar` in `conversation-list.tsx`, `thread-header.tsx`, `trade-header.tsx` (except the `you` row) and `profile-header.tsx` (only when `userId` is set and it is not the viewer's own profile). The thread header also adds a visible "Online" to its secondary line.

Virtua unmounts rows that are off screen, so the watched set is exactly the rows on screen.

Why a new store: none of the existing ones fit. `stores/chat-typing.ts` is keyed by conversation and driven by socket pushes, and React Query keyed on the visible id set would make a new query on every scroll.

- *Rejected: put `userId` on `PersonAvatar` and read presence inside it.* That would tie a shared component, used by the hover card, Market and others, to a signed-in poller.

### 4. The setting
- Add `show_online boolean not null default true` to `user` in `packages/db/src/auth-schema.ts`, beside `show_social`, and generate the migration.
- Declare it in Better Auth's `additionalFields` (`services/auth.ts`) as `showOnline`, `returned: true`, `input: false`, so the current user carries it to the General form, and only `user.updateAccount` writes it.
- `updateAccountInputSchema` gains `showOnline: z.boolean().optional()`. A tab opened before the deploy sends no `showOnline` and still validates; `updateAccount` sets the column only when the field is present, so that tab's Save leaves it as it was.
- The switch sits under the show-social switch in `sections/general.tsx`, as form state saved by the section's Save. It hides only the user's own dot, so saving it leaves the dots this tab shows alone.
- No change limit and no notice to anyone, because nothing is pushed.
- `anonymizeUser` needs no change: a deleted account has no session, so it never has presence.

- *Rejected: `message_pref.show_online` in the Messages section.* The dot shows on Trade rows and profiles too, so the switch is about the account, not chat.

## Risks / Trade-offs

- **Prod Centrifugo needs restarting after the config change.** Until it restarts, `presence_stats` errors, which counts as offline, so dots just don't show. Deploy the config first, then web.
- **Slow Valkey on prod.** A batch that outlasts `query()`'s 1.5 s timeout reads as nobody online until the next tick; `parallel: true` keeps a full chunk to one round of lookups.
- **Background tabs count as online.** This is accepted and listed as a non-goal. Idle detection can come later without touching the server.
- **A crashed tab can stay online for up to about 25 s more**, until Centrifugo's ping timeout drops the connection. This is inside the 60 s budget.
- **Privacy.** A hidden user still has Centrifugo presence. Only the server can read it (API key), and the server filters it. Signed-out viewers get nothing, which prevents anonymous scraping of who is online.
- **Load.** It is bounded by visible tabs: at most 100 ids per 30 s per tab, and the user rate limit caps abuse.

## Migration Plan

1. Add `presence: true` to the `user` namespace in `centrifugo/config.json`, and restart Centrifugo locally and on prod with `docker compose … restart centrifugo`. `up -d` leaves a running container on its old config, and an unrestarted Centrifugo answers every `presence_stats` with error 108, which reads as offline: no dots and no error.
2. Generate the `user.show_online` migration. Applying it (local, staging, prod) needs the user's approval. Web must not deploy before prod is migrated: Better Auth reads `user` through the Drizzle table, which now includes `show_online`, so every session read and sign-up would fail site-wide, not just presence.
3. Deploy web. The worker is unaffected.

Rollback: redeploy the previous web. The column and the presence flag can stay.

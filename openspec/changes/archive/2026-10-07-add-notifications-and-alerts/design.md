## Context

See proposal.md for why. This change builds on `add-trade-for-you`, which supplies:
- `lists.updated_at`;
- `hidden_trade_partner`;
- the ownership verdicts in `services/trade-matches.ts`, from the read-only indexer;
- the `/trade/for-you?list=` target.

The current state that shapes this design:

- **Realtime:** `apps/web/server.ts` (Bun, production) upgrades `/ws` with no session and shares one `websocketHandlers` object from `@repo/api/activity`, which subscribes to Valkey `transfers`. Under `vite dev`, `server.ts` doesn't run. Instead, `dev:ws` (`apps/web/dev-websocket.ts`) serves `/ws` on port 3001. In dev, `VITE_ACTIVITY_WEBSOCKET_URL` points at production's `/ws`.
- **Two processes:** the worker is separate from the web server, and in dev the socket lives in a third process (`dev:ws`). Notifications created in one process can only reach sockets in another through Valkey.
- **Auth:** `auth.api.getSession({ headers })` from `packages/api/src/services/auth` is what the oRPC `authed` middleware uses, and it can run before `server.upgrade`.
- **Local development:** the app database and Valkey are local Docker. Writes, worker runs and Valkey publishes during development stay local.

## Goals / Non-Goals

**Goals:**
- A notification store and a per-user nudge channel that chat and offers can reuse.
- A socket that only nudges. The database is the truth, and every client path works with the socket absent.
- Alerts that are never duplicated and never missed because of commit ordering.

**Non-Goals:**
- Sending notification content over the socket.
- A generic event bus.
- Email or push delivery.

## Decisions

### D1. Notifications store data; the client renders the words
- **`notification`:** `id` serial, `user_id` fk to user (cascade), `type` text, `payload` jsonb, `group_key` text, `read_at`, `created_at`. Indexes: `(user_id, created_at desc)`, and a partial unique index on `(user_id, group_key)` where `read_at is null`.
- **`type` is text,** validated by a zod discriminated union in `packages/api/src/schemas/notification.ts` (`want_match` | `have_wanted` for now). Phases 3 and 4 add types without a migration. The client skips a type it doesn't know, so an older open tab never breaks on a newer notification.
- **`payload` holds data only:**
  - the list (`id`, `slug`, `name`);
  - `count`;
  - `latest`: up to three `{ collectionSlug, partnerName, sourceListSlug }`.

  The client turns it into text with Paraglide (`m.notification_want_match({ count, list })`), so it follows the viewer's language. Partner names are snapshots taken at creation. That's acceptable for an alert.
- **Grouping** is an upsert on the partial unique index. While a notification is unread, `count` increments and `latest` keeps the newest three, which a pure helper merges. A merge also sets `created_at` to now, so the updated notification moves to the top. Once read, the next match creates a new row. `group_key` is `<type>:<listId>:<YYYY-MM-DD>` in UTC. `notifications.list` returns a slug → `{ member, collectionNo, thumbnailImage }` map beside the page, so the client can show objekts without a second request. It hides read rows past 90 days even before the weekly prune deletes them.
- **`notification_pref (user_id, type, enabled)`:** a missing row means the type's default (`want_match` on, `have_wanted` off), so no backfill is needed.
- **`want_alert_sent (want_list_id, source_list_id, collection_slug)`** primary key enforces the once-only rule, which survives removing and re-adding an entry. Its rows older than 90 days are pruned with notifications. At worst, someone gets re-alerted about a listing after three months. Both directions share this key: an alert in one direction suppresses the other for the same want list, source list and collection. That only matters when both lists change, since each event triggers the direction whose list changed.
- **`lists.match_alerts`:** boolean, not null, default true. It's only read for want lists, and for the user's have and sale lists in reverse alerts.

*Alternative:* store rendered text. It would freeze the language at creation and bloat rows.

### D2. Alert job in the worker: id cursor plus an overlap window
`apps/worker/src/job/want-alerts.ts` runs every 5 minutes through the existing `safeRun`/`cron` pattern. Each run collects candidate entries from the union of:
1. `list_entries` with `id >` the cursor stored in Valkey at `alerts:cursor`;
2. the **overlap window**. A serial id is assigned at insert but becomes visible at commit, so a lower id can appear after the cursor has passed it. Each run records its time and the highest id it could see in `alerts:state.marks` (Valkey). It then re-reads every id above the mark recorded at least 10 minutes earlier. This works on the id index, because `list_entries.created_at` has none;
3. entries of lists that are discoverable now but weren't in the previous run's set (`alerts:state.discoverable`). That covers lists made discoverable after their entries were added. Comparing sets rather than `updated_at` can't lose a list whose `updated_at` bump lands just after a run reads it. Making a large list discoverable fires all of its never-sent matches in one run (672 in local testing), which grouping collapses to one notification per want list.

Then, for each candidate on a discoverable sale or have list:
- it finds want lists with `match_alerts` containing that collection, owned by other users with `want_match` enabled who haven't hidden the lister;
- it applies 1a's ownership verdict and the "already owns a copy" rule;
- it inserts into `want_alert_sent` with `on conflict do nothing`, and for each newly inserted key upserts the notification and publishes `notify:<userId>`.

Reverse alerts run the same steps with the roles swapped, gated on `have_wanted`. The overlap and re-reads are safe because `want_alert_sent` absorbs duplicates. The cursor advances to the batch's max id only after the batch commits. On the first run with no cursor, it starts at the current max id, so nothing old is replayed.

Selection after the queries (exclusions, pairing) is a pure function in `apps/worker/src/lib/want-alert-match.ts`, tested with `bun test`.

*Alternatives:*
- Notify inside the `addToList` handler: misses list toggles, ties one user's write latency to other users' alerts, and repeats code across write paths.
- A `created_at` cursor alone: clock and commit skew make it lossy too. The id cursor plus the window is cheaper and safe.

### D3. `/ws/me`: Origin and session checked before upgrade; Valkey for every nudge
`/ws/me`, in `server.ts` and in `dev-websocket.ts`:
1. compares `req.headers.get("origin")` with `new URL(SITE_URL).origin`, and refuses with 403 if they differ;
2. calls `auth.api.getSession({ headers: req.headers })`, and refuses with 401 if there's no session;
3. calls `server.upgrade(req, { data: { kind: "user", userId } })`.

The existing `/ws` upgrade passes `{ kind: "activity" }`. A combined handler dispatches on `ws.data.kind`, so activity behaviour is unchanged.

`@repo/api/user-socket` keeps a `Map<userId, Set<ServerWebSocket>>`. It subscribes to `notify:<userId>` when a user's first socket opens and unsubscribes when their last one closes, because Bun's `RedisClient` has no pattern subscribe. It sends `{ type: "notifications_changed" }` to that user's sockets. The worker publishes `notify:<userId>` itself, and depends on `@repo/api` only for pure modules. Everything that changes a user's notifications (the worker, `markRead`, `markAllRead`) calls `publishNotify(userId)`, which publishes on Valkey rather than touching the map. That's what lets a dev socket in `dev:ws` hear writes made in the vite process, and a future second web instance needs no change. Cookies on `localhost` are sent to every port, and in dev the page's `Origin` is still `SITE_URL`.

Messages carry no content. The client refetches, which keeps auth and shaping in one place. A socket left open after sign-out only ever learns "something changed". The client closes it on sign-out.

*Alternative:* polling only. Simpler, but alerts would lag a minute, and chat needs the socket anyway.

### D4. Client
- **Data:** `features/notifications/queries.ts`, with `orpc.notifications.unreadCount` (`refetchOnWindowFocus`, and `refetchInterval` 60 s while the socket is closed) and `orpc.notifications.list.infiniteOptions`.
- **Socket:** `use-user-socket.ts` copies the backoff from `use-activity-socket.ts`. It connects to the optional `VITE_USER_WEBSOCKET_URL` (`ws://localhost:3001/ws/me` in `.env.local`), and otherwise to same-origin `/ws/me`. It invalidates on `notifications_changed` and on reconnect, and mounts only with a session.
- **Bell:** built from `components/ui/popover`, `EmptyState` and `Skeleton`, with one renderer per notification type. It mounts once in the `app-nav.tsx` header, which is also the mobile top bar, so it sits outside the sheet at every width.
- **Settings:** the Notifications switches go in the account dialog's `general.tsx`, because these preferences are per account. The settings dialog holds per-browser device settings.
- **Alert me:** a `Switch` in `list-form.tsx`, shown for want lists only.

## Risks / Trade-offs

- **[A bulk add of hundreds of entries fans out to many want lists]** → Grouping caps it at one unread row per want list per day, and `want_alert_sent` stops repeats. The job processes at most a few thousand candidates per run and leaves the rest for the next run, which the cursor allows.
- **[The first production run floods users]** → The cursor starts at the current max id, and the overlap window only reaches 10 minutes back.
- **[UTC day boundaries]** → They only decide when a second notification for the same list can start.
- **[Payload names go stale]** → The names are labels in a notification. For you shows live data.

## Migration Plan

1. Generate the migration (`notification`, `notification_pref`, `want_alert_sent`, `lists.match_alerts`) after `add-trade-for-you`'s migration. Apply it to the local Docker database. Apply it to production only with the user's approval.
2. Deploy API and web: the bell and settings are live, with no alerts yet.
3. Deploy the worker: alerts start from the cursor set at its first run.

**Rollback:** redeploy the previous images. The new tables and column are additive.

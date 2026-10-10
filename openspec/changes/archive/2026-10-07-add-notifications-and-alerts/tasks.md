## 1. Schema and migration

- [x] 1.1 Confirm `add-trade-for-you` is applied: `lists.updated_at` and `hidden_trade_partner` exist locally, and the For you ownership verdict function is exported for reuse. Then add `notification`, `notification_pref`, `want_alert_sent` and `lists.matchAlerts` to `packages/db/src/schema.ts`, with the keys and indexes from design D1. `bun run typecheck --filter=@repo/db` passes
- [x] 1.2 Run `bun run --filter=@repo/db db:generate` and confirm by reading that the SQL only adds tables, a column and indexes. Apply it to the local Docker database with `db:migrate` and confirm with `\d notification` that the partial unique index exists. Never apply it to production without the user's approval

## 2. Notifications API

- [x] 2.1 Add `schemas/notification.ts`: the zod discriminated union over `type` (`want_match`, `have_wanted`) with data-only payloads (design D1), plus the output schemas. Add `matchAlerts` to the list create and update inputs as optional, so old `/rpc` inputs validate, and persist it for want, have and sale lists. Lint and typecheck pass for `@repo/api`
- [x] 2.2 Add `packages/api/src/lib/notification-group.ts` (pure): the `group_key` format and the payload merge (increment the count, keep the newest three). Add `notification-group.test.ts`. `bun test` passes; lint and typecheck pass for `@repo/api`
- [x] 2.3 Add `packages/api/src/user-socket.ts`: the per-user socket map, `psubscribe('notify:*')`, `publishNotify(userId)` and open/close handlers, exported as `@repo/api/user-socket`. Lint and typecheck pass for `@repo/api`
- [x] 2.4 Add `routers/notifications.ts` with these authed procedures, each scoped to `session.user.id`, registered in `routers/index.ts` but not in `openApiRouter`:
  - `list` (cursor of 20, unknown types dropped);
  - `unreadCount`;
  - `markRead({ ids })`, ignoring ids that aren't the caller's;
  - `markAllRead`;
  - `prefs` and `setPref({ type, enabled })`.

  The mark-read procedures call `publishNotify`. Against the local database, marking another account's id read changes nothing. Lint and typecheck pass for `@repo/api`

## 3. Per-user socket

- [x] 3.1 In `apps/web/server.ts`, add the `/ws/me` upgrade from design D3 (Origin, then session, then upgrade with `{ kind: "user", userId }`). Tag `/ws` with `{ kind: "activity" }`, and dispatch handlers on `ws.data.kind`. Add the same `/ws/me` branch to `apps/web/dev-websocket.ts`. `bun run build --filter=web` passes. With `dev:ws` running:
  - a foreign `Origin` gets 403;
  - a cookieless request gets 401;
  - `/ws` still accepts the activity client.

## 4. Worker

- [x] 4.1 Add `apps/worker/src/lib/want-alert-match.ts` (pure): given candidate entries, matching want lists, ownership verdicts, holdings, prefs and hidden pairs, return the alerts to record after every exclusion in the `web-notifications` spec, for both directions. Add `want-alert-match.test.ts` covering own lists, hidden partner, not owned, not transferable, already owns a copy, Alert me off, pref off, and reverse off by default. `bun test` passes; lint and typecheck pass for `worker`
- [x] 4.2 Add `job/want-alerts.ts` as in design D2:
  - the `alerts:cursor` id cursor, set to the max id on its first run;
  - the 10-minute overlap window;
  - lists made discoverable since the last run, through `updated_at`;
  - `want_alert_sent` insert `on conflict do nothing`;
  - the notification upsert;
  - `publishNotify` for each affected user;
  - the cursor advanced only after the batch commits.

  Register it every 5 minutes with `safeRun` in `apps/worker/src/index.ts`. Lint and typecheck pass for `worker`
- [x] 4.3 Add `job/prune-notifications.ts`: delete read notifications created more than 90 days ago, and `want_alert_sent` rows older than 90 days. Schedule it weekly with no startup run. Lint and typecheck pass for `worker`

## 5. Web

- [x] 5.1 Add the en, ja and ko messages: the bell's label, the popover title, empty state, Mark all read, load more, the `want_match` and `have_wanted` texts with count and list, the Notifications section and its two switches, and Alert me. `paraglide:compile` runs clean; lint and typecheck pass for `web`
- [x] 5.2 Add `VITE_USER_WEBSOCKET_URL` (optional) to `lib/env/client.ts` and set it in `.env.local`. Add `features/notifications/queries.ts` and `use-user-socket.ts` as in design D4. Lint, typecheck and build pass for `web`
- [x] 5.3 Build `features/notifications/notification-bell.tsx`:
  - the unread badge, showing `9+` above nine;
  - a `Popover` holding the infinite list, with one renderer per type, the unread marker and relative time;
  - Mark all read;
  - each item marks itself read and navigates to its target.

  Mount it in `app-nav.tsx` next to the account area, and in `mobile-nav.tsx`'s top bar. Lint, typecheck and build pass for `web`
- [x] 5.4 Add the Notifications switches to `features/account/account-dialog/general.tsx`, and Alert me to `list-form.tsx` for want lists. Lint, typecheck and build pass for `web`

## 6. Verification

- [x] 6.1 Run `bun run check` and `bun run build --filter=web` from the root; both pass
- [x] 6.2 Locally, with `bun run dev --filter=web`, `dev:ws` and the worker's `dev` running against the local database and Valkey, signed in as the smoke-test account:
  - adding a collection on its want list to another local account's discoverable sale list produces one notification within one job interval, and the bell updates without a reload;
  - three more matches the same day update that notification's count instead of adding rows;
  - removing and re-adding the entry creates nothing;
  - switching the site language re-renders the notification text;
  - Mark all read clears the bell in a second open tab;
  - at 390 px the bell is in the top bar.
- [x] 6.3 Confirm in local Valkey that `alerts:cursor` was set to the max id on the worker's first run. Insert two entries locally in separate transactions committed out of id order, and confirm both alert. Applying the migration to production is a separate step that needs the user's approval

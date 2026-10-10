## Why

Even with For you (phase 1a, `add-trade-for-you`), nobody learns about a new match without going to look. This is phase 1b of the agreed chat and trade roadmap (mockups: `design/chat-and-trade-concepts.html`, §04). It gives the site a way to tell a signed-in user something happened, and it uses that first to send want-list alerts. The notification table and the per-user socket are also what chat (phase 3) and offers (phase 4) will use. **Depends on `add-trade-for-you`**: alerts link to For you and reuse its ownership check, hidden partners and `lists.updated_at`.

## What Changes

- **Notifications:** a bell with an unread count and a popover for signed-in users, mark one or all as read, and per-type switches in the account dialog. In-app only. Notifications store data, not sentences, so they render in the viewer's current language.
- **`/ws/me`:** an authenticated per-user WebSocket beside the public `/ws`. It only tells open tabs to refetch, and the bell works without it. Dev serves it from `dev:ws`.
- **Want-list alerts:** a matching objekt newly listed on a discoverable sale list, or added to a discoverable have list, produces one grouped notification per want list per day, linking to For you. Want lists get Alert me, on by default. The reverse alert ("someone wants what you have") exists but is off by default.
- **Retention:** read notifications are deleted after 90 days.

## Non-goals

- Email, push or digests.
- Chat (phase 3) and offers (phase 4); this change only builds what they will reuse.
- Price-based alerts (phase 2).
- Fan-out across several web instances, though the Valkey channel design allows it later.

## Routes

The frame on every page (bell, desktop and mobile top bar), the account dialog (Notifications section), `/list` and the list form (Alert me), and `/ws/me` (WebSocket).

## Capabilities

### New Capabilities
- `web-notifications`: the bell, popover, read state, per-type settings, live updates, the want-list and reverse alert rules, and retention.

### Modified Capabilities
- `web-lists`: want lists gain the Alert me setting.
- `web-shell`: signed-in visitors get the bell on desktop and in the mobile top bar.

## Impact

- **Database:** new tables `notification`, `notification_pref` and `want_alert_sent`, and `lists.match_alerts`. One migration, applied locally freely and to production only with approval.
- **`packages/api`:** a `notifications` router, a `user-socket` module, and pure grouping and match-selection helpers tested with `bun test`. The list schemas gain an optional `matchAlerts`, so open tabs still validate.
- **`apps/web/server.ts` and `dev-websocket.ts`:** `/ws/me` with session and Origin checks, and handlers that dispatch on the socket kind.
- **`apps/worker`:** a 5-minute alert job with a Valkey cursor, and a weekly prune.
- **`apps/web`:** the bell, the account-dialog switches, the list form, and en/ja/ko messages.

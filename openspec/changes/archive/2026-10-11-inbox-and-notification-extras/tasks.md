## 1. Inbox search

- [x] 1.1 In `packages/api/src/schemas/chat.ts`, add optional `q` (trimmed, 1–50 chars) to `listConversationsInputSchema`. In `services/chat/inbox.ts` `listConversations`, add the name, nickname and card filter (design decision 1) with escaped LIKE patterns, in a pure `searchPatterns(q)` helper with a test (escaping, space-to-hyphen slug form). Verify `bun test`, lint and typecheck pass for `@repo/api`, and that an input without `q` still validates.
- [x] 1.2 In `apps/web`, add `q` to `messagesSearchSchema`, `loaderDeps` and `conversationsOptions(box, q)`. Add the search field above `ConversationList` (debounced `replace` navigation, clear button, Escape) and a no-match empty state with Clear. Add strings to en/ja/ko. Verify `/messages?q=rin` loads filtered on the server, and that lint, typecheck and build pass for `web`.

## 2. Notification tabs

- [x] 2.1 In `schemas/notification.ts`, add `kind` (`all` | `trades` | `alerts`, default `all`) and the kind→types record. Filter in `services/notifications.ts`. Verify an input of `{}` and `{ cursor }` still validates, and that lint and typecheck pass for `@repo/api`.
- [x] 2.2 In `notification-panel.tsx`, add the vendored `Tabs` (All, Trades, Want list) under the header, query `notificationsOptions(kind)`, and add per-tab empty states. Keep the unread count and Mark all read account-wide. Add strings to en/ja/ko. Verify lint, typecheck and build pass for `web`.

## 3. Phone sheet

- [x] 3.1 Add `apps/web/src/hooks/use-media-query.ts` (`useSyncExternalStore`, server snapshot `true`). In `notification-bell.tsx`, render the `Sheet` (bottom, full height) below `sm` and the `Popover` from `sm`. Give `NotificationPanel` a `variant` for the sheet header's close button and a full-height list. Verify focus returns to the bell on close at 390px, and that lint, typecheck and build pass for `web`.

## 4. Drawer listing bar

- [x] 4.1 In `features/objekt/drawer/market.tsx`, extract `listingActions(item)` from the row menu. Render the `sm:hidden` sticky bar for the first messageable row in the current sort: a mono price, serial and seller line, plus full-width Message and Make offer. Add bottom padding to the list below `sm`. Verify that at 390px Make offer opens the builder with that objekt under You get, without sending anything. Verify lint, typecheck and build pass for `web`.

## 5. Verify

- [x] 5.1 Run `bun run check` and `bun run build --filter=web`. Both pass.
- [x] 5.2 Browser check at 1280px and 390px. Read-only: no messages, offers or mark-read clicks on production unless the user approves them. Record:
  - inbox search by name and by objekt, no-match state, `q` survives a box switch;
  - the notification tabs filter correctly, and the bell still shows only a dot;
  - the phone sheet opens and closes, with focus restored;
  - the drawer bar appears only below `sm` on the Market tab and names its listing;
  - nothing scrolls sideways.

Recorded 2026-10-10 against the dev server on the production data, read-only (no message, offer or mark-read sent):
- Inbox search: `rav` and `hyerin 341z` / `hyerin-341z` / `HYERIN` each list only Ravenant; `zzzqqq` shows the no-match state with Clear search; `q` survives Inbox to Archived; typing, Escape and Clear update the URL, and with a thread open the thread stays open.
- Notification tabs: Trades lists only offer and trade notifications (20 on its first page, against 14 in All's), Want list only alerts, All everything including moderator notices; the bell shows a dot only.
- Phone sheet at 390 px: opens with All, Trades and Want list, closes from its X with focus back on the bell, no sideways scroll.
- Drawer bar at 390 px on ChaeYeon A105A, Market tab: "₩8,000 · #3889 · Seller" with Message and Make offer; Make offer opens the builder with atom01-chaeyeon-105a #3889 under You get. At 1280 px the bar is `display: none`.
- Not exercised: Mark all read from a tab, Message from the bar (both write).

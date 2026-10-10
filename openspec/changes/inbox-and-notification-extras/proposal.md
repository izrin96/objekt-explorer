## Why

Four small pieces from the design reference (`design/chat-and-trade-concepts.html`, sections 03 and 04 and the Mobile row) are still missing:
- There's no way to find a conversation without scrolling the inbox.
- The notification popover mixes trade events with want-list alerts, with no way to look at one kind.
- On a phone, the bell opens a small popover where a full-screen list would read better.
- In the objekt drawer on a phone, Message and Make offer for a listing sit two taps deep in each row's ⋯ menu.

## What Changes

- **Inbox search.**
  - A search field at the top of `/messages`, "Search people or objekts", that filters the current box (Inbox, Requests or Archived).
  - It matches the other account's shown name or Cosmo nickname, or any objekt card sent in the conversation (collection names like "SeoYeon 204Z").
  - The query lives in the URL (`q`), and the server filters, so results page like the box does.
- **Notification tabs.** All, Trades and Want list tabs sit under the popover header:
  - Trades: offer and trade notifications;
  - Want list: want-list and reverse-direction alerts;
  - All: everything, including sanction notices.

  The server filters with a new optional `kind` input, so each tab pages properly. The unread count and Mark all read stay account-wide.
- **Full-screen notifications on phones.** Below `sm`, the bell opens the same notification panel as a full-screen sheet, with a header (title, Mark all read, close), the tabs and the list. From `sm` up, the popover stays.
- **Sticky listing bar in the objekt drawer on phones.** Below `sm`, while the Market tab is shown, the drawer has a bottom bar for the top listing in the current sort that the viewer doesn't own and can message. It names that listing (price, serial, seller) and offers Message and Make offer as two full-width buttons, which do what that row's menu items do. Rows keep their ⋯ menus for the other listings.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-chat`: "Inbox, Requests and Archived" gains search.
- `web-notifications`: "Notification bell and popover" gains tabs and the phone sheet.
- `web-objekt-browser`: "Message a seller from the Market tab" gains the phone bar. "Make offer from the Market tab" is unchanged, and the bar reuses its action.

## Routes

`/messages` (and `/messages/$id`, which shares the list layout), the frame's bell on every page, and every page that opens the objekt drawer.

## Non-goals

- A count on the bell. It keeps showing a dot.
- Searching message text. Only names and objekt cards are matched, so moderation's rule that message text is read only through excerpts isn't touched by an index on bodies.
- Email or push notifications. Notifications stay in-app only.
- Per-tab unread counts.
- The bubble, offer card, composer and conversation thumbnail work in `chat-thread-visual-polish`.
- Changing the drawer on wider screens.

## Impact

- `packages/api`:
  - `schemas/chat.ts`: `listConversationsInputSchema` gains optional `q`.
  - `services/chat/inbox.ts`: a name and card filter.
  - `schemas/notification.ts`: `listNotificationsInputSchema` gains optional `kind`, defaulting to all.
  - `services/notifications.ts`: a type filter.

  Both inputs only gain optional fields, so tabs opened before the deploy keep working.
- `apps/web`:
  - `features/chat/search-schema.ts`, `queries.ts`, `conversation-list.tsx` and `routes/(container)/messages/route.tsx`;
  - `features/notifications/notification-bell.tsx`, `notification-panel.tsx` and `queries.ts`;
  - `features/objekt/drawer/market.tsx` and `index.tsx`;
  - en/ja/ko messages.
- No migration.

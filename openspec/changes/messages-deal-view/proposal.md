# Proposal

## Why

Most conversations on Messages are a trade being negotiated or carried out, yet the page does not say where each deal stands. The Inbox shows a preview and an unread dot, so finding "whose turn is it" means opening each thread. Inside a thread, the offer card scrolls away as soon as people start talking. The mock is on the canvas at https://claude.ai/artifact/WhWLcfDxutMEuYy341m88d (boards Proposed and Today).

## What Changes

Routes: `/messages` and `/messages/$id`.

- **Deal line on each conversation row.** A row whose conversation has an open offer, a running trade or an ended trade the viewer can still rate shows one line, in place of the context line: the O or T number and what it waits on ("Your turn · send 4"), in the trade page's tones. The spec's table words every state.
- **Show: All · Unread · Needs you.** Chips under the Inbox search narrow the list. Unread and Needs you show counts that, like the Messages icon, leave out muted conversations. Needs you is an offer waiting on the viewer, their turn to send, or a different copy for them to decide on. The choice lives in the URL (`show`) and combines with search.
- **Unread count.** The row's unread dot becomes the number of unread messages, capped at 99+.
- **Deal strip in the thread.** Under the thread header, one line names the conversation's most urgent deal (an offer or trade waiting on the viewer first, then any other open one, then one to rate) in the trade page's words, with one action: Open trade, Review offer, View offer or Rate. Without an open deal it offers Make offer. An accepted newest offer's card collapses, since its trade carries on at the trade page.
- **New divider.** A neutral "New" line sits above the first message that was unread when the thread opened, and the thread opens on it when it would sit above the view.
- **One "Add" button in the message box.** Attach objekt and Make offer move into a menu (a bottom sheet below `md`) behind a single + button, labelled at every width.
- **Compact page header.** `/messages` drops the page description, and the conversation frame gains its height.

## Non-goals

- Reply to a message: that is the separate `chat-reply` change.
- Filters for Requests and Archived: the chips show on the Inbox only.
- Changing the Messages icon's badge, which keeps counting conversations.
- Changing the trade page or the offer card's own layout.
- Push or email for the deal line.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-chat`:
  - Adds the deal line (layout, wording, tones, muted rows), the Show filter (counts, live rows, empty state), the unread count, the deal strip, the New divider, the Add to message menu and its focus, and the page header.
  - Modifies Offer cards in the thread (an accepted newest offer collapses) and Offer from the composer (Make offer moves into the menu and the strip).
  - Removes Composer action labels.

## Impact

- **`packages/api`:**
  - `ConversationRow` gains `unreadCount` and `deal`, filled in `services/chat/inbox.ts` for list pages and for `loadConversationRow`, so live `chat_message` events carry them.
  - `listConversationsInputSchema` gains an optional `show`, defaulting to `all`, so open tabs keep validating.
  - A new `chat.inboxCounts` read serves the chip counts.
  - Pure deal rules go in a new module with tests.
- **`apps/web`:**
  - `features/chat/conversation-list.tsx`, `search-schema.ts`, `routes/(container)/messages/route.tsx`.
  - `thread/thread.tsx`, `thread-hooks.ts` (one jump-to-message helper, which `chat-reply` reuses), `thread/composer.tsx`, a new deal strip and its wording module, and `lib/tone.ts`.
  - Messages in en, ko and ja.
- **No migration.** No new realtime event: offer and trade changes already publish `chat_changed`.

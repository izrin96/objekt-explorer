## Why

Trade and For you show who to trade with, but reaching them still means Discord or Twitter. Chat lets a deal start from the objekt in front of you and stay on the site. Moderation ships with it (`add-chat-moderation`), not after the first scam.

## What Changes

- **Conversations**: one thread per pair of users. Messages are text or objekt cards: a collection, or a specific objekt, optionally from a list. A bundle deal stays in one thread.
- **Routes**: `/messages` (Inbox, Requests, Archived) and `/messages/$id` (the thread). On a phone, the list and the thread are separate screens.
- **Message buttons** start or reopen the thread with the objekt or list attached as the first card:
  - Market drawer listing rows;
  - Trade posts;
  - For you rows;
  - profile headers.

  The list header gets no button.
- **Who can start a chat**:
  - the sender needs a linked Cosmo address;
  - the recipient's "Who can message you" setting allows it (Anyone with a linked address, the default, or Nobody);
  - on a list that hides its owner, Message shows only if the owner turned on "Allow messages on lists that hide my identity" (off by default).
- **Requests**: a thread started without an objekt or list attached (from a profile) waits in the recipient's Requests until they reply or accept. Declining archives it silently.
- **Thread tools**:
  - mute notifications for 8 hours, 1 week or always;
  - archive and unarchive;
  - per-user unread state.

  The other side never sees read receipts.
- **Realtime**: messages are sent over oRPC and pushed over the phase 1 `/ws/me` socket as a "chat changed" nudge. A reconnecting tab fetches everything after its newest message id.
- **Unread badge**: a Messages icon beside the bell shows unread conversations. Muted threads don't count.
- **Spam brakes**:
  - new conversations per day: 20, or 5 for accounts younger than 7 days;
  - 30 messages a minute per sender;
  - 2,000 characters per message.
- **Settings**: a "Messages" section in the account dialog with the who-can-message setting and the hidden-list opt-in.

## Non-goals

- Offers, counter-offers and verified trades (phase 4), including "Only people I've traded with".
- Typing indicators, read receipts, edits, deletes, attachments other than objekt cards, and search.
- Email or web push for messages.
- Block, report, sanctions and the moderator console (`add-chat-moderation`).
- Group chats.

## Capabilities

### New Capabilities

- `web-chat`:
  - conversations and messages;
  - the inbox, Requests and Archived;
  - the thread view;
  - Message entry points;
  - who-can-message rules;
  - realtime delivery and unread counts;
  - mute and archive;
  - rate limits;
  - the Messages settings.

### Modified Capabilities

- `web-shell`: a Messages icon with an unread badge sits in the frame beside the notification bell.
- `web-trade-browse`: posts gain a Message action.
- `web-trade-for-you`: partner rows gain a Message action.
- `web-objekt-browser`: Market tab listing rows gain a Message action.
- `web-profile`: the profile header gains a Message action.

## Impact

- **DB**: one migration adds `conversation`, `conversation_member` (read state, archive, mute, request state) and `message`, plus `message_pref` (who can message, hidden-list opt-in; no row means the defaults). It is applied locally only until ship.
- **API**: a new `chat` router with `start`, `send`, `list`, `thread`, `markRead`, `archive`, `mute`, `accept`, `decline`, `unreadCount` and `settings`. `/ws/me` gains a `chat_changed` message. Rate limiting uses Valkey counters.
- **Web**:
  - the `/messages` routes;
  - `features/chat/*`;
  - Message buttons in the drawer, Browse, For you and the profile;
  - the header icon;
  - account-dialog settings;
  - en, ja and ko strings.

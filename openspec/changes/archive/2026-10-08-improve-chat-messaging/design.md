## Context

- `chat.start` (`routers/chat.ts`) runs `checkStart`, creates the conversation with `ensureConversation(…, opensWithContent)` and, when given a card, resolves it with `resolveCard`, takes a rate slot and `appendMessage`s it. Whether the recipient's membership is a request is fixed at creation by `startMembers(opensWithContent)`. A start counts against the start limit when the conversation row is created (`recentStarts` counts `conversation.created_by`).
- The composer (`features/chat/composer.tsx`) holds one `Attachment` (`{ input: CardInput, objekt: ValidObjekt, listName }`) in local state and sends `{ body, card }` through `chat.send`, which already accepts both together.
- `message` has no edit or delete state. The thread reads pages by id. Live updates are `chat_changed` frames on `/ws/me`, after which the client fetches messages newer than the newest it holds (`fetchNewer`, `appendToThread`), so a change to an older message never reaches an open thread.
- `conversation_member.last_read_message_id` is the read position; `markRead` publishes `chat_changed` only to the reader. Unread counts compare the conversation's last message with that position.
- The user socket is server-to-client only: frames are published through Valkey (`publishNotify`) and validated by `userSocketMessageSchema`.
- The report copies the last `EXCERPT_SIZE` (100) messages through `shapeExcerpt` into `report.excerpt`.

## Goals / Non-Goals

**Goals:**
- Every behaviour in the spec deltas, with one additive migration and no change to existing message rows.

**Non-Goals:**
- A client-to-server channel on the user socket. Typing goes over RPC.
- Presence beyond typing.

## Decisions

**`chat.start` returns the card, and router state carries it.** Start keeps its checks (`checkStart`, `refuseSend`, `resolveCard`) but no longer takes a rate slot or appends a message. It returns `{ id, created, card: { input, view, collections } }`, where `view` is what the thread already renders for a card. The Message button puts the card in a small in-memory Zustand store (`stores/chat-draft.ts`) under the conversation id and navigates to `/messages/$id`. The composer seeds its attachment from it when it mounts and then drops it, so a reload or a shared link never re-attaches it.
- The composer's `Attachment` widens from `ValidObjekt` to the card view, the same type the attach dialog produces through the existing card path.
- Alternatives rejected: a `?attach=` search param, and router history `state`. Both survive a reload (`history.state` is kept across reloads), so the card would come back after sending.

**Requests decided by the first message.** `ensureConversation` creates both memberships as for a cold start (`request` true for the recipient). `appendMessage` takes the conversation row lock it already takes. When the conversation has no message yet (`last_message_id IS NULL`) and the first message carries a card, it sets the recipient's `request` to false. Old conversations are unaffected: they already have messages.
- Alternative rejected: deciding at start from the card. Removing the card before sending would then land a cold message in the Inbox.

**Unsend as `message.unsent_at`.** `chat.unsend { messageId }` requires the caller to be the sender, `offer_id IS NULL`, `unsent_at IS NULL` and `created_at > now() - 15 minutes`, checked in the `UPDATE … WHERE` so a race can't pass. Body and card stay in the row. The thread output maps an unsent row to `{ id, senderId, createdAt, unsent: true }` with no body, card or caution, so the content never leaves the server for chat. The list preview shows "Message unsent".
- Unread becomes "a message from the other member, newer than the read position, not unsent" (an `EXISTS` on `message_conversation_id_idx`), replacing the last-message comparison in `unreadCount`, the list's unread mark and `requestCount`.
- Live update: a new frame `{ type: "chat_unsent", conversationId, messageId }` goes to both members. The client patches that message in every cached page. After a reconnect the open thread refetches its newest page, which carries unsent states for recent messages: an unsend can only touch the last 15 minutes.

**Reports copy the whole conversation.** The report service selects every message of the conversation inside the report transaction, including unsent ones. `shapeExcerpt` drops its `EXCERPT_SIZE` slice, and `excerptEntrySchema` gains `unsent?: boolean`. `EXCERPT_SIZE` is removed, and the report dialog's share label loses its count. The moderator view renders a long excerpt in a scroll area with unsent entries marked.

**Seen.** The thread's `conversation` gains `partnerReadMessageId`. It is null unless both members' `message_pref.show_activity` is true and the partner's membership is not an unaccepted request. `markRead` publishes `chat_changed` to the partner as well when that holds, so their open thread refetches and moves "Seen". The client shows "Seen" under the viewer's latest own message with id ≤ `partnerReadMessageId`.

**Typing over RPC.** `chat.typing { conversationId }` checks membership, both members' `show_activity`, that the caller can send (`chatSafety`), and that the caller is not holding an unaccepted request. It then publishes `{ type: "chat_typing", conversationId }` to the partner only. A Valkey `SET NX` with a 2-second expiry per user and conversation drops floods. The composer pings at most every 3 seconds while the box changes. The thread shows "typing…" until 6 seconds after the last frame, or until a message from the partner arrives.
- Alternative rejected: client frames on `/ws/me`. That needs a socket message handler with its own auth, membership checks and rate limit, for a signal one RPC already covers.

**Setting.** `message_pref.show_activity boolean NOT NULL DEFAULT true`, saved through the existing `chat.setSettings` (`schemas/chat.ts` gains the field), and shown as a switch in `features/account/sections/messages.tsx`. The reciprocal rule is evaluated on the server, so a client never learns the other person's setting beyond the absence of Seen and typing.

**Suggestions are client-side.** A pure function picks the suggestions from the attached card's list type (the card view carries it), with general ones otherwise. The texts are `m.*` messages in en, ja and ko. No server change.

## Risks / Trade-offs

- [Very long conversations make large report rows] → the excerpt is written once per report and reports are limited to one per account per day. The moderator view scrolls rather than paging.
- [Keeping unsent content conflicts with what "unsend" implies] → the unsend action says so explicitly, and content reaches only moderators through a report.
- [A typing ping per 3 seconds per typist] → each is one indexed membership read and one publish, plus the Valkey guard.
- [Start still counts toward the start limit even if nothing is sent] → unchanged from today's profile Message, and a second click reuses the conversation.

## Migration Plan

1. One additive migration: `message.unsent_at timestamptz NULL` and `message_pref.show_activity boolean NOT NULL DEFAULT true`. It joins the pending batch run before the deploy; the live code ignores both columns.
2. Rollback: the old code ignores both columns. Messages unsent in the meantime would reappear with their content, so roll back only before anyone has used Unsend.

## Why

Message on a Trade post, a For you match or a Market listing sends the objekt card the moment it is clicked: the other person gets a bare card with no words, a second click sends it again, and nothing can be taken back. Chat also gives no sign that a message was read or that a reply is being written.

## What Changes

- **Attach, don't send.** Message checks the card as sending would, then opens the conversation with the card attached in the message box, removable, and sends nothing. Text and card go out together on Send. Clicking Message again opens the same thread with the card attached, never a second card. Whether the recipient sees it under Requests is decided by the first message: a first message carrying a card goes to their Inbox, as a card start does today.
- **Unsend.** A sender can unsend their own text or card message for 15 minutes after sending. It is removed for both people and shows as "Message unsent", in the thread and as the conversation's preview, and stops counting as unread. Offers are never unsent; they are withdrawn. The content is kept so a report excerpt still shows it, marked unsent, and the unsend menu says so.
- **Suggested first line.** While a conversation has no messages, the message box offers one-tap suggestions that fill it, one of them matching the attached card (for sale, for trade, wanted).
- **Seen and typing.** The thread shows "Seen" under the sender's latest message the other person has read, and "typing…" while they type. One switch, "Show Seen and typing", in Account › Messages, on by default and two-way: off hides yours and stops you seeing theirs. A person who has not accepted a request shows neither.
- **Reports share the whole conversation.** "Share this conversation with moderators" copies every message of that conversation at the time of the report, with no 100-message cap. It stays a frozen copy, and moderators still read nothing that was not reported.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-chat`: card attachment from Message, Requests decided by the first message, unsend, suggested first line, Seen and typing, the new Messages setting, and the conversation preview for an unsent message.
- `web-moderation`: a shared report copies the whole conversation, keeping unsent messages marked as unsent.

## Non-goals

- Editing a sent message, or unsending after 15 minutes.
- Read receipts in the conversation list, or "Seen" on any message but the latest the partner has read.
- Unsending offers, or deleting a conversation.
- Online/last-seen presence.

## Routes

`/messages/$id` (thread, message box, unsend, Seen, typing), `/messages` (conversation previews), `/account/messages` (the new switch), and the Message buttons on `/trade`, `/trade/for-you` and the objekt drawer's Market tab.

## Impact

- `packages/db`: `message.unsent_at`; `message_pref.show_activity` (default true). One additive migration.
- `packages/api`: `chat.start` returns the checked card instead of sending it; first-message request rule in `appendMessage`; new `chat.unsend` and `chat.typing`; thread output carries unsent messages and the partner's read position when allowed; `markRead` also tells the partner; list preview and unread counts skip unsent messages; report excerpt keeps unsent messages; new socket frames for unsent and typing; the report copies every message instead of the last `EXCERPT_SIZE`.
- `apps/web`: Message button and Market drawer hand the card to the thread; composer seeds the attachment and shows suggestions; message menu with Unsend; Seen and typing lines; moderator excerpt marks unsent and scrolls a long conversation; report dialog wording; Account › Messages switch; en/ja/ko messages.

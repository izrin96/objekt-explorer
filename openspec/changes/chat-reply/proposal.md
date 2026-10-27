# Proposal

## Why

A trade chat jumps between objekts, serials and offers, and "yes that one" or "sent it" often leaves the other person asking which message it answers. Today a message can't point at an earlier one. The mock is the reply part of https://claude.ai/artifact/WhWLcfDxutMEuYy341m88d (pin 6 on the Proposed boards, and "Reply to a message" on the parts board). It was split out of `messages-deal-view` because it needs a schema change.

## What Changes

Routes: `/messages/$id`.

- **Reply.** Any text or card message, from either side and not unsent, gets Reply in its "…" message menu, which now holds only Unsend. The menu shows on hover and focus with a fine pointer, and always on touch. Choosing Reply moves focus to the message box.
- **Composer while replying.** Above the text field, a line reads "Replying to {name or you}" with the quoted text and a control to stop replying. Escape stops replying too, except during IME composition. The reply is kept with the unsent draft per conversation, even with an empty box, and a failed send puts it back.
- **Quote on the message.** A sent reply shows a one-line quote of the message it answers above its bubble, in the sender's alignment. The quote is a button: it scrolls to that message, loading up to 10 older pages, then focuses and highlights it.
- **Unsent and gone.** A quote of a message that was unsent reads "Message unsent", before or after the reply was sent, loaded or not. The quote and the reply line never show unsent text. A quote whose message no longer exists reads "Original message unavailable".
- **Server.** `message.reply_to_id` (new nullable column) and an optional `replyTo` on `chat.send`. A send that names a message outside the conversation, or an offer message, is refused with a new `invalid_reply` code. `ChatMessage` gains `replyTo`, in thread reads, send results, retries and live events alike.

## Order

This change lands after `messages-deal-view`, which adds the older-page helper the jump reuses. Both touch `composer.tsx` and `thread.tsx`, so this change's `web-chat` delta is rebased on the spec as that change's archive leaves it.

## Non-goals

- Replying to an offer card: offers answer with Accept, Decline and Counter.
- Threads, nested quotes, or a list of replies to a message.
- Swipe to reply on touch screens.
- Showing replies in the conversation list preview, search or notifications.
- Changing the report excerpt.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-chat`:
  - Adds requirements for replying, stopping a reply, reply drafts, the reply quote and its jump, quotes of unsent and missing messages, replies after a report or block, and the reply target checks.
  - Unsend's requirement is unchanged: its menu gains Reply, and Unsend itself is still offered only within its window.

## Impact

- **`packages/db`.** A new migration adds `message.reply_to_id bigint`, with no foreign key or index. Applying it needs approval, local first, then staging and production before the API deploys.
- **`packages/api`.** `sendInputSchema`, `CHAT_REFUSALS` and `refuse.ts`, `chatMessageSchema` and `unsentMessage`, and the three `MessageRow` sources (design decisions 2 and 4). An open tab's send still validates.
- **`apps/web`.**
  - `thread/message-actions.tsx`, `thread/message-item.tsx`, `thread/composer.tsx` and `thread/thread.tsx`.
  - `stores/chat-draft.ts`, `format.ts`, `thread-cache.ts` and `queries.ts` (design decisions 3 and 5).
  - Strings in en, ko and ja.

## 1. Database

- [x] 1.1 Add `unsentAt` to `message` and `showActivity` (default true) to `messagePref` in `packages/db/src/schema.ts`; `db:generate` produces one additive migration with only those two columns; lint + typecheck pass for `@repo/db`
- [x] 1.2 With the user's approval, apply it to the local database only (`.env.local`); confirm both columns exist

## 2. Attach, don't send

- [x] 2.1 `chat.start`: keep the start checks and `resolveCard`, drop the rate slot and `appendMessage`, return `{ id, created, card }` with the card's view and collections; output schema in `schemas/chat.ts`; typecheck passes for `@repo/api`
- [x] 2.2 `appendMessage`: on a conversation's first message, a card clears the recipient's `request`; `ensureConversation` always creates the recipient as a request; a pure helper for the rule with a `bun test`; api tests pass
- [x] 2.3 Web: `useStartConversation` puts the card in the in-memory `stores/chat-draft.ts` and navigates to `/messages/$id`; the composer seeds the composer's attachment once from it; `Attachment` takes the card view; the Market drawer and Message buttons need no other change; lint + typecheck + build pass for `web`

## 3. Unsend

- [x] 3.1 `chat.unsend { messageId }`: sender only, not an offer, not already unsent, within 15 minutes, all in the `UPDATE … WHERE`; publish `chat_unsent` to both members (frame added to `userSocketMessageSchema`); typecheck passes
- [x] 3.2 Thread and list read unsent rows as `{ unsent: true }` without body, card or caution; list preview "Message unsent"; unread in `unreadCount`, the list's unread mark and `requestCount` ignores unsent messages; api tests pass
- [x] 3.3 Web: own-message menu with Unsend while within 15 minutes and not an offer, with the moderation note; "Message unsent" rendering; `chat_unsent` patches cached pages (pure function in `thread-cache.ts` with a test); reconnect refetches the newest thread page; lint + typecheck + build + test pass

## 4. Reports copy the whole conversation

- [x] 4.1 Report service copies every message including unsent ones; `shapeExcerpt` drops the slice and marks `unsent`; `excerptEntrySchema` gains `unsent`; remove `EXCERPT_SIZE`; update `sanctions.test.ts`; api tests pass
- [x] 4.2 Web: report dialog "Share this conversation with moderators" (en/ja/ko, no count); moderator excerpt marks unsent entries and scrolls a long excerpt; lint + typecheck + build pass

## 5. Seen and typing

- [x] 5.1 `chat.setSettings`/`chat.settings` carry `showActivity`; Account › Messages gets the "Show Seen and typing" switch (en/ja/ko); lint + typecheck + build pass
- [x] 5.2 Thread output `partnerReadMessageId` under the two-way and unaccepted-request rules (a pure helper with a test); `markRead` also publishes to the partner when allowed; api tests pass
- [x] 5.3 `chat.typing { conversationId }` with membership, safety, request and setting checks and a Valkey `SET NX` 2-second guard, publishing `chat_typing` to the partner; frame added to the schema; typecheck passes
- [x] 5.4 Web: "Seen" under the latest own message the partner has read; composer pings `chat.typing` at most every 3 seconds; "typing…" shown until 6 seconds after the last frame or the partner's next message; lint + typecheck + build pass

## 6. Suggested first line

- [x] 6.1 Pure function choosing suggestions from the attached card's list type (sale, have, want, none), with a test; chips in the composer while the conversation has no messages and the user can send, filling the box without sending; texts in en/ja/ko; lint + typecheck + build + test pass

## 7. Verification

- [x] 7.1 Two local accounts on the dev server (browser-use, isolated contexts): Message from a Trade post attaches without sending and a second click adds nothing; send with text; unsend within the window and see it vanish live for the other; Seen and typing appear and stop when either turns the switch off; suggestions fill the box; a report shows the whole conversation with the unsent message marked; no console errors
- [x] 7.2 Full checks: `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build --filter=web` and `openspec validate improve-chat-messaging --strict` all pass

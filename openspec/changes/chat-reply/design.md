# Design

## Context

- `message` rows carry `body`, `card` or `offer_id`, and `unsent_at`, which keeps the content for reports. Every read goes through `toChatMessages` (`packages/api/src/services/chat/cards.ts`), fed `MessageRow`s by its chat callers, three of which carry plain messages: `loadThread`'s select (`inbox.ts`), `appendMessage`'s return (`members.ts`, the send result and the `chat_message` event built by `buildChatMessages`), and `findSentMessage` (a retry with the same `clientId`). A column that a read must see is selected in all three.
- Nothing deletes a message row today, and `message_flag.message_id` and `last_read_message_id` already point at messages with bare columns.
- An unsent message reaches clients as `unsentMessage(...)`, with no body or card. The web marks one unsent in place through `markUnsent` (`features/chat/thread-cache.ts`): live through `applyUnsent`, on a later append through `withUnsent` (unsends heard before the message arrived), and after a reconnect through `syncUnsent`, which re-reads the newest page only, because a message can be unsent only in its first 15 minutes.
- The message menu (`thread/message-actions.tsx`) renders only while `canUnsend` holds, and holds only Unsend.
- `stores/chat-draft.ts` keeps each conversation's `body` and `clientId` in memory. The send mutation's `onError` restores them, and a card in flight waits in the module map `sentCards` (`thread/composer.tsx`), so a failure after the thread unmounted still puts it back (apps/web AGENTS.md, Chat draft).
- Chat refusals are bare codes in `CHAT_REFUSALS`, thrown by `services/chat/refuse.ts` and worded by `refusalText` in `features/chat/format.ts` from `chat_refused_*` strings. Both switch over every code.

## Goals / Non-Goals

**Goals:**
- A reply is one nullable column and one optional input. Nothing changes for a send without one.
- A quote never carries unsent content, whatever order the unsend and the reply happen in, and whether or not the quoted message is loaded.

**Non-Goals:**
- Reading reply chains, or counting replies.

## Decisions

1. **Column `message.reply_to_id bigint`, nullable, with no foreign key and no index.**
   - It matches `message_flag.message_id` and `last_read_message_id`. Reads go from reply to target by primary key, never the other way, so no index is needed.
   - Same-conversation is checked in `sendMessage`, which reads the target's `conversation_id` and `offer_id` before the transaction. A foreign key couldn't express that check.
   - A target row that no longer exists reads as unavailable (decision 2). The quote then reads "Original message unavailable".
   - *Alternative:* store the quoted text on the reply. That leaks unsent text into the reply row, so it was rejected.
2. **`replyTo` on `ChatMessage` is a view built at read time.** `MessageRow` gains `replyToId`, which `loadThread`, `appendMessage` (input and return) and `findSentMessage` all select. `toChatMessages` collects the page's `replyToId`s and reads those rows in one query (`id`, `sender_id`, `body`, `card`, `unsent_at`). It builds `{ id, state, mine, excerpt, card }`:
   - `state` is `"shown" | "unsent" | "unavailable"`.
   - `card` is `"objekt" | "post" | null`.
   - An unsent target has neither excerpt nor card. A missing row has `mine: null` too.
   - The pure `replyQuote` in `packages/api/src/schemas/chat.ts` takes a neutral `{ id, mine, body, cardKind, unsent }`, or `null` for a missing row, and returns that view; `chat.test.ts` covers it. The server maps a target row into that input (`sender_id`, the parsed card's kind, `unsent_at`), and the web maps a cached `ChatMessage`. It sits in `schemas/` so the composer's reply line cuts text the same way.
   - A message with text quotes its text, even when it also holds a card. A card-only message quotes its kind: an objekt card reads "Objekt card" and a Trade post card "Trade post".
   - The excerpt is the body's first line, cut to 120 code points (`Array.from`, as `messageLength` counts). `replyQuote` adds "…" when it cut anything, and the web shows it on one line, truncated. The full text is a tap away through the jump (decision 8). A quoted reply's excerpt is its own body, so quotes never nest.
   - `chatMessageSchema` declares `replyTo` `.nullable().default(null)`, so live events replayed from before the deploy still parse. `unsentMessage` sets `replyTo: null`, so an unsent reply drops its quote.
   - The send result, the live `chat_message` event and a retry all carry `replyTo`, since all three come from the rows above.
3. **The web marks quotes when their target is unsent.**
   - `markUnsent` rewrites `replyTo` of every cached message whose `replyTo.id` is in the set to the unsent shape. Its early return checks `replyTo.id` as well as `message.id`, so a quote is blanked even when its target isn't loaded. This covers `withUnsent`: `chat_unsent` arrives before the reply's `chat_message`, which the server built before the unsend.
   - `unsentIds` also collects `replyTo.id` wherever `replyTo.state` is `"unsent"`. `syncUnsent` therefore marks a target on an older page once a reply on the newest page reports it.
   - `applyUnsent` also blanks a matching reply snapshot in the draft and in the in-flight map (decision 5).
   - A reply sent after its target was unsent is already built unsent by the server (decision 2).
4. **Refusal `invalid_reply`** joins `CHAT_REFUSALS`. It is a bare code, as chat's are (packages/api AGENTS.md, Errors). `services/chat/refuse.ts` throws it as `BAD_REQUEST`. `refusalText` in `features/chat/format.ts` words it as `chat_refused_invalid_reply` in en, ko and ja. Both switches are exhaustive, so both gain the case in the same task.
   - `sendInputSchema` gains `replyTo: idSchema.optional()`. An open tab sends no `replyTo` and validates as before.
   - An unsent target is allowed: the reply's quote reads "Message unsent".
5. **The draft keeps the reply.** `Draft` gains `reply: { id, quote } | null`, where `quote` is a snapshot of the `replyTo` view.
   - Choosing, changing or stopping a reply calls `withNewSend`, so a retry never returns a message with the old target.
   - `setDraftBody("")` keeps the draft while a reply is set, and drops it only when there is none.
   - `beginSend` returns the reply and clears the draft. The quote snapshot of a send in flight waits in a module map by send id (`sentReplies`, in `stores/chat-draft.ts` so `applyUnsent` can reach it), as `sentCards` does for cards. It survives the thread unmounting.
   - The send's `onError` calls `restoreDraft` with the reply. If a different reply was started while the send was in flight, the newest reply wins, and the failed text comes back without its old reply. The send id is kept only when nothing was typed since and no other reply was started.
   - The reply line reads the quoted message from the thread cache by id, through `replyQuote`, and uses the snapshot only when that message isn't cached. An unsent message is never shown with its text.
   - Escape stops replying only when no IME composition is active. It checks `isComposing` and keyCode 229, as Enter does in `composer.tsx`, ahead of the existing key handling.
   - The stop control and Escape move focus to the textarea.
   - *Alternative:* component state in `Composer`. That loses the reply when the thread unmounts, which the draft rules forbid, so it was rejected.
6. **The menu holds Reply and Unsend.** `MessageActions` renders for any message that isn't unsent, has a body or a card, and isn't an offer. It keeps its current visibility classes: hidden until hover or focus with a fine pointer, always shown on touch. Unsend stays behind `canUnsend`.
   - `thread.tsx` owns the textarea ref and hands it to `Composer` and, through `MessageItem`, to `MessageActions`.
   - `MenuPopup`'s `finalFocus` is a function that returns the textarea when Reply was chosen, and `true` otherwise, so Escape, an outside click and Unsend keep Base UI's return to the "…" trigger.
7. **The quote is a `<button>` above the bubble.** It sits in the sender's alignment and shows only the excerpt (or "Objekt card", "Trade post", "Message unsent"), with no "Replying to" label.
   - Its accessible name is one whole message per variant, with placeholders, for example "Reply to {name}: {excerpt}. Go to message". Variants differ by sender (partner or you) and kind (text, objekt card, Trade post, unsent). A name is never assembled from fragments.
   - An unavailable quote has nothing to jump to, so it is plain text rather than a button.
8. **Jumping to the quoted message reuses `useJumpToMessage` from `messages-deal-view`** (`thread/thread-hooks.ts`, its decision 12), called with `{ focus: true }`. This change adds the helper's `highlight` option, which `messages-deal-view` left out.
   - The helper loads up to 10 older pages in a loop and resyncs once at the end. It then scrolls to the target `<li tabIndex={-1}>`, carrying `data-message-id`, focuses it, and highlights it with a short background fade that respects `prefers-reduced-motion`.
   - Beyond 10 pages it shows the toast "That message is too far back".
   - `messages-deal-view` lands first and adds the helper, and this change depends on it. If this change ever lands first, it adds the helper instead.

## Risks / Trade-offs

- [A quote's target is beyond the loaded pages, and the unsend is missed while offline] → `syncUnsent` reads the newest page, whose replies report their targets' state (decision 3). A reply further back is rebuilt from the target's current state on the next read.
- [The bubble look changes, which an earlier change kept out of scope] → The quote sits above the bubble as its own element. The bubble's own spec (colours, corners, runs) is untouched.
- [On touch the "…" menu is always visible on every message, now that most messages have one] → It is kept for now. Revisit it once replies are in use: a long press or a smaller trigger may fit better. Swipe stays a non-goal.
- [`composer.tsx` and `thread.tsx` are changed by `messages-deal-view` too] → This change lands after it and rebases on its code and archived spec.

## Migration Plan

1. `bun run --filter=@repo/db db:generate` creates the additive migration, which only adds the column. Apply it with the user's approval: locally first, then on staging and production, before the API that reads the column deploys.
2. Rollback: revert the code. The nullable column can stay.

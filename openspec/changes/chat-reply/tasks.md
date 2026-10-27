# Tasks

This change lands after `messages-deal-view` and starts from its code: `useJumpToMessage` (design decision 8) and its changes to `composer.tsx` and `thread.tsx`.

## 1. Schema (packages/db)

- [x] 1.1 Add `replyToId` (`reply_to_id`, a nullable `bigint` with no foreign key and no index, design decision 1) to `message` in `packages/db/src/schema.ts`, then generate the migration with `db:generate`. Verify the generated SQL only adds the column. Apply it locally only with the user's approval, and verify with `\d message`. Lint and typecheck pass for `@repo/db`, which has no build script.

## 2. Server (packages/api)

- [x] 2.1 Add the optional `replyTo` to `sendInputSchema` and `invalid_reply` to `CHAT_REFUSALS`, with its `BAD_REQUEST` case in `services/chat/refuse.ts` and its `refusalText` case in `apps/web/src/features/chat/format.ts`, worded by `chat_refused_invalid_reply` in en, ko and ja (design decision 4). In `sendMessage`, check the target (exists, same conversation, not an offer) before the transaction. Pass it as `replyToId` to `appendMessage`, which stores it and returns it. Confirm a send without `replyTo` validates unchanged. Verify with lint and typecheck for `@repo/api` (no build script) and lint, typecheck and build for `web`.
- [x] 2.2 Add `replyToId` to `MessageRow` (`cards.ts`), the `loadThread` select (`inbox.ts`) and `findSentMessage` (`members.ts`). Build `replyTo` in `toChatMessages` from one batched read through the pure `replyQuote` in `schemas/chat.ts` (design decision 2). Add `replyTo` to `chatMessageSchema` with its default, and `replyTo: null` to `unsentMessage` and to the message fixtures in `thread-cache.test.ts` and `live-message.test.ts`. Cover `replyQuote` in `schemas/chat.test.ts`: plain text, a 300-code-point first line with emoji, a multi-line body, text with a card, an objekt card, a post card, a quoted reply, an unsent target and a missing row. Verify with `bun test`, lint and typecheck for `@repo/api`, and lint, typecheck and build for `web`.

## 3. Web (apps/web)

- [x] 3.1 Extend `stores/chat-draft.ts` with the reply and its quote snapshot, and the `sentReplies` map of sends in flight (design decision 5). Choosing, changing or stopping a reply calls `withNewSend`. `setDraftBody("")` keeps a draft that holds a reply. `beginSend` and `restoreDraft` carry the reply, and the newest reply wins on restore. Cover these rules in `stores/chat-draft.test.ts`; the store imports nothing that reaches the network. Verify with `bun test`, lint, typecheck and build, and in the browser: a reply survives switching conversations and an emptied box, and a send failed by going offline puts back both the text and the reply line.
- [x] 3.2 Make `MessageActions` hold Reply for any text or card message that is neither unsent nor an offer, with Unsend still behind `canUnsend`. Route the textarea ref from `thread.tsx` and set `MenuPopup`'s `finalFocus` to it on Reply (design decision 6). Add the reply line with its stop control above the message box: it reads the cached message first and the snapshot only as a fallback. Make Escape stop replying only outside an IME composition, and have both Escape and the stop control focus the textarea. Send `replyTo`. Add strings in en, ko and ja. Verify with lint, typecheck and build, and in the browser with the keyboard, with a Korean IME, and at 390 px.
- [x] 3.3 Draw the quote as a `<button>` above a reply's bubble in the sender's alignment: one truncated line, no "Replying to" label, an accessible name from one whole message per variant, and plain text for an unavailable target (design decision 7). Keep 4.5:1 contrast in both themes. Activating it jumps through `useJumpToMessage` (decision 8) to the target `<li tabIndex={-1}>`, focuses it and highlights it, respecting reduced motion, with its `chat_jump_too_far` toast past 10 pages. Extend `markUnsent` to rewrite quotes and to check `replyTo.id` in its early return. Make `unsentIds` collect unsent `replyTo.id`s, and `applyUnsent` blank matching snapshots (decision 3). In `thread-cache.test.ts`, cover a quote rewritten with its target cached, a reply whose target isn't cached, the `withUnsent` path (the unsend heard before the reply arrives), and `unsentIds` reading a quote. Verify with `bun test`, lint, typecheck and build, and in the browser in two tabs: a reply arrives live with its quote, and unsending its target turns the quote to "Message unsent".

## 4. Wrap-up

- [x] 4.1 Run `bun run check`, the format check and `bun run build`. Mutations against production are verified only up to the request boundary. Every check passes.
- [x] 4.2 Update the `AGENTS.md` of each touched package:
  - `packages/api/AGENTS.md`: a reply's quote is built at read time and never carries unsent content, and every `MessageRow` source (`loadThread`, `appendMessage`, `findSentMessage`) selects `reply_to_id`. In Errors, say that a new chat code gets a `chat_refused_*` string through `features/chat/format.ts`, so "a new code needs an `api_errors_*` string" reads as the rule for `refuse()` codes only.
  - `apps/web/AGENTS.md`, Chat draft: the draft carries the reply, starting or stopping one starts a new send, the snapshot of a send in flight waits in `sentReplies`, and the newest reply wins on restore.
  - `packages/db/AGENTS.md`: state that no convention changed, since a bare id column without a foreign key already has precedents.

  Verify that each named section reads as above and that `bun run lint` passes.

## Workflow follow-up

- Apply the migration on staging and production, with the user's approval, before deploying the API that reads `reply_to_id`.

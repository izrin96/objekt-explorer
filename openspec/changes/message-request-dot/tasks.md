# Tasks

## 1. Schema

- [x] 1.1 Add nullable `requestsSeenMessageId` (`requests_seen_message_id`, bigint, number mode) to `messagePref` in `packages/db/src/schema.ts`, run `bun run --filter=@repo/db db:generate`, and check that the new migration only adds that column. Lint and typecheck pass for `@repo/db`.
- [ ] 1.2 With approval, apply the migration to the local database (`.env.local`) and confirm the column exists. Staging and prod wait for the deploy step.

## 2. API

- [x] 2.1 In `packages/api/src/services/chat/inbox.ts`, add `requestsUnseen(me)`. It runs `requestConversationCount`'s conditions as an `EXISTS`, with the incoming message id above `coalesce(requests_seen_message_id, 0)`, and returns a boolean. Add `seeRequests(me)`, which upserts `message_pref` and sets the marker to `greatest(existing, max qualifying incoming request message id)`. Lint, typecheck and build pass for `@repo/api`.
- [x] 2.2 Expose `chat.requestsUnseen` (query) and `chat.seeRequests` (mutation) in `packages/api/src/routers/chat.ts`, both `authed`. Lint and typecheck pass.
- [x] 2.3 Add `requestsUnseen: z.boolean()` to the `chat_message` event in `packages/api/src/schemas/realtime.ts`, and compute it in `buildChatMessages` (`services/chat/live.ts`) beside `unread` and `requests`. Lint, typecheck and `bun run test` pass for `@repo/api`.

## 3. Web

- [x] 3.1 In `apps/web/src/features/chat/queries.ts`, add `requestsUnseenOptions(live)`, shaped like `chatUnreadOptions`. Add its key to `chatListKeys`, and write `event.requestsUnseen` into the cache in `applyChatMessage`. Lint and typecheck pass for `web`.
- [x] 3.2 Add `chat_icon_label_requests` to `apps/web/messages/en.json`, `ja.json` and `ko.json` ("Messages, new message requests" and its translations). In `MessagesIcon`, pass `UnreadDot` a count of 1 when there is no unread conversation but there are unseen requests, and use the new label in that case. Update the component's doc comment. Lint, typecheck and build pass for `web`.
- [x] 3.3 In the conversation list, when `box === "requests"` and the cached `requestsUnseen` is true, call `chat.seeRequests`, then set the cache to false. This also covers a request that arrives while the tab is open. Lint, typecheck and build pass for `web`.
- [ ] 3.4 Verify in the running app against the local database, as two accounts, with approval to send one test message. A cold message sets the dot live, opening Requests clears it, a request that arrives with Requests open sets no dot, a later message in a waiting request sets it again, and the label reads correctly in each case. Record any step that was only read-only verified.

## 4. Docs

- [x] 4.1 Update `packages/api/AGENTS.md`, or state that nothing in it changed, so that it says requests reach the icon through `requestsUnseen` and `message_pref.requests_seen_message_id`, and that a new `chat_message` field must be filled in `buildChatMessages`. Check `apps/web/AGENTS.md` and `packages/db/AGENTS.md` and update them only if their conventions changed.

## Workflow follow-up

- With approval, apply the migration to staging and prod before deploying the web app, because without the column every icon read fails.
- Archive the change and sync `web-chat` after review.

## 1. Schema and migration

- [x] 1.1 In `packages/db/src/schema.ts`, add `conversation`, `conversation_member`, `message` and `message_pref` with the columns, checks, unique pair and indexes from design D1. Every user foreign key cascades. Lint and typecheck pass for `@repo/db`.
- [x] 1.2 Run `bun run --filter=@repo/db db:generate`. Read the SQL and confirm it only creates the four tables and their indexes and constraints. Check that `DATABASE_URL` resolves to localhost, then apply it with `db:migrate`. `\d message` shows both CHECKs. Never apply it to production.

## 2. Rules module

- [x] 2.1 Add `packages/api/src/lib/chat-rules.ts`, a pure module with no DB, Redis or Cosmo imports, holding `startVerdict`, `isUnread`, `countsTowardBadge`, `nextMemberState`, `rateDecision` and `pairKey` (design D2, D3, D5, D6). Add `chat-rules.test.ts` covering these spec scenarios:
  - second start reopens;
  - no linked address;
  - recipient allows nobody;
  - hidden owner, not opted in and opted in;
  - cold message goes to Requests;
  - accept by reply;
  - archive then new message;
  - muted does not count;
  - mute ends;
  - new-account start limit.

  `bun test` passes, and lint and typecheck pass for `@repo/api`.

## 3. API

- [x] 3.1 Add `schemas/chat.ts`: the card schema shared with the client, inputs and outputs, limits as constants, and refusal reason codes. Extend `userSocketMessageSchema` into the union with `chat_changed { conversationId }` (design D4). Lint and typecheck pass for `@repo/api`.
- [x] 3.2 Add `routers/chat.ts` and register it in `routers/index.ts`, not in `openApiRouter`. It holds these authed procedures:
  - `start`, `send`, `list({ box, cursor? })`, `thread({ id, before?, after? })`;
  - `markRead`, `archive`, `unarchive`, `mute({ id, until })`;
  - `accept`, `decline`, `unreadCount`, `settings`, `setSettings`.

  Each one checks membership. Use Valkey rate limits (D5) and publish `chat_changed` after commit (D3). Over local `/rpc`, with two local test sessions created only in the local DB:
  - a start, a send and a reply move the request to the Inbox;
  - a non-member's `thread` returns NOT_FOUND;
  - 2,001 characters are refused;
  - the sixth start from a fresh account is refused with `retryAt`;
  - `after` returns exactly the newer messages.

  Lint and typecheck pass for `@repo/api`.
- [x] 3.3 Add `messageable` to the `trade.browse` posts, `trade.forYou` partners, `market.listings` rows and the profile read, with a `LEFT JOIN message_pref` and the hidden-owner rule (D2). On local, a list with Hide User on and no opt-in gives `messageable: false`, and opting in flips it. Existing `/rpc` outputs only gain the field. Lint and typecheck pass for `@repo/api`, and `bun run build --filter=web` passes.

  `market.listings` items also gained `objektId`, null when the list hides serials, so a Market row can attach its objekt as the card.
- [x] 3.4 Measure `unreadCount` and `list` on local with 200 conversations seeded for one test account, and record the timings. Remove the seed afterwards.

  Recorded 2026-10-07, 200 conversations and 2,000 messages, 20 warm calls over local `/rpc`: `unreadCount` 3.5 ms median, 7.8 ms p95; `list` (inbox, first page) 6.3 ms median, 8.6 ms p95; `settings` as the auth-only baseline 2.5 ms median. The SQL alone runs in 0.15 ms and 0.32 ms.

## 4. Web: messages pages

- [x] 4.1 Add `routes/(container)/messages/route.tsx` (login guard, two-pane from `md`), `messages/index.tsx` (`box` search param with `.catch`) and `messages/$id.tsx`, with the `page_titles_*` messages. Signed out, `/messages` goes to `/login?redirect=%2Fmessages`. Lint, typecheck and build pass for `web`.
- [x] 4.2 Add `features/chat/conversation-list.tsx`:
  - Inbox, Requests and Archived;
  - rows with identity, latest message or card summary, time, unread mark and muted mark;
  - archive, unarchive and mute (8 h, 1 week, always) in a row menu;
  - accept and decline on requests.

  In the browser at 1280 and 390 px, the folders switch through the URL and there is no horizontal scroll. Lint, typecheck and build pass for `web`.
- [x] 4.3 Add `thread.tsx`, `composer.tsx`, `objekt-card-message.tsx` and `attach-objekt-dialog.tsx`:
  - older pages load on scroll up, and opening marks the thread read;
  - Enter sends and Shift+Enter adds a new line;
  - a counter appears near 2,000 characters;
  - Attach objekt picks from the user's own objekts or list collections;
  - cards show art, name, serial, list and price.

  In the browser, two sessions in separate browser contexts see each other's messages within 2 seconds. After killing and restoring one side's socket, messages sent meanwhile appear in order. Lint, typecheck and build pass for `web`.
- [x] 4.4 Extend `useUserSocket` to dispatch `chat_changed`: invalidate the list and the unread count, and fetch `after` for an open thread (D4). Lint, typecheck and build pass for `web`.

## 5. Web: entry points and settings

- [x] 5.1 Add `features/chat/message-button.tsx`, which handles signed out, no linked address (offer `/link`), refusal reasons and navigation. Wire it into:
  - Trade posts (`browse-post.tsx`);
  - For you rows (`partner-row.tsx`);
  - drawer Market rows (`objekt/drawer/market.tsx`);
  - the profile header (`profile-header.tsx`).

  Each surface passes its target and card, and hides the button when `messageable` is false or the target is the viewer. In the browser, each surface opens the right conversation with the expected card, and the profile start lands in the recipient's Requests. Lint, typecheck and build pass for `web`.
- [x] 5.2 Add the Messages icon with its unread badge beside `NotificationBell` in `app-nav.tsx`, also in the top bar at 390 px. Add the account-dialog Messages section with "Who can message you" and "Allow messages on lists that hide my identity", saving at once. In the browser:
  - the badge counts unread non-muted Inbox conversations;
  - picking Nobody hides Message for that account in another session after reload.

  Lint, typecheck and build pass for `web`.

## 6. Whole-change checks

- [x] 6.1 `bun run check` and `bun run build --filter=web` pass. The format check is clean, and `bun run knip` reports no new unused exports.
- [x] 6.2 Walk every `web-chat` scenario and the delta scenarios in `web-shell`, `web-trade-browse`, `web-trade-for-you`, `web-objekt-browser` and `web-profile` in the browser against local. Record each as passed or read-only verified. Remove all local test sessions, conversations and messages created for testing, and confirm production was never written.

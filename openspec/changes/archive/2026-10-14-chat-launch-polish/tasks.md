Start only after `account-deletion-safety` is archived, since this change's "Blocks and chat mutes gate sending" builds on its text. Every task ends with lint, typecheck and build passing for the packages it touches. Mutations against production are verified read-only, up to the request boundary.

## 1. Schema

- [x] 1.1 In `packages/db/src/schema.ts` (design decisions 1 and 4), add:
  - `conversation.started_by` (text, nullable, no foreign key, like `created_by`);
  - `conversation.started_at` (timestamptz, nullable);
  - the index `conversation_started_by_at_idx` on `(started_by, started_at)`;
  - `conversation_member.opened_at` (timestamptz, nullable);
  - `message.client_id` (uuid, nullable);
  - the unique index `message_sender_client_uniq` on `(sender_id, client_id) WHERE client_id IS NOT NULL`.

  Ask the user before running `bun run --filter=@repo/db db:generate`. Then append the backfill `UPDATE conversation SET started_by, started_at` from each conversation's first message (`DISTINCT ON (conversation_id) … ORDER BY conversation_id, id`) to the generated SQL. Do not run `db:migrate`. Verify that the generated SQL only adds, and that lint and typecheck pass for `@repo/db`.

## 2. Pure rules

- [x] 2.1 In `packages/api/src/lib/chat-rules.ts`:
  - `startMembers()` returns `request: false` for both members;
  - the `incoming` event gains `first?: boolean`, and on a first message `nextMemberState` sets `request = !opensWithContent`;
  - `startVerdict` takes `muteUntil` and returns it as `retryAt` with `muted`.

  Extend `chat-rules.test.ts`:
  - the reverse direction (the opener receives the first, card-less message, which lands in Requests);
  - a first message with a card;
  - muted with an end date.

  Verify that `bun test packages/api/src/lib/chat-rules.test.ts` passes.
- [x] 2.2 In `lib/scam-patterns.ts`, `scanMessage` tests `body.normalize("NFKC").replace(/\p{Cf}/gu, "")`. Add cases to its test: `pay​pal`, `ｐａｙｐａｌ`, and an unchanged clean message. Verify that `bun test` passes for `@repo/api`.
- [x] 2.3 In `schemas/chat.ts` (design decision 7):
  - `messageBodySchema` refuses NUL, and refuses a body that is empty once the blank-rendering characters are removed;
  - card slugs refuse NUL;
  - `conversationCursorSchema.at` matches the Postgres `timestamptz::text` shape;
  - `sendInputSchema` gains optional `clientId: z.uuid()`;
  - add `settings_limit` to the chat refusals.

  Add `schemas/chat.test.ts` cases for every rule, including a cursor `at` taken from a real list response, so open tabs still validate. Verify that `bun test` passes.

## 3. First message is the start

- [x] 3.1 In `services/chat/start.ts` (design decision 1):
  - `checkStart` passes `existing` as "holds a message", so a reopened empty conversation is checked like a new one;
  - `recentStarts` counts `started_by = me AND started_at > since`;
  - `ensureConversation` sets the caller's `conversation_member.opened_at`, both on create and on reopen;
  - add `openFirst(tx, ctx)`, which runs `startVerdict` with `existing: false` and the fresh pref, safety and rate, then sets `started_by`/`started_at`;
  - a gone list target refuses `invalid_card`.

  Verify that lint, typecheck and build pass for `@repo/api`.
- [x] 3.2 In `members.ts` `appendMessage`, take a `first` callback that runs under the row lock when `lastMessageId` is null, and pass `first: true` on the recipient's `incoming` event. In `send.ts`:
  - `sendMessage` reads emptiness, and when the conversation is empty takes the sender's start advisory lock first, then calls `appendMessage` with `openFirst`;
  - the offer path (`offer/index.ts`) does the same around its `appendMessage`.

  Verify by reading that every path takes the advisory lock before the row lock, and that lint, typecheck and build pass for `@repo/api`.
- [x] 3.3 Make empty conversations visible only to a member who opened them, through `c.created_by = me OR m.opened_at IS NOT NULL`:
  - `findMembership` and `updateMember` refuse `NOT_FOUND` otherwise;
  - `selectConversationRows` uses the same predicate.

  Verify that lint, typecheck and build pass for `@repo/api`.

## 4. Sending rules and cards

- [x] 4.1 In `services/chat/safety.ts`, add `partner_banned` (an active ban) and fold it into `blocked`, and return `partnerDeleted`. In `services/profile.ts` and `services/list.ts`, `messageable` is false for a banned owner. In `send.ts`, `sendMessage` refuses `no_address` when the sender has no linked address. In `settings.ts`, `activityBetween` is false both ways under a block. In `inbox.ts`:
  - `loadThread` returns `partnerDeleted`;
  - the Requests box and `requestConversationCount` exclude deleted partners.

  Verify that lint, typecheck and build pass for `@repo/api`.
- [x] 4.2 In `services/chat/cards.ts` (design decision 3):
  - `resolveCard` requires a matching `list_entries` row when a list is given, and that an objekt is held by a linked address of the sender or the partner;
  - `hydrateCards` takes the viewer id and, for a list with `hide_serial` that the viewer doesn't own, nulls `objektId` and `serial` and matches price by collection only.

  Make the rule a pure predicate in `lib/chat-rules.ts` (entry rows, holder address, member addresses → ok or refuse), with tests for each card the web builds: an owned-picker objekt, a list-picker collection, a Trade post collection, a person-sheet collection, a Market drawer objekt, a sold objekt, and a removed entry. Update every `hydrateCards` caller. Verify that `bun test` passes, and that lint, typecheck and build pass for `@repo/api`.
- [x] 4.3 Idempotent send (design decision 4): `appendMessage` inserts `client_id` with `ON CONFLICT DO NOTHING`. When it hits a conflict, it returns the existing message, and `sendMessage` releases the rate slot and skips the publish. Verify that lint, typecheck and build pass for `@repo/api`.
- [x] 4.4 In `services/notifications.ts`, `listNotifications` resolves `payload.partner.name` live from `partner.userId`, so a deleted account reads "Deleted account". Map a `blocked` cancel reason to `null` in `offer/view.ts` `toOfferView`, in the `offer/trades.ts` rows, and in `services/notifications.ts` payloads. In `routers/chat.ts` `setSettings`, publish only when `showActivity` changed, and throttle with a Redis `SET NX EX 10` key that refuses `settings_limit` with `retryAt`. Verify that lint, typecheck and build pass for `@repo/api`.

## 5. Thread client

- [x] 5.1 In `stores/chat-draft.ts`, add per-conversation `body` and `clientId`, read through selectors. In `thread/composer.tsx`:
  - read and write the draft;
  - move the restore into the send mutation's `mutationOptions.onError`;
  - set `networkMode: "always"` on send, with an offline message;
  - send `clientId` and keep it on restore;
  - focus the textarea after submit and after removing the card, using `preventDefault` on the Send button's pointerdown;
  - handle `no_address` with `offerLink`.

  Verify that lint, typecheck and build pass for `web`.
- [x] 5.2 In `thread-hooks.ts` `useMarkRead`, mark read only when the page is visible, focused and at the bottom, and re-run on focus and when the view reaches the bottom. In `thread.tsx`:
  - add the "New messages" control;
  - set `aria-busy` on the log while older messages load;
  - show the deleted-partner notice in place of the composer and Offer;
  - add the back link to the error and skeleton states.

  Verify that lint, typecheck and build pass for `web`.
- [x] 5.3 In `features/chat/queries.ts`:
  - `applyChatMessage` and `applyUnsent` call `fetchNewer` when the thread query exists without data;
  - `appendNewer` retries with backoff (1 s, doubling, capped at 30 s) and on the `online` event, and stops when nothing observes the thread.

  Add a pure test for the backoff schedule beside `thread-cache.test.ts`. Verify that `bun test` passes and that lint, typecheck and build pass for `web`.

## 6. Inbox, settings and copy

- [x] 6.1 In `conversation-menu.tsx`, label a declined request "Move to Requests". In `features/chat/actions.ts`:
  - Archive and Decline toast with Undo through `addActionToast`;
  - Accept toasts with no Undo.

  In `conversation-list.tsx`:
  - focus the next row after a row leaves;
  - the Inbox empty state shows the waiting-requests count with a link to Requests.

  Verify that lint, typecheck and build pass for `web`.
- [x] 6.2 In `conversation-search.tsx` and `conversation-list.tsx`, add a `role="status"` result announcement, keep the previous results while only `q` changes, and focus the input after clearing. In `features/account/sections/messages.tsx`, add the load-error state with Retry. Verify that lint, typecheck and build pass for `web`.
- [x] 6.3 Update strings in en, ko and ja:
  - `chat_empty_archived_hint`: comes back "when a new message arrives", with no destination;
  - `chat_request_hint`: what Decline does, and Block;
  - `chat_mute`: "Mute conversation";
  - ja: "Objekt" in `chat_search_label` and `chat_empty_search_hint`;
  - ko: 제안/거래 in `chat_settings_chat_as_desc`;
  - `chat_refused_start_limit`: "in the last 24 hours", not "today", since it now fires on Send.

  Add new strings in all three locales:
  - Move to Requests;
  - the archive, decline and accept toasts, and Undo;
  - the requests-waiting empty state;
  - New messages;
  - the offline send error;
  - the deleted-partner notice;
  - the search result count and no-match announcement;
  - `chat_refused_settings_limit`.

  Verify that `bun run --filter=web typecheck` passes, since it compiles Paraglide.

## 7. Verify

- [x] 7.1 Run `bun run check` and `bun run build --filter=web`; both pass.
- [x] 7.2 Browser check at 1280 px and 390 px against local data, or read-only against production. Do not click Message, Send, Accept, Decline or Archive on production without the user's approval. Record:
  - the request each control would send (`chat.send` carries `clientId`);
  - the thread's error state on a phone has a back control;
  - the settings error state;
  - the search announcement;
  - the "New messages" control while scrolled up;
  - focus after Send;
  - nothing scrolls sideways.
- [x] 7.3 Update `packages/api/AGENTS.md` with:
  - the rule that a conversation's first message or offer is its start (`openFirst`, advisory lock before row lock);
  - that the opening checks run there;
  - that `hydrateCards` takes the viewer.

  Update `apps/web/AGENTS.md` with the per-conversation draft store, or state that it needs no change. State that `packages/db/AGENTS.md` needs no change, since the migration only adds. Verify that each edit is one co-located paragraph.

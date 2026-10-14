## Context

See proposal.md for why. Current state:

- **Message.** `chat.start` (`services/chat/send.ts` `startConversation`) runs `prepareStart` and then `checkStart`. `checkStart` takes the sender's advisory lock, checks `startVerdict` and counts `recentStarts` over `conversation.created_by/created_at`. `ensureConversation` then inserts the conversation and two members, the recipient with `request = true`. Offers reach the same code through `offer/index.ts:132`.
- **Sending.** `chat.send` runs `findMembership`, then `chatSafety` (blocks, deleted partner, own chat mute), then `checkMessageRate` (Redis Lua). It then calls `appendMessage` (`members.ts`), which locks the conversation row, inserts, and applies `nextMemberState` to both members. The send path never reads `message_pref`, the start limit, or whether the sender has a linked address.
- **Empty conversations.** These are hidden from the recipient only in `selectConversationRows` and the counts. `loadThread`, `markRead`, `accept`, `decline`, `archive` and `mute` serve them to either member.
- **Cards.** `resolveCard` (`cards.ts`) checks only that the list exists and belongs to a member, that the collection exists, and that the objekt is in the collection. `hydrateCards` prices a card by matching `list_entries.objekt_id` and ignores `lists.hide_serial`.
- **Client.** The composer clears its local `body` on submit, and restores it through a per-call `onError`, which is lost when the thread unmounts. `chat-draft` stores only cards. The QueryClient uses query-core's default `networkMode: "online"`. `useMarkRead` checks only `document.hidden`.
- **Ordering.** `account-deletion-safety` is fully implemented but not yet archived. It changes "Blocks and chat mutes gate sending", and this change's delta builds on that text.

## Goals / Non-Goals

**Goals:**
- One code path decides when a conversation counts as started: the first message or offer.
- Every input an open tab sends still validates.
- Every migration is additive and safe while the code from `main` is still running.

**Non-Goals:**
- No new tables.
- No change to how the live connection transports events (`realtime`, Centrifugo).
- No change to the offer builder beyond the start checks it already shares.

## Decisions

### 1. A conversation has no effect until its first message; that message is the start

Message keeps creating the row, so `chat.start` still returns `{ id }` and a tab opened before the deploy works unchanged. What it means changes:

- **New columns.**
  - `conversation.started_by text` and `started_at timestamptz`: null until the first message or offer, then that message's sender and time.
  - `conversation_member.opened_at timestamptz`: set when that member activates Message (`ensureConversation`, both on create and on reopen).
  - An index on `conversation (started_by, started_at)`.
- **At click (`checkStart`).** It still refuses no-address, self, block, Nobody, ban and mute, so nobody types into a dead end. It passes `existing` as "the conversation holds a message", not "the row exists". So reopening an empty conversation runs the same checks as creating it. Its rate check now counts `started_by = me AND started_at > since`, so it only refuses a user who has already used up their starts. Clicking never counts.
- **At the first message.** `appendMessage` already locks the conversation row and reads `lastMessageId`. A new `openFirst(tx, ctx)` runs when that read is null.
  - The caller first takes the sender's start advisory lock. Both `sendMessage` and the offer path take it before `appendMessage` locks the row, so every path takes the advisory lock and then the row, never the reverse.
  - It runs `startVerdict` with the recipient's `fetchPref`, `chatSafety`, and the rate from `started_*`, with `existing: false`.
  - It then sets `started_by/started_at`.
  - `sendMessage` reads emptiness without a lock to decide whether to take the advisory lock. A conversation never goes from holding a message back to empty, so the only race is "empty when read, not empty under the row lock". There `appendMessage` skips `openFirst`, and the advisory lock was taken for nothing.
- **Requests.** `startMembers()` creates both members with `request = false`. The first message's `incoming` event gains `first: true`, and `nextMemberState` sets `request = !opensWithContent` for the recipient whoever opened the conversation. This fixes the reverse direction.
- **Visibility.** An empty conversation is visible to a member when `c.created_by = me OR m.opened_at IS NOT NULL`. `findMembership` and `updateMember` refuse `NOT_FOUND` otherwise, and `selectConversationRows` uses the same predicate in place of `c.created_by = ${me}`. Keeping `created_by` as one of the two signals means rows that old code creates between the migration and the deploy still show for their opener.
- **Backfill.** The migration sets `started_by`/`started_at` from each conversation's first message: `DISTINCT ON (conversation_id) … ORDER BY conversation_id, id`. Generate it with `db:generate`, then append the backfill `UPDATE` to the same file. This follows the expand-then-deploy rule in `packages/db/AGENTS.md`.

*Alternative considered:* create nothing on click, with a draft route `/messages/new?to=…` and the insert on first send. Rejected. Open tabs call `chat.start` and navigate to `/messages/$id`, so they would break. It also needs a second thread shell. The approach above gets the same observable behaviour.

### 2. Every send re-checks what can change after the click

- **Linked profile.** `sendMessage` refuses `no_address` when the sender has no linked address. The composer handles that refusal with the same `offerLink` toast that `useStartGate` uses.
- **Bans.** `chatSafety` adds `partner_banned`, an active `ban` sanction through `activeSanctionWhere`, and folds it into `blocked`, as a deleted partner is folded today. `messageable` gains the same check in `services/profile.ts` and `services/list.ts`. Market, Trade and For you already drop banned owners' lists.
- **Deleted partner.** `chatSafety` returns `partnerDeleted` separately as well. `loadThread` returns it, and `thread.tsx` renders a notice in place of the composer and Offer. `requestConversationCount` and the Requests box exclude deleted partners.
- **Mute end on a start.** `startVerdict` takes `muteUntil` and returns it as `retryAt` with `muted`, as `sendVerdict` does.
- **Seen and typing.** `activityBetween` (`settings.ts`) returns `toViewer = toPartner = false` when either side has blocked the other.

### 3. Cards are checked against the listing and the holder

`resolveCard` gains the following checks.

- **With a list.** A `list_entries` row of that list must exist for the collection. With an `objektId`, that row's `objekt_id` must be null (any copy) or equal to it.
- **With an `objektId`.** The indexer `objekts.owner` must be a linked address of the sender or the partner. This is one query joining `user_address` on both user ids.

Every card the web builds today passes:
- the own-collection picker sends an objekt the sender holds;
- the list picker and a Trade post send a collection their list has an entry for;
- the person sheet sends a collection alone;
- the Market drawer sends the sale entry's objekt, held by the seller unless it was sold.

Both refusals use the existing `invalid_card` code. A list target in `chat.start` whose list is gone becomes `invalid_card` instead of a bare `NOT_FOUND`, so the web can say why.

**Hidden serials.** `hydrateCards` takes the viewer id. For a list with `hide_serial` that the viewer does not own, the view's `objektId` and `serial` are null, and price matching ignores `objekt_id`, matching by collection only.

*Alternative considered:* check only at click. Rejected, because the spec's "Sold before sending" case happens between the click and the send.

### 4. Sends are idempotent by a client id

- **Input.** `sendInputSchema` gains `clientId: z.uuid().optional()`.
- **Column.** `message.client_id uuid` is nullable, with a unique index on `(sender_id, client_id) WHERE client_id IS NOT NULL`.
- **Insert.** `appendMessage` inserts with `ON CONFLICT DO NOTHING`. When no row returns, it reads the existing message by `(sender_id, client_id)` and returns it. Member updates and the live publish are skipped, and the caller releases the counted rate slot.
- **Composer.** The composer creates the id when it builds a message, and keeps it with the restored draft, so a retry after an unknown outcome reuses it.
- **Old tabs.** A tab with no `clientId` behaves as today.

### 5. Unsent text lives in a per-conversation draft

- **Store.** `stores/chat-draft.ts` gains `body` and `clientId` per conversation id. It stays in memory for the session, as cards do. The composer reads and writes it through selectors.
- **Restore on failure.** The send mutation's restore moves into `mutationOptions.onError`, which fires even after the thread unmounts, and writes into that conversation's draft. The composer's local error text stays per-call.
- **Offline.** The send mutation sets `networkMode: "always"`, so an offline send fails at once. The composer says "You're offline. Your message wasn't sent." when `navigator.onLine` is false.

*Alternative considered:* show a paused "Waiting for connection" state. Rejected, because a reload would still lose the text.

### 6. Reading and catching up

- **Mark read.** `useMarkRead` gets an `atBottom` flag from `ThreadView`, which already tracks it for auto-follow. It marks read only when the page is visible, focused and at the bottom. It re-runs on `focus`, on `visibilitychange`, and when `atBottom` turns true.
- **"New messages" control.** It shows while newer incoming messages sit below the viewport. Activating it scrolls to the bottom.
- **Messages during the first load.** `applyChatMessage` and `applyUnsent` call `fetchNewer` when the thread query exists without data. `appendNewer` already waits for the first load.
- **Catch-up retries.** `appendNewer` retries a failed fetch with backoff (1 s, doubling, up to 30 s). It also retries on the window's `online` event and stops when the thread unmounts.
- **Loading older messages.** The `role="log"` scroller sets `aria-busy` while an older page loads.

### 7. Server hardening

- **Scam scan.** `scanMessage` tests a normalised copy: `body.normalize("NFKC").replace(/\p{Cf}/gu, "")`. The stored body is unchanged.
- **Deleted account names.** `listNotifications` resolves `payload.partner.name` live from `partner.userId`, so a deleted account reads as "Deleted account" in notifications written before or during its deletion. This completes `account-deletion-safety`'s "wherever the account was named", which the cancel notes written by `anonymizeUser` miss today.
- **Block cancel reason.** `toOfferView`, the My trades rows and `listNotifications` map a `blocked` cancel reason to `null` for both parties. Storage keeps it for moderators.
- **Seen and typing setting.** `saveSettings` returns whether `showActivity` changed, and the router publishes only then. A change goes through a Redis `SET NX EX 10` key, and a refused change throws the new refusal `settings_limit` with `retryAt`.
- **Body.** `messageBodySchema` refuses NUL, and refuses a body that is empty once `\p{Cf}`, U+2800, U+3164, U+115F, U+1160, U+FFA0 and whitespace are removed. That refusal is the existing `empty` validation error.
- **Slugs.** Card slugs refuse NUL.
- **Cursor.** `conversationCursorSchema.at` is matched against Postgres's `timestamptz::text` shape. That is the shape the server itself returns, so an old tab's cursor still validates.

### 8. Web polish reuses what is there

- **Toasts with Undo.** Archive, Decline and Accept use `addActionToast` (`lib/action-toast.ts`). Undo calls `unarchive`, which returns a declined request to Requests, since `request` is kept.
- **Restore label.** The archived row's menu reads `request` from `ConversationRow`, which already carries it. A declined request gets "Move to Requests", and any other archived row keeps "Move to Inbox".
- **Focus after a row leaves.** `conversation-list.tsx` keeps row refs and focuses the next row after a row leaves its box.
- **Thread back control.** The thread's error and skeleton states reuse the back link from `ThreadNotFound`.
- **Search.** The search gets a `role="status"` region next to the field, and `placeholderData: keepPreviousData` when only `q` changes. Clearing focuses the input.
- **Settings.** The settings section reuses `common_error_loading_data` with Retry.

## Risks / Trade-offs

- **[Conversations started by old code between the migration and the deploy have null `started_*`]** → For at most one deploy window, those starts don't count toward the limit. This is accepted rather than adding a second backfill.
- **[The card holder check reads the indexer on every card send]** → It is one indexed lookup by objekt id. The indexer can lag a transfer by seconds, so a just-bought objekt may be refused briefly. The refusal says why, and the user can retry.
- **[Nobody re-checked at the first message refuses text a user already typed]** → The refusal is the existing `not_accepting` code, and the draft keeps the text.
- **[`networkMode: "always"` on send]** → It applies only to `chat.send`, and other mutations keep their behaviour.
- **[A deleted partner and a block become distinguishable in the thread]** → This is intended. The name already reads "Deleted account", so there is nothing to hide.

## Migration Plan

1. Generate the app migration: the three columns, the `message` unique index, and the `conversation (started_by, started_at)` index. Append the backfill. It is additive, so it is safe to run before the deploy while `main`'s code is live.
2. Deploy web, then the worker. The worker is untouched.
3. **Rollback:** redeploy the previous image. The new columns are ignored by old code, and nothing needs to be dropped.

## Open Questions

- Should a trade block also stop chat with that account? Today only offers are refused, and this change leaves it that way. It can be added later as one more line in `chatSafety`.

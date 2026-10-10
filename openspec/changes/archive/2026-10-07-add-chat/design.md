## Context

These phase 1 and phase 2 pieces already exist:
- the authenticated, push-only `/ws/me` socket (`packages/api/src/user-socket.ts`), with per-user Valkey channels `notify:<userId>` and the `publishNotify` helper;
- the client `useUserSocket` hook, which invalidates React Query keys on each nudge;
- `toPartnerIdentity` and `visibleNickname` in `lib/trade-rank.ts`;
- `hidden_trade_partner`.

Every account links Cosmo addresses through `user_address` (`user_id`, `nickname`, `hide_nickname`, `hide_user`). Lists carry `hide_user`. Market listings show the list's bound Cosmo profile, never the account.

Production runs one web instance. Postgres is the source of truth, and the socket only nudges.

## Goals / Non-Goals

**Goals:**
- Sending is one transaction plus one publish.
- A dropped socket loses nothing.
- Membership is checked on every chat read and write.
- The rules for who may start, request state and unread state live in one pure, tested module.

**Non-Goals:**
- Message search.
- Multi-instance fan-out beyond the existing Valkey channel.
- End-to-end encryption.
- Retention limits.

## Decisions

### D1. Data model
Four new tables.

**`conversation`**
- `id serial`;
- `user_low` and `user_high`: the two account ids, ordered;
- `created_by`, `created_at`;
- `last_message_id bigint`, `last_message_at`.

`UNIQUE (user_low, user_high)` with `CHECK (user_low < user_high)` makes "one per pair" a database fact. Starting a chat is an `INSERT … ON CONFLICT DO NOTHING` followed by a select.

**`conversation_member`**, primary key `(conversation_id, user_id)`:
- `request boolean`: true only for the recipient of a card-less start, until they reply or accept;
- `archived_at`;
- `muted_until` (`'infinity'` for always);
- `last_read_message_id bigint`;
- index on `(user_id)`.

**`message`**
- `id bigserial`;
- `conversation_id`, `sender_id`;
- `body text`;
- `card jsonb`: `{ collectionSlug, objektId?, listId? }`, validated by a zod schema shared with the client;
- `created_at`.

Constraints and index:
- `CHECK (body IS NOT NULL OR card IS NOT NULL)`;
- `CHECK (char_length(body) BETWEEN 1 AND 2000)`;
- index `(conversation_id, id DESC)`.

**`message_pref`**, primary key `user_id`:
- `allow text CHECK IN ('anyone','nobody')`;
- `allow_hidden boolean`.

No row means the defaults (`anyone`, `false`), as with `notification_pref`.

Every foreign key to `user` cascades. Deleting an account removes its conversations for both sides, the privacy-preserving choice.

*Alternatives:*
- A per-listing thread is rejected by decision Q8.
- Storing settings on the Better Auth `user` table would mean registering `additionalFields`, and the moderation change already adds plugin columns there. A side table keeps auth untouched.

### D2. Starting a conversation
`chat.start({ to, card? })` resolves the target from one of these:
- `{ kind: "list", slug, objektId? }`;
- `{ kind: "profile", address }`;
- `{ kind: "user", userId }`, for For you, where identity is already shown.

Checks run in order:
1. The sender has a linked address.
2. The target is a different account.
3. The target's `message_pref.allow` is not `nobody`.
4. A list with `hide_user`, or a profile whose `user_address.hide_user` is on, needs `allow_hidden`.
5. If no conversation exists yet, the rate limit (D5) allows a new one.

The checks live in `lib/chat-rules.ts` (`startVerdict`) and return a typed reason. The router maps the reason to an `ORPCError` code with `data.reason`.

A card-less start creates the recipient's member row with `request = true`. A start with a card adds the card as a message from the sender.

*Messageable flags:* each Message surface needs to know whether to show the button. So the outputs that render one gain `messageable: boolean`, computed in the same query with a `LEFT JOIN message_pref`:
- `trade.browse` posts;
- `trade.forYou` partners;
- `market.listings` rows;
- the profile read.

This is one join per query. Older clients ignore the field.

### D3. Sending, read state and requests
`chat.send({ conversationId, body?, card? })` runs one transaction:
1. Insert the message.
2. Set `conversation.last_message_*`.
3. For the sender: set `last_read_message_id` to the new id, clear `archived_at`, and clear `request` (replying accepts).
4. For the recipient: clear `archived_at`.

After commit it publishes `chat_changed` to both users. A message from a member who is no longer allowed (the moderation change adds blocks and mutes) is refused before the transaction.

`chat.accept` clears `request`. `chat.decline` sets `archived_at` and keeps `request`, so the sender sees nothing.

**Unread:**
- *A conversation is unread* when `last_message_id > coalesce(last_read_message_id, 0)` and the last message is from the other member.
- *The badge* counts unread member rows with `request = false`, `archived_at IS NULL` and `muted_until` null or past. It is one indexed query, and it stays uncached so it is always exact.

### D4. Realtime and gap-free reconnect
`userSocketMessageSchema` becomes a discriminated union:
- `notifications_changed` (unchanged);
- `chat_changed { conversationId }`.

Both go through the existing `notify:<userId>` channel.

`useUserSocket` dispatches by type:
- `chat_changed` invalidates the conversation list and the unread count, then appends to that thread (below);
- every socket open invalidates all chat keys.

**Thread reads:** `chat.thread({ id, before?, after? })` returns at most 50 messages. Older pages load with `before` through an infinite query. When a nudge arrives or the socket reopens, the client calls `after = <newest id it holds>` and appends the result to the cache. Ids are monotonic, so nothing is skipped or duplicated.

*Alternative:* send messages over the socket. Rejected: oRPC keeps validation, auth and rate limits in one place, and sending still works while the socket is down.

### D5. Rate limits
**New conversations** are counted in Postgres, not Valkey. The `start` transaction takes `pg_advisory_xact_lock` on the sender, then counts `conversation` rows with `created_by` = the sender from the last 24 h. So the check and the record are one atomic step, and parallel starts can't slip past it. The limit is 5 when `user.created_at` is less than 7 days ago, otherwise 20. Reopening an existing conversation doesn't count, and the check runs before the card is resolved.

**Messages** use a sliding 60 s window, limit 30: a sorted set `chat:msgs:<userId>`, pruned, counted and added to by one Lua script. A refused send is removed again, so it doesn't count.

Over a limit, the server throws `TOO_MANY_REQUESTS` with `data.retryAt`, which is when the oldest counted event leaves its window. The thresholds are constants in `schemas/chat.ts`, and the window decision is the pure `slidingWindow` in `chat-rules.ts`.

**Cards:** a card's `listSlug` is accepted only for one of these:
- a list the sender owns;
- a partner list that shows its owner;
- the start target itself.

Anything else, including an unknown slug, is refused with one `invalid_card` reason. Otherwise a card could reveal who owns a hidden list.

### D6. Pure module `packages/api/src/lib/chat-rules.ts`
This module, tested with `bun test`, holds:
- `startVerdict`;
- `isUnread`, and `countsTowardBadge` (mute and request aware);
- `nextMemberState`, for send, accept, decline, archive and incoming;
- `rateDecision`, from timestamps and account age;
- `pairKey`, for ordering the two ids.

The routers only do I/O.

### D7. Identity
A conversation row and the thread header name the other account by the nickname of a linked address only when that address has Hide User off. Otherwise they use the display name, so a conversation never ties a hidden address to the account. This is stricter than For you. The header shows the avatar too. A member who started from a hidden-owner list sees the account, as the opt-in setting warns.

### D8. Web
**Routes:**
- `routes/(container)/messages/route.tsx`: login guard, and a two-pane layout from `md` up (list beside an `Outlet`);
- `messages/index.tsx`: the list, plus an empty "Pick a conversation" pane on desktop;
- `messages/$id.tsx`: the thread.

The `box` search param picks the folder: `inbox`, which is the default, `requests` or `archived`. Below `md`, each route renders one pane only.

**Components** (`features/chat/*`):
- `conversation-list`;
- `thread`;
- `composer`: Enter sends, Shift+Enter adds a new line, and a character counter appears near the limit;
- `attach-objekt-dialog`: the user's own objekts through the existing owned query, plus collections from their lists;
- `objekt-card-message`, which reuses `ObjektCard`;
- `message-button`, shared by every entry point. It handles signed out (go to login), no linked address (offer `/link`), refusal reasons (toast) and success (navigate to the thread);
- `messages-icon` in the header, beside `NotificationBell`;
- the account-dialog `messages.tsx` section.

Phosphor icons. Strings go in Paraglide en, ja and ko.

## Risks / Trade-offs

- **[Risk] An unread-count query on every page load and nudge.** Mitigation: an index on `conversation_member(user_id)` plus the conversation primary key. It is tiny per user. Measure it in a task.
- **[Risk] The messageable join adds cost to hot reads (`browse`, `market.listings`).** Mitigation: it is a primary-key `LEFT JOIN`. The browse per-list cache is unaffected, because the flag is computed in stage 1.
- **[Trade-off] Account deletion removes the conversation for the other side too.** This is acceptable for privacy. Reports keep their own excerpt copies (moderation change).
- **[Risk] Spam through requests.** Mitigations: the start rate limit, the linked-address requirement, and the moderation change's block and report.
- **[Trade-off] No read receipts or typing indicators.** These are out of scope by decision; `last_read_message_id` makes adding them later cheap.

## Migration Plan

1. `db:generate` produces one migration with the four tables. It is applied to the local Docker database only.
2. Production gets it with the other unshipped migrations when the user decides to ship. Order: phase 1, phase 2, then this one, then the moderation migration.
3. Rollback: drop the four tables. Nothing else depends on them until moderation ships.

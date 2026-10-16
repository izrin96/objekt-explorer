# Design

## Context

- `MessagesIcon` (`apps/web/src/features/chat/messages-icon.tsx`) reads `chat.unreadCount`. `unreadConversationCount` (`packages/api/src/services/chat/inbox.ts`) counts only `visibleIn("inbox")`.
- `chat.requestCount` feeds the Requests tab (`box-tabs.tsx`) and the empty Inbox's pointer. `requestConversationCount` counts requests holding a message from the other member that was not unsent.
- Live updates: `buildChatMessages` (`services/chat/live.ts`) puts `unread` and `requests` on each member's `chat_message` event, and `applyChatMessage` writes them into the cache. `chat_changed` invalidates `chatListKeys`. `unreadCount` polls while the socket is down (`pollUnlessLive`).
- `message_pref` is the per-account chat settings row (one row per user, created on first write). Message ids come from one `bigserial`, so they rise across all conversations.

## Goals / Non-Goals

**Goals:** one cheap, exact check for "unseen requests" that the icon can read, that live events carry, and that the Requests tab can clear in one write.

**Non-Goals:** per-request seen state, changing `requestCount`'s shape, a seen event pushed to the user's other tabs.

## Decisions

**Marker: `message_pref.requests_seen_message_id` (nullable bigint).**
Unseen requests exist when some conversation in `visibleIn("requests", me)` holds a message from the other member, not unsent, with `id > coalesce(requests_seen_message_id, 0)`. That is the `requestConversationCount` query with one more condition, and an `EXISTS` that can stop at the first match.
- Why `message_pref`: it already holds per-account chat state and is keyed by user, so no new table is needed. Its `chat.settings` reader is not affected, because `fetchPref` selects named columns.
- Why a message id and not a timestamp: it matches `last_read_message_id`, and it cannot be fooled by clock skew between the insert and the mark.
- Alternative rejected: count a request as "unseen" while its own `last_read_message_id` is behind. That needs no migration, but a request the user never opens would keep the dot on until they decline it. The user asked for the dot to clear when they open the tab.
- Alternative rejected: a timestamp on `user`. That table is Better Auth's, and chat state does not belong there.

**Shared condition.** Both queries use `lastIncoming(me)`, the "newest incoming, not unsent" helper that unread already uses, so the rule for which messages count lives in one place. The service function is `hasUnseenRequests`, served as `chat.requestsUnseen`.

**Marking seen: `chat.seeRequests` mutation.**
The mutation upserts `message_pref` and sets the marker to the highest qualifying incoming request message id. It is computed in SQL at write time, so a request that arrives between the read and the write is not swallowed. It never moves the marker backwards (`greatest`). It returns nothing, and the caller sets the cached `requestsUnseen` to false.
- Called from the conversation list when `box === "requests"` and the cached `requestsUnseen` is true. That covers opening the tab, and a request that arrives while the tab is open, which flips the flag to true live.
- No realtime publish to the user's other tabs. They catch up on focus (`refetchOnWindowFocus`) or on the next chat event. A dot left on an unfocused tab is harmless.

**Query: new `chat.requestsUnseen` (boolean), not a reshaped `requestCount`.**
A new procedure keeps `requestCount`'s callers and the `requests` field on the event unchanged. `requestsUnseenOptions(live)` copies `chatUnreadOptions`: `staleTime: 0`, refetch on focus, poll while the socket is down. Its key joins `chatListKeys`, so `chat_changed` refreshes it.

**Live: `requestsUnseen: boolean` on `chat_message`.**
`buildChatMessages` computes it beside `unread` and `requests`, and `applyChatMessage` writes it to the cache. Old clients ignore the extra field, and Zod object parsing strips unknown keys.

**Icon.** `UnreadDot` gets `unread + Number(unseen)`, so the dot logic stays in one component. The label has four cases: plain, `chat_icon_label_unread({ count })`, `chat_icon_label_requests`, and `chat_icon_label_unread_requests({ count })` when both are set, so the label names requests whenever they set the dot.

**Hooks.** `useRequestsUnseen` and `useSeeRequests(open)` live in `features/chat/actions.ts`. The conversation list passes `box === "requests" && !q`, so a search does not mark requests that it filtered out. On success, `seeRequests` sets the cache to false and then invalidates it, so a request that arrived while the mark was in flight comes back from the server and is marked again.

## Risks / Trade-offs

- [The web app ships before the migration runs, so every icon read throws] → Apply the migration to staging and prod before deploying. The memory notes record the same order for buying-only.
- [An extra query on every page with a session] → It is a single indexed `EXISTS` over the user's own member rows (`conversation_member_user_id_idx`). It polls only while the socket is down.
- [Two tabs on Requests both call `seeRequests`] → The write is idempotent and only ever moves the marker forward.

## Migration Plan

`bun run --filter=@repo/db db:generate` creates a new migration that adds the nullable column. Apply it to local first, then staging and prod, each with approval. To roll back, ship the previous web build. The column can stay, since nothing else reads it.
